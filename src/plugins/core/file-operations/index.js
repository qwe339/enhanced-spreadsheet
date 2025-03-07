import FileOperationsDialog from './FileOperationsDialog';
import './styles.css';
import Papa from 'papaparse';

const fileOperationsPlugin = {
  name: 'ファイル操作',
  version: '1.0.0',
  author: 'Your Name',
  
  initialize(registry) {
    console.log('File operations plugin initialized');
    this.registry = registry;
    
    // ダイアログを初期化
    this.dialog = new FileOperationsDialog(this);
    
    // イベントリスナーのセットアップ
    this.setupEventListeners();
  },
  
  cleanup() {
    // イベントリスナーのクリーンアップ
    this.removeEventListeners();
  },
  
  setupEventListeners() {
    // ファイル開くイベント
    this.handleOpenFile = () => {
      console.log('Open file dialog requested');
      this.dialog.showOpenDialog();
    };
    
    // 名前を付けて保存イベント
    this.handleSaveAsFile = () => {
      console.log('Save as dialog requested');
      this.dialog.showSaveAsDialog();
    };
    
    // CSVインポートイベント
    this.handleImportCSV = () => {
      console.log('CSV import dialog requested');
      this.dialog.showImportCSVDialog();
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
    document.addEventListener('spreadsheet-save-data', this.handleSaveFile);
    document.addEventListener('spreadsheet-load-data', this.handleLoadFile);
  },
  
  removeEventListeners() {
    // イベントリスナーを削除
    document.removeEventListener('file-open', this.handleOpenFile);
    document.removeEventListener('file-save-as', this.handleSaveAsFile);
    document.removeEventListener('file-import-csv', this.handleImportCSV);
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
          this.exportToCSV();
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
  
  // 現在のスプレッドシートを保存
  saveCurrentSpreadsheet(customFilename) {
    if (!this.registry || !this.registry.hotInstance) {
      console.error('スプレッドシートエディタが見つかりません');
      return false;
    }
    
    try {
      // スプレッドシートエディタからデータを取得
      const editor = this.registry.hotInstance;
      const data = editor.getData();
      
      // ファイル名を決定
      let filename = customFilename;
      
      if (!filename) {
        // コンテキストからファイル名を取得
        const fileInfo = this.getFileInfo();
        filename = fileInfo.fileName || '新しいスプレッドシート';
      }
      
      // 保存するデータを準備
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
      
      // 保存成功メッセージ
      this.showStatusMessage(`ファイル "${filename}" を保存しました`);
      
      return true;
    } catch (error) {
      console.error('スプレッドシート保存エラー:', error);
      this.showStatusMessage('保存中にエラーが発生しました', true);
      return false;
    }
  },
  
  // ファイルを読み込む
  loadSpreadsheetData(filename, data) {
    if (!filename) return;
    
    try {
      // ファイル名指定があればLocalStorageから読み込み
      let loadData;
      
      if (typeof data === 'object') {
        loadData = data;
      } else {
        const savedData = localStorage.getItem(`spreadsheet_${filename}`);
        if (!savedData) {
          this.showStatusMessage(`ファイル "${filename}" が見つかりません`, true);
          return false;
        }
        
        loadData = JSON.parse(savedData);
      }
      
      // バージョンチェック
      if (!loadData.version) {
        console.warn('古いバージョンのファイル形式です');
      }
      
      // エディタのインスタンスを取得
      const hotInstance = this.registry.hotInstance;
      if (!hotInstance) {
        this.showStatusMessage('エディタが見つかりません', true);
        return false;
      }
      
      // シート情報を設定
      const currentSheet = loadData.currentSheet || 'Sheet1';
      const sheetData = loadData.data[currentSheet] || [];
      
      // データの読み込み
      hotInstance.loadData(sheetData);
      
      // シート情報を更新
      this.updateSheetInfo({
        currentSheet,
        sheets: loadData.sheets || ['Sheet1']
      });
      
      // フォーマット情報があれば適用
      if (loadData.formatData) {
        this.applyFormatData(loadData.formatData);
      }
      
      // チャートデータがあれば適用
      if (loadData.charts && Array.isArray(loadData.charts)) {
        this.applyChartData(loadData.charts);
      }
      
      // コメントデータがあれば適用
      if (loadData.comments) {
        this.applyCommentData(loadData.comments);
      }
      
      // バリデーションデータがあれば適用
      if (loadData.validations) {
        this.applyValidationData(loadData.validations);
      }
      
      // ファイル名の更新
      this.updateFilename(filename);
      
      // 成功メッセージ
      this.showStatusMessage(`ファイル "${filename}" を読み込みました`);
      
      return true;
    } catch (error) {
      console.error('ファイル読み込みエラー:', error);
      this.showStatusMessage('ファイルの読み込み中にエラーが発生しました', true);
      return false;
    }
  },
  
  // CSVをエクスポート
  exportToCSV(hotInstance) {
    if (!hotInstance) {
      hotInstance = this.registry.hotInstance;
    }
    
    if (!hotInstance) {
      this.showStatusMessage('エディタが見つかりません', true);
      return false;
    }
    
    try {
      // データを取得
      const data = hotInstance.getData();
      
      // PapaParseでCSVに変換
      const csvContent = Papa.unparse(data, {
        delimiter: ",",
        header: false
      });
      
      // ファイル名を決定
      const filename = this.getFileInfo().fileName || 'spreadsheet';
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
      
      this.showStatusMessage(`CSVファイル "${csvFilename}" をエクスポートしました`);
      return true;
    } catch (error) {
      console.error('CSVエクスポートエラー:', error);
      this.showStatusMessage('CSVエクスポート中にエラーが発生しました', true);
      return false;
    }
  },
  
  // ファイルリストを更新
  updateFileList(filename) {
    if (!filename) return;
    
    try {
      let files = this.getSavedFileList();
      
      // ファイル名が存在しない場合のみ追加
      if (!files.includes(filename)) {
        files.push(filename);
        localStorage.setItem('spreadsheet_files', JSON.stringify(files));
      }
    } catch (error) {
      console.error('ファイルリスト更新エラー:', error);
    }
  },
  
  // 保存されたファイルのリストを取得
  getSavedFileList() {
    try {
      const savedFiles = localStorage.getItem('spreadsheet_files');
      return savedFiles ? JSON.parse(savedFiles) : [];
    } catch (error) {
      console.error('ファイルリスト取得エラー:', error);
      return [];
    }
  },
  
  // ローカルストレージからファイルを削除
  deleteFile(filename) {
    if (!filename) return false;
    
    try {
      // ファイルを削除
      localStorage.removeItem(`spreadsheet_${filename}`);
      
      // ファイルリストを更新
      let files = this.getSavedFileList();
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
  
  // ステータスメッセージを表示
  showStatusMessage(message, isError = false) {
    if (isError) {
      console.error(message);
      alert(message);
    } else {
      console.log(message);
      
      // スプレッドシートエディタのステータス更新関数を呼び出す
      const spreadsheetEditor = document.querySelector('.spreadsheet-editor');
      if (spreadsheetEditor && spreadsheetEditor.__reactFiber$) {
        // Reactコンポーネントのインスタンスからメソッドを呼び出す
        const editorInstance = this.registry.hotInstance;
        if (editorInstance && editorInstance.updateStatusMessage) {
          editorInstance.updateStatusMessage(message);
        }
      }
    }
  },
  
  // 現在のファイル情報を取得
  getFileInfo() {
    const spreadsheetEditor = document.querySelector('.spreadsheet-editor');
    if (!spreadsheetEditor) return { fileName: '新しいスプレッドシート' };
    
    // ファイル情報の要素を取得
    const fileInfoElement = spreadsheetEditor.querySelector('.file-info');
    if (!fileInfoElement) return { fileName: '新しいスプレッドシート' };
    
    // テキスト内容から「*」を除去してファイル名を取得
    const fileName = fileInfoElement.textContent.replace(/\s*\*\s*$/, '').trim();
    
    return { fileName };
  },
  
  // 現在のシート情報を取得
  getCurrentSheet() {
    const sheetTabs = document.querySelector('.sheet-tabs');
    if (!sheetTabs) return 'Sheet1';
    
    const activeTab = sheetTabs.querySelector('.sheet-tab.active');
    if (!activeTab) return 'Sheet1';
    
    const tabText = activeTab.querySelector('.sheet-tab-text');
    return tabText ? tabText.textContent : 'Sheet1';
  },
  
  // シートリストを取得
  getSheetList() {
    const sheetTabs = document.querySelector('.sheet-tabs');
    if (!sheetTabs) return ['Sheet1'];
    
    const tabs = Array.from(sheetTabs.querySelectorAll('.sheet-tab:not(.add-sheet)'));
    return tabs.map(tab => {
      const tabText = tab.querySelector('.sheet-tab-text');
      return tabText ? tabText.textContent : '';
    }).filter(Boolean);
  },
  
  // ファイル名を更新
  updateFilename(filename) {
    if (!filename) return;
    
    // エディタのファイル名更新メソッドを呼び出す
    const editorInstance = this.registry.hotInstance;
    if (editorInstance && editorInstance.setFilename) {
      editorInstance.setFilename(filename);
    } else {
      // DOM操作でファイル名を更新
      const fileInfoElement = document.querySelector('.spreadsheet-editor .file-info');
      if (fileInfoElement) {
        fileInfoElement.textContent = filename;
      }
    }
  },
  
  // シート情報を更新
  updateSheetInfo(sheetInfo) {
    if (!sheetInfo) return;
    
    // エディタのシート情報更新メソッドを呼び出す
    const editorInstance = this.registry.hotInstance;
    if (editorInstance) {
      if (editorInstance.updateSheets) {
        editorInstance.updateSheets(sheetInfo.sheets);
      }
      if (editorInstance.switchToSheet) {
        editorInstance.switchToSheet(sheetInfo.currentSheet);
      }
    }
  },
  
  // フォーマットデータを取得
  getFormatData() {
    // フォーマットプラグインからデータを取得
    const formatPlugin = this.registry.plugins['formatting'];
    if (formatPlugin && formatPlugin.getFormatData) {
      return formatPlugin.getFormatData();
    }
    
    return null;
  },
  
  // フォーマットデータを適用
  applyFormatData(formatData) {
    if (!formatData) return;
    
    // フォーマットプラグインを使用してデータを適用
    const formatPlugin = this.registry.plugins['formatting'];
    if (formatPlugin && formatPlugin.applyFormatData) {
      formatPlugin.applyFormatData(formatData);
    }
  },
  
  // チャートデータを取得
  getChartData() {
    // チャートプラグインからデータを取得
    const chartPlugin = this.registry.plugins['chart'];
    if (chartPlugin) {
      return chartPlugin.charts || [];
    }
    
    return [];
  },
  
  // チャートデータを適用
  applyChartData(charts) {
    if (!charts || !Array.isArray(charts) || charts.length === 0) return;
    
    // チャートプラグインを使用してデータを適用
    const chartPlugin = this.registry.plugins['chart'];
    if (chartPlugin) {
      // チャートを初期化
      chartPlugin.charts = [];
      
      // 各チャートを再作成
      charts.forEach(chart => {
        if (chart.dataRange && chart.type) {
          const newChartId = chartPlugin.createChart(
            chart.type,
            chart.dataRange,
            chart.position
          );
          
          // IDを更新して、その他のプロパティをコピー
          const newChart = chartPlugin.charts.find(c => c.id === newChartId);
          if (newChart) {
            Object.assign(newChart, chart, { id: newChartId });
          }
        }
      });
    }
  },
  
  // コメントデータを取得
  getCommentData() {
    // CellFeaturesプラグインからコメントデータを取得
    // ここでは直接アクセスできないため、DOM内のデータから取得する方法や
    // グローバル変数の利用、またはイベントを使った方法を検討
    return {};
  },
  
  // コメントデータを適用
  applyCommentData(comments) {
    if (!comments) return;
  },
  
  // バリデーションデータを取得
  getValidationData() {
    // DataValidationプラグインからデータを取得
    const validationPlugin = this.registry.plugins['data-validation'];
    if (validationPlugin) {
      return validationPlugin.validations || [];
    }
    
    return [];
  },
  
  // バリデーションデータを適用
  applyValidationData(validations) {
    if (!validations) return;
    
    // DataValidationプラグインを使用してデータを適用
    const validationPlugin = this.registry.plugins['data-validation'];
    if (validationPlugin) {
      validationPlugin.validations = validations;
    }
  }
};

export default fileOperationsPlugin;