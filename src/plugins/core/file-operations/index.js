import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import Papa from 'papaparse';
import './styles.css';

const fileOperationsPlugin = {
  name: 'ファイル操作',
  version: '1.0.0',
  author: 'Your Name',
  
  initialize(registry) {
    console.log('File operations plugin initialized');
    this.registry = registry;
    
    // CSVインポートモーダルのルート要素
    this.csvImportModalRoot = null;
    
    // イベントリスナーのセットアップ
    this.setupEventListeners();
  },
  
  cleanup() {
    // イベントリスナーのクリーンアップ
    this.removeEventListeners();
    
    // モーダルのクリーンアップ
    this.removeCSVImportModal();
  },
  
  setupEventListeners() {
    // ファイル開くイベント
    this.handleOpenFile = () => {
      console.log('Open file dialog requested');
      this.showFileOpenDialog();
    };
    
    // 名前を付けて保存イベント
    this.handleSaveAsFile = () => {
      console.log('Save as dialog requested');
      this.showSaveAsDialog();
    };
    
    // CSVインポートイベント
    this.handleImportCSV = () => {
      console.log('CSV import dialog requested');
      this.showCSVImportModal();
    };
    
    // CSVエクスポートイベント
    this.handleExportCSV = () => {
      console.log('CSV export requested');
      this.exportToCSV();
    };
    
    // 保存イベント
    this.handleSaveFile = (e) => {
      const { filename } = e.detail || {};
      this.saveCurrentSpreadsheet(filename);
    };
    
    // 読み込みイベント
    this.handleLoadFile = (e) => {
      const { filename, data } = e.detail || {};
      this.loadSpreadsheetData(filename, data);
    };
    
    // イベントリスナーを登録
    document.addEventListener('file-open', this.handleOpenFile);
    document.addEventListener('file-save-as', this.handleSaveAsFile);
    document.addEventListener('file-import-csv', this.handleImportCSV);
    document.addEventListener('file-export-csv', this.handleExportCSV);
    document.addEventListener('spreadsheet-save-data', this.handleSaveFile);
    document.addEventListener('spreadsheet-load-data', this.handleLoadFile);
  },
  
  removeEventListeners() {
    // イベントリスナーを削除
    document.removeEventListener('file-open', this.handleOpenFile);
    document.removeEventListener('file-save-as', this.handleSaveAsFile);
    document.removeEventListener('file-import-csv', this.handleImportCSV);
    document.removeEventListener('file-export-csv', this.handleExportCSV);
    document.removeEventListener('spreadsheet-save-data', this.handleSaveFile);
    document.removeEventListener('spreadsheet-load-data', this.handleLoadFile);
  },
  
  hooks: {
    // メニュークリックハンドラ
    'menu:click': (menuId) => {
      console.log('File operations plugin handling menu click:', menuId);
      switch (menuId) {
        case 'open':
          document.dispatchEvent(new CustomEvent('file-open'));
          return true;
        case 'saveAs':
          document.dispatchEvent(new CustomEvent('file-save-as'));
          return true;
        case 'save':
          this.saveCurrentSpreadsheet();
          return true;
        case 'importCSV':
          document.dispatchEvent(new CustomEvent('file-import-csv'));
          return true;
        case 'exportCSV':
          document.dispatchEvent(new CustomEvent('file-export-csv'));
          return true;
        default:
          return false;
      }
    },
    
    // ツールバークリックハンドラ
    'toolbar:click': (toolbarId) => {
      if (toolbarId === 'save') {
        this.saveCurrentSpreadsheet();
        return true;
      }
      return false;
    },
    
    // CSVエクスポート処理
    'exportCSV': (hotInstance) => {
      this.exportToCSV(hotInstance);
      return true;
    }
  },
  
  // ファイルを開くダイアログを表示
  showFileOpenDialog() {
    // 保存されたファイルのリストを取得
    const savedFiles = this.getSavedFilesList();
    
    // ダイアログのルート要素を作成
    const dialogRoot = document.createElement('div');
    dialogRoot.className = 'file-dialog-overlay';
    
    dialogRoot.innerHTML = `
      <div class="file-dialog">
        <div class="file-dialog-header">
          <h2>ファイルを開く</h2>
          <button class="file-dialog-close">×</button>
        </div>
        <div class="file-dialog-content">
          ${savedFiles.length === 0 
            ? '<p>保存されたファイルがありません</p>' 
            : `
              <div class="file-list">
                ${savedFiles.map(file => `
                  <div class="file-item" data-filename="${file}">${file}</div>
                `).join('')}
              </div>
            `
          }
        </div>
        <div class="file-dialog-footer">
          <button class="file-dialog-cancel">キャンセル</button>
          <button class="file-dialog-open" ${savedFiles.length === 0 ? 'disabled' : ''}>開く</button>
        </div>
      </div>
    `;
    
    // クローズボタンのクリックイベント
    const closeBtn = dialogRoot.querySelector('.file-dialog-close');
    closeBtn.addEventListener('click', () => this.removeDialog(dialogRoot));
    
    // キャンセルボタンのクリックイベント
    const cancelBtn = dialogRoot.querySelector('.file-dialog-cancel');
    cancelBtn.addEventListener('click', () => this.removeDialog(dialogRoot));
    
    // 背景クリックでダイアログを閉じる
    dialogRoot.addEventListener('click', (e) => {
      if (e.target === dialogRoot) this.removeDialog(dialogRoot);
    });
    
    // ファイルリストアイテムのクリックイベント
    let selectedFile = null;
    const fileItems = dialogRoot.querySelectorAll('.file-item');
    fileItems.forEach(item => {
      item.addEventListener('click', () => {
        fileItems.forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        selectedFile = item.getAttribute('data-filename');
      });
      
      // ダブルクリックで開く
      item.addEventListener('dblclick', () => {
        const filename = item.getAttribute('data-filename');
        this.loadSpreadsheetData(filename);
        this.removeDialog(dialogRoot);
      });
    });
    
    // 開くボタンのクリックイベント
    const openBtn = dialogRoot.querySelector('.file-dialog-open');
    openBtn.addEventListener('click', () => {
      if (selectedFile) {
        this.loadSpreadsheetData(selectedFile);
        this.removeDialog(dialogRoot);
      } else {
        alert('ファイルを選択してください');
      }
    });
    
    // DOMに追加
    document.body.appendChild(dialogRoot);
  },
  
  // 名前を付けて保存ダイアログを表示
  showSaveAsDialog() {
    // ダイアログのルート要素を作成
    const dialogRoot = document.createElement('div');
    dialogRoot.className = 'file-dialog-overlay';
    
    dialogRoot.innerHTML = `
      <div class="file-dialog">
        <div class="file-dialog-header">
          <h2>名前を付けて保存</h2>
          <button class="file-dialog-close">×</button>
        </div>
        <div class="file-dialog-content">
          <div class="file-form-group">
            <label for="filename">ファイル名:</label>
            <input type="text" id="filename" class="file-input" placeholder="ファイル名を入力">
          </div>
        </div>
        <div class="file-dialog-footer">
          <button class="file-dialog-cancel">キャンセル</button>
          <button class="file-dialog-save">保存</button>
        </div>
      </div>
    `;
    
    // クローズボタンのクリックイベント
    const closeBtn = dialogRoot.querySelector('.file-dialog-close');
    closeBtn.addEventListener('click', () => this.removeDialog(dialogRoot));
    
    // キャンセルボタンのクリックイベント
    const cancelBtn = dialogRoot.querySelector('.file-dialog-cancel');
    cancelBtn.addEventListener('click', () => this.removeDialog(dialogRoot));
    
    // 背景クリックでダイアログを閉じる
    dialogRoot.addEventListener('click', (e) => {
      if (e.target === dialogRoot) this.removeDialog(dialogRoot);
    });
    
    // 保存ボタンのクリックイベント
    const saveBtn = dialogRoot.querySelector('.file-dialog-save');
    const filenameInput = dialogRoot.querySelector('#filename');
    
    saveBtn.addEventListener('click', () => {
      const filename = filenameInput.value.trim();
      if (!filename) {
        alert('ファイル名を入力してください');
        return;
      }
      
      this.saveCurrentSpreadsheet(filename);
      this.removeDialog(dialogRoot);
    });
    
    // Enterキーで保存
    filenameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const filename = filenameInput.value.trim();
        if (filename) {
          this.saveCurrentSpreadsheet(filename);
          this.removeDialog(dialogRoot);
        }
      }
    });
    
    // DOMに追加
    document.body.appendChild(dialogRoot);
    
    // 入力欄にフォーカス
    setTimeout(() => filenameInput.focus(), 100);
  },
  
  // CSVインポートモーダルを表示
  showCSVImportModal() {
    // 既存のモーダルを削除
    this.removeCSVImportModal();
    
    // モーダル用のコンテナを作成
    const modalContainer = document.createElement('div');
    modalContainer.id = 'csv-import-modal-container';
    document.body.appendChild(modalContainer);
    
    // React要素をレンダリング
    import('../../../components/modals/CSVImportModal')
      .then(({ default: CSVImportModal }) => {
        this.csvImportModalRoot = createRoot(modalContainer);
        this.csvImportModalRoot.render(
          <Suspense fallback={<div>Loading...</div>}>
            <CSVImportModal
              onClose={() => this.removeCSVImportModal()}
              onImport={(data) => this.importCSVData(data)}
            />
          </Suspense>
        );
      })
      .catch(error => {
        console.error('CSV Import Modal loading error:', error);
        this.showStatusMessage('CSVインポートモーダルの読み込みに失敗しました', true);
        this.removeCSVImportModal();
      });
  },
  
  // CSVインポートモーダルを削除
  removeCSVImportModal() {
    if (this.csvImportModalRoot) {
      this.csvImportModalRoot.unmount();
      this.csvImportModalRoot = null;
      
      const container = document.getElementById('csv-import-modal-container');
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
    }
  },
  
  // ダイアログを削除
  removeDialog(dialogRoot) {
    if (dialogRoot && dialogRoot.parentNode) {
      dialogRoot.parentNode.removeChild(dialogRoot);
    }
  },
  
  // CSVデータをインポート
  importCSVData(data) {
    if (!data || !Array.isArray(data) || data.length === 0) {
      this.showStatusMessage('インポートするデータがありません', true);
      return;
    }
    
    console.log('CSVデータをインポート:', data);
    
    // Handsontableインスタンスを取得する複数の方法を試す
    let hotInstance = null;
    
    // 1. registryから直接取得
    if (this.registry && this.registry.hotInstance) {
      hotInstance = this.registry.hotInstance;
    } 
    // 2. グローバル変数から取得（デバッグ用）
    else if (window.__hotInstance) {
      hotInstance = window.__hotInstance;
    }
    // 3. DOMから探索
    else {
      const handsontableEl = document.querySelector('.handsontable');
      if (handsontableEl && handsontableEl.hotInstance) {
        hotInstance = handsontableEl.hotInstance;
      }
    }
    
    if (hotInstance) {
      try {
        // データをロード
        hotInstance.loadData(data);
        
        // カスタムイベントを発行
        document.dispatchEvent(new CustomEvent('spreadsheet-import-csv', { 
          detail: { data } 
        }));
        
        this.showStatusMessage('CSVデータをインポートしました');
      } catch (error) {
        console.error('CSVデータ適用エラー:', error);
        this.showStatusMessage('CSVデータの適用に失敗しました', true);
      }
    } else {
      console.error('Handsontableインスタンスが見つかりません');
      
      // フォールバック：カスタムイベントだけ発行
      document.dispatchEvent(new CustomEvent('spreadsheet-import-csv', { 
        detail: { data } 
      }));
      
      this.showStatusMessage('エディタの初期化が完了していません。イベントのみ発行しました', true);
    }
  },
  
  // CSVをエクスポート
  exportToCSV(hotInstance) {
    // hotInstanceが渡されていない場合は取得を試みる
    if (!hotInstance) {
      // 1. registryから直接取得
      if (this.registry && this.registry.hotInstance) {
        hotInstance = this.registry.hotInstance;
      } 
      // 2. グローバル変数から取得（デバッグ用）
      else if (window.__hotInstance) {
        hotInstance = window.__hotInstance;
      }
      // 3. DOMから探索
      else {
        const handsontableEl = document.querySelector('.handsontable');
        if (handsontableEl && handsontableEl.hotInstance) {
          hotInstance = handsontableEl.hotInstance;
        }
      }
    }
    
    if (!hotInstance) {
      this.showStatusMessage('エクスポートするデータがありません', true);
      return;
    }
    
    try {
      // データを取得
      const data = hotInstance.getData();
      
      // CSVに変換
      const csvContent = Papa.unparse(data, {
        delimiter: ",",
        header: false
      });
      
      // ファイル名を決定
      const filename = this.getCurrentFilename() || 'spreadsheet';
      const csvFilename = `${filename}.csv`;
      
      // ダウンロード
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      link.setAttribute('href', url);
      link.setAttribute('download', csvFilename);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // URLオブジェクトを解放
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);
      
      this.showStatusMessage(`CSVファイル "${csvFilename}" をエクスポートしました`);
    } catch (error) {
      console.error('CSVエクスポートエラー:', error);
      this.showStatusMessage('CSVのエクスポート中にエラーが発生しました', true);
    }
  },
  
  // 現在のスプレッドシートを保存
  saveCurrentSpreadsheet(filename) {
    // Handsontableインスタンスを取得
    let hotInstance = null;
    
    // 1. registryから直接取得
    if (this.registry && this.registry.hotInstance) {
      hotInstance = this.registry.hotInstance;
    } 
    // 2. グローバル変数から取得（デバッグ用）
    else if (window.__hotInstance) {
      hotInstance = window.__hotInstance;
    }
    
    if (!hotInstance) {
      this.showStatusMessage('保存するデータがありません', true);
      return;
    }
    
    try {
      // 現在のデータを取得
      const data = hotInstance.getData();
      
      // 現在のファイル名を取得（指定がない場合）
      if (!filename) {
        const currentFilename = this.getCurrentFilename();
        if (currentFilename && currentFilename !== '新しいスプレッドシート') {
          filename = currentFilename;
        } else {
          // 名前がない場合は名前を付けて保存ダイアログを表示
          document.dispatchEvent(new CustomEvent('file-save-as'));
          return;
        }
      }
      
      // 保存データを準備
      const saveData = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        filename: filename,
        sheets: this.getSheetList() || ['Sheet1'],
        currentSheet: this.getCurrentSheet() || 'Sheet1',
        data: {},
        formatData: this.getFormatData() || {},
        charts: this.getChartData() || [],
        comments: this.getCommentData() || {},
        validations: this.getValidationData() || {}
      };
      
      // 各シートのデータを保存
      saveData.data[saveData.currentSheet] = data;
      
      // LocalStorageに保存
      localStorage.setItem(`spreadsheet_${filename}`, JSON.stringify(saveData));
      
      // ファイルリストを更新
      this.updateFileList(filename);
      
      // カスタムイベントを発行
      document.dispatchEvent(new CustomEvent('spreadsheet-save-complete', {
        detail: { filename, success: true }
      }));
      
      this.showStatusMessage(`ファイル "${filename}" を保存しました`);
    } catch (error) {
      console.error('スプレッドシート保存エラー:', error);
      this.showStatusMessage('保存中にエラーが発生しました', true);
      
      // 失敗イベントを発行
      document.dispatchEvent(new CustomEvent('spreadsheet-save-complete', {
        detail: { filename, success: false, error: error.message }
      }));
    }
  },
  
  // 保存されたファイルを読み込む
  loadSpreadsheetData(filename, data) {
    if (!filename && !data) {
      this.showStatusMessage('読み込むファイルが指定されていません', true);
      return;
    }
    
    try {
      let loadData;
      
      // データが直接渡された場合はそれを使用
      if (data) {
        loadData = data;
      } 
      // ファイル名が指定された場合はローカルストレージから読み込み
      else {
        const savedData = localStorage.getItem(`spreadsheet_${filename}`);
        if (!savedData) {
          this.showStatusMessage(`ファイル "${filename}" が見つかりません`, true);
          return;
        }
        
        loadData = JSON.parse(savedData);
      }
      
      // バージョンチェック
      if (!loadData.version) {
        console.warn('古いバージョンのファイル形式です');
      }
      
      // Handsontableインスタンスを取得
      let hotInstance = null;
      
      // 1. registryから直接取得
      if (this.registry && this.registry.hotInstance) {
        hotInstance = this.registry.hotInstance;
      } 
      // 2. グローバル変数から取得（デバッグ用）
      else if (window.__hotInstance) {
        hotInstance = window.__hotInstance;
      }
      
      if (hotInstance) {
        // 現在のシートデータを読み込み
        const currentSheet = loadData.currentSheet || 'Sheet1';
        const sheetData = loadData.data[currentSheet] || [];
        
        // データをロード
        hotInstance.loadData(sheetData);
      }
      
      // カスタムイベントを発行して他のコンポーネントにも通知
      document.dispatchEvent(new CustomEvent('spreadsheet-load-complete', {
        detail: { 
          filename, 
          data: loadData,
          success: true 
        }
      }));
      
      this.showStatusMessage(`ファイル "${filename || '外部データ'}" を読み込みました`);
    } catch (error) {
      console.error('ファイル読み込みエラー:', error);
      this.showStatusMessage('ファイルの読み込み中にエラーが発生しました', true);
      
      // 失敗イベントを発行
      document.dispatchEvent(new CustomEvent('spreadsheet-load-complete', {
        detail: { filename, success: false, error: error.message }
      }));
    }
  },
  
  // ステータスメッセージを表示
  showStatusMessage(message, isError = false) {
    if (isError) {
      console.error(message);
      alert(message);
      return;
    }
    
    console.log(message);
    
    // スプレッドシートエディタがあれば、そのステータスバーを更新
    const editor = document.querySelector('.spreadsheet-editor');
    if (editor) {
      const statusBar = editor.querySelector('.status-message');
      if (statusBar) {
        const originalText = statusBar.textContent;
        statusBar.textContent = message;
        
        // 3秒後に元のメッセージに戻す
        setTimeout(() => {
          statusBar.textContent = originalText;
        }, 3000);
      }
    }
    
    // カスタムイベントを発行
    document.dispatchEvent(new CustomEvent('spreadsheet-status-update', {
      detail: { message, isError }
    }));
  },
  
  // 保存されたファイルのリストを取得
  getSavedFilesList() {
    try {
      const savedFiles = localStorage.getItem('spreadsheet_files');
      return savedFiles ? JSON.parse(savedFiles) : [];
    } catch (error) {
      console.error('ファイルリスト取得エラー:', error);
      return [];
    }
  },
  
  // ファイルリストを更新
  updateFileList(filename) {
    if (!filename) return;
    
    try {
      let files = this.getSavedFilesList();
      
      // ファイル名が存在しない場合のみ追加
      if (!files.includes(filename)) {
        files.push(filename);
        localStorage.setItem('spreadsheet_files', JSON.stringify(files));
      }
    } catch (error) {
      console.error('ファイルリスト更新エラー:', error);
    }
  },
  
  // ローカルストレージからファイルを削除
  deleteFile(filename) {
    if (!filename) return false;
    
    try {
      // ファイルを削除
      localStorage.removeItem(`spreadsheet_${filename}`);
      
      // ファイルリストを更新
      let files = this.getSavedFilesList();
      files = files.filter(file => file !== filename);
      localStorage.setItem('spreadsheet_files', JSON.stringify(files));
      
      this.showStatusMessage(`ファイル "${filename}" を削除しました`);
      return true;
    } catch (error) {
      console.error('ファイル削除エラー:', error);
      this.showStatusMessage('ファイルの削除に失敗しました', true);
      return false;
    }
  },
  
  // 現在のファイル名を取得
  getCurrentFilename() {
    // スプレッドシートエディタのヘッダーからファイル名を取得
    const fileInfo = document.querySelector('.spreadsheet-editor .file-info');
    return fileInfo ? fileInfo.textContent.replace(/\s*\*\s*$/, '').trim() : '新しいスプレッドシート';
  },
  
  // 現在のシート名を取得
  getCurrentSheet() {
    // アクティブなシートタブからシート名を取得
    const activeTab = document.querySelector('.sheet-tabs .sheet-tab.active .sheet-tab-text');
    return activeTab ? activeTab.textContent : 'Sheet1';
  },
  
  // シートリストを取得
  getSheetList() {
    // シートタブからシート名のリストを取得
    const sheetTabs = document.querySelectorAll('.sheet-tabs .sheet-tab:not(.add-sheet) .sheet-tab-text');
    return Array.from(sheetTabs).map(tab => tab.textContent);
  },
  
  // フォーマットデータを取得
  getFormatData() {
    // 書式設定プラグインがあれば、そのデータを取得
    if (this.registry && this.registry.plugins && this.registry.plugins['formatting']) {
      const formatPlugin = this.registry.plugins['formatting'];
      return formatPlugin.cellStyles || {};
    }
    return {};
  },
  
  // チャートデータを取得
  getChartData() {
    // チャートプラグインがあれば、そのデータを取得
    if (this.registry && this.registry.plugins && this.registry.plugins['chart']) {
      const chartPlugin = this.registry.plugins['chart'];
      return chartPlugin.charts || [];
    }
    return [];
  },
  
  // コメントデータを取得
  getCommentData() {
    // コメントプラグインがあれば、そのデータを取得
    if (this.registry && this.registry.plugins && this.registry.plugins['comments']) {
      const commentPlugin = this.registry.plugins['comments'];
      return commentPlugin.comments || {};
    }
    return {};
  },
  
  // データ検証を取得
  getValidationData() {
    // データ検証プラグインがあれば、そのデータを取得
    if (this.registry && this.registry.plugins && this.registry.plugins['data-validation']) {
      const validationPlugin = this.registry.plugins['data-validation'];
      return validationPlugin.validations || [];
    }
    return [];
  }
};

export default fileOperationsPlugin;