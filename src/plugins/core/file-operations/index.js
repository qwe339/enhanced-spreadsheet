// src/plugins/core/file-operations/index.js
import FileOperationsDialog from './FileOperationsDialog';
import Papa from 'papaparse';
import './styles.css';

const fileOperationsPlugin = {
  name: 'ファイル操作',
  version: '1.0.0',
  author: 'Your Name',
  
  initialize(registry) {
    console.log('File Operations plugin initialized');
    this.registry = registry;
    this.dialog = new FileOperationsDialog(this);
    this.currentFilename = null;
    this.isModified = false;
    
    // イベントリスナーのセットアップ
    this.setupEventListeners();
  },
  
  cleanup() {
    console.log('File Operations plugin cleanup');
    this.removeEventListeners();
  },
  
  setupEventListeners() {
    // ファイル操作関連のイベント
    this.handleOpenFile = () => {
      this.dialog.showOpenDialog();
    };
    
    this.handleSaveFile = () => {
      if (this.currentFilename) {
        this.saveToLocalStorage(this.currentFilename);
      } else {
        this.dialog.showSaveAsDialog();
      }
    };
    
    this.handleSaveFileAs = () => {
      this.dialog.showSaveAsDialog();
    };
    
    this.handleImportCSV = () => {
      this.dialog.showImportCSVDialog();
    };
    
    this.handleExportCSV = () => {
      this.exportCSV();
    };
    
    // CSVインポートイベント
    this.handleImportCSVData = (e) => {
      if (e.detail && e.detail.data) {
        this.importCSVData(e.detail.data);
      }
    };
    
    // イベントリスナーを登録
    document.addEventListener('file-open', this.handleOpenFile);
    document.addEventListener('file-save', this.handleSaveFile);
    document.addEventListener('file-save-as', this.handleSaveFileAs);
    document.addEventListener('file-import-csv', this.handleImportCSV);
    document.addEventListener('file-export-csv', this.handleExportCSV);
    document.addEventListener('spreadsheet-import-csv', this.handleImportCSVData);
  },
  
  removeEventListeners() {
    document.removeEventListener('file-open', this.handleOpenFile);
    document.removeEventListener('file-save', this.handleSaveFile);
    document.removeEventListener('file-save-as', this.handleSaveFileAs);
    document.removeEventListener('file-import-csv', this.handleImportCSV);
    document.removeEventListener('file-export-csv', this.handleExportCSV);
    document.removeEventListener('spreadsheet-import-csv', this.handleImportCSVData);
  },
  
  hooks: {
    // メニュー拡張
    'menu:extend': (menuConfig) => {
      // ファイルメニューを探す
      const fileMenuIndex = menuConfig.items.findIndex(item => item.id === 'file');
      
      const fileMenuItems = [
        { id: 'new', label: '新規作成', action: () => document.dispatchEvent(new CustomEvent('file-new')) },
        { id: 'open', label: '開く...', action: () => document.dispatchEvent(new CustomEvent('file-open')) },
        { id: 'save', label: '保存', action: () => document.dispatchEvent(new CustomEvent('file-save')) },
        { id: 'saveAs', label: '名前を付けて保存...', action: () => document.dispatchEvent(new CustomEvent('file-save-as')) },
        { type: 'separator' },
        { id: 'importCSV', label: 'CSVインポート...', action: () => document.dispatchEvent(new CustomEvent('file-import-csv')) },
        { id: 'exportCSV', label: 'CSVエクスポート', action: () => document.dispatchEvent(new CustomEvent('file-export-csv')) },
      ];
      
      if (fileMenuIndex >= 0) {
        // 既存のファイルメニューを拡張
        menuConfig.items[fileMenuIndex].submenu = fileMenuItems;
      } else {
        // 新しくファイルメニューを追加
        menuConfig.items.unshift({
          id: 'file',
          label: 'ファイル',
          submenu: fileMenuItems
        });
      }
      
      return menuConfig;
    },
    
    // ツールバー拡張
    'toolbar:extend': (toolbarConfig) => {
      // ファイル操作関連のツールバーボタンを追加
      const fileButtons = [
        { id: 'new', tooltip: '新規作成', icon: '📄', action: () => document.dispatchEvent(new CustomEvent('file-new')) },
        { id: 'open', tooltip: '開く', icon: '📂', action: () => document.dispatchEvent(new CustomEvent('file-open')) },
        { id: 'save', tooltip: '保存', icon: '💾', action: () => document.dispatchEvent(new CustomEvent('file-save')) },
      ];
      
      // 先頭にファイルボタンを追加
      toolbarConfig.items = [...fileButtons, ...toolbarConfig.items];
      
      return toolbarConfig;
    },
    
    // メニュークリックイベント
    'menu:click': (menuId) => {
      switch (menuId) {
        case 'new':
          document.dispatchEvent(new CustomEvent('file-new'));
          return true;
        case 'open':
          document.dispatchEvent(new CustomEvent('file-open'));
          return true;
        case 'save':
          document.dispatchEvent(new CustomEvent('file-save'));
          return true;
        case 'saveAs':
          document.dispatchEvent(new CustomEvent('file-save-as'));
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
    }
  },
  
  // Handsontableインスタンスを取得
  getHotInstance() {
    // 登録済みインスタンスの取得を試行
    if (this.registry && this.registry.hotInstance) {
      return this.registry.hotInstance;
    }
    
    // グローバル変数から取得を試行
    if (window.__hotInstance) {
      return window.__hotInstance;
    }
    
    // DOM探索による取得を試行
    const hotContainer = document.querySelector('.spreadsheet-grid-container');
    if (hotContainer) {
      const handsontableEl = hotContainer.querySelector('.handsontable');
      if (handsontableEl && handsontableEl.hotInstance) {
        return handsontableEl.hotInstance;
      }
    }
    
    return null;
  },
  
  // CSVデータをインポート
  importCSVData(data) {
    if (!data || !Array.isArray(data) || data.length === 0) {
      this.showStatusMessage('インポートするデータがありません', true);
      return;
    }
    
    const hotInstance = this.getHotInstance();
    if (!hotInstance) {
      this.showStatusMessage('スプレッドシートが初期化されていません', true);
      return;
    }
    
    // データの前処理
    const processedData = data.map(row => {
      if (!Array.isArray(row)) {
        // 配列でない行があれば変換
        return Object.values(row);
      }
      return row;
    });
    
    try {
      // データをロード
      hotInstance.loadData(processedData);
      
      // カスタムイベント発行
      document.dispatchEvent(new CustomEvent('spreadsheet-data-updated', { 
        detail: { 
          data: processedData,
          sheetId: 'Sheet1',
          isModified: true 
        } 
      }));
      
      this.isModified = true;
      this.showStatusMessage('CSVデータをインポートしました');
    } catch (error) {
      console.error('CSVデータ適用エラー:', error);
      this.showStatusMessage('CSVデータの適用に失敗しました', true);
    }
  },
  
  // CSVデータをエクスポート
  exportCSV() {
    const hotInstance = this.getHotInstance();
    if (!hotInstance) {
      this.showStatusMessage('エクスポートするデータがありません', true);
      return;
    }
    
    try {
      // データを取得
      const data = hotInstance.getData();
      
      // CSVに変換
      const csv = Papa.unparse(data, {
        delimiter: ',',
        header: false,
        quoteChar: '"',
        escapeChar: '"'
      });
      
      // ファイル名設定
      const filename = `${this.currentFilename || 'spreadsheet'}_${new Date().toISOString().slice(0, 10)}.csv`;
      
      // ダウンロード
      this.downloadFile(csv, filename, 'text/csv;charset=utf-8');
      
      this.showStatusMessage(`CSVファイルをエクスポートしました: ${filename}`);
    } catch (error) {
      console.error('CSVエクスポートエラー:', error);
      this.showStatusMessage('CSVエクスポートに失敗しました', true);
    }
  },
  
  // ファイルをダウンロード
  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  },
  
  // ローカルストレージにデータを保存
  saveToLocalStorage(filename) {
    if (!filename) return false;
    
    const hotInstance = this.getHotInstance();
    if (!hotInstance) {
      this.showStatusMessage('保存するデータがありません', true);
      return false;
    }
    
    try {
      // データを取得
      const data = hotInstance.getData();
      
      // 保存データを作成
      const saveData = {
        filename: filename,
        date: new Date().toISOString(),
        data: data,
        // その他必要なメタデータがあれば追加
      };
      
      // ローカルストレージに保存
      localStorage.setItem(`spreadsheet_${filename}`, JSON.stringify(saveData));
      
      // ファイルリストを更新
      this.updateFileList(filename);
      
      // 状態を更新
      this.currentFilename = filename;
      this.isModified = false;
      
      this.showStatusMessage(`ファイル "${filename}" を保存しました`);
      
      // カスタムイベント発行
      document.dispatchEvent(new CustomEvent('spreadsheet-file-saved', { 
        detail: { filename } 
      }));
      
      return true;
    } catch (error) {
      console.error('ファイル保存エラー:', error);
      this.showStatusMessage('ファイルの保存に失敗しました', true);
      return false;
    }
  },
  
  // ファイルリストを更新
  updateFileList(filename) {
    if (!filename) return;
    
    try {
      let files = [];
      
      // 既存のファイルリストを取得
      const fileList = localStorage.getItem('spreadsheet_files');
      if (fileList) {
        files = JSON.parse(fileList);
      }
      
      // ファイル名が存在しない場合のみ追加
      if (!files.includes(filename)) {
        files.push(filename);
        localStorage.setItem('spreadsheet_files', JSON.stringify(files));
      }
    } catch (error) {
      console.error('ファイルリスト更新エラー:', error);
    }
  },
  
  // ローカルストレージからデータを読み込む
  loadFromLocalStorage(filename) {
    if (!filename) return false;
    
    try {
      // ローカルストレージからデータを取得
      const savedData = localStorage.getItem(`spreadsheet_${filename}`);
      
      if (!savedData) {
        this.showStatusMessage(`ファイル "${filename}" が見つかりません`, true);
        return false;
      }
      
      const parsedData = JSON.parse(savedData);
      
      const hotInstance = this.getHotInstance();
      if (!hotInstance) {
        this.showStatusMessage('スプレッドシートが初期化されていません', true);
        return false;
      }
      
      // データをロード
      hotInstance.loadData(parsedData.data);
      
      // 状態を更新
      this.currentFilename = filename;
      this.isModified = false;
      
      // カスタムイベント発行
      document.dispatchEvent(new CustomEvent('spreadsheet-file-loaded', {
        detail: {
          filename: filename,
          data: parsedData
        }
      }));
      
      this.showStatusMessage(`ファイル "${filename}" を読み込みました`);
      return true;
    } catch (error) {
      console.error('ファイル読み込みエラー:', error);
      this.showStatusMessage('ファイルの読み込みに失敗しました', true);
      return false;
    }
  },
  
  // 保存されたファイル一覧を取得
  getSavedFileList() {
    try {
      const fileList = localStorage.getItem('spreadsheet_files');
      return fileList ? JSON.parse(fileList) : [];
    } catch (error) {
      console.error('ファイルリスト取得エラー:', error);
      return [];
    }
  },
  
  // ステータスメッセージを表示
  showStatusMessage(message, isError = false) {
    if (isError) {
      console.error(message);
    } else {
      console.log(message);
    }
    
    // カスタムイベントを発行
    document.dispatchEvent(new CustomEvent('spreadsheet-status-message', {
      detail: { message, isError }
    }));
  }
};

export default fileOperationsPlugin;