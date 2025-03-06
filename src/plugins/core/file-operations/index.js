import FileOperationsDialog from './FileOperationsDialog';
import './styles.css';

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
    
    // イベントリスナーを登録
    document.addEventListener('file-open', this.handleOpenFile);
    document.addEventListener('file-save-as', this.handleSaveAsFile);
    document.addEventListener('file-import-csv', this.handleImportCSV);
  },
  
  removeEventListeners() {
    // イベントリスナーを削除
    document.removeEventListener('file-open', this.handleOpenFile);
    document.removeEventListener('file-save-as', this.handleSaveAsFile);
    document.removeEventListener('file-import-csv', this.handleImportCSV);
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
        case 'importCSV':
          document.dispatchEvent(new CustomEvent('file-import-csv'));
          return true;
        default:
          return false;
      }
    },
    
    // ツールバークリックハンドラ
    'toolbar:click': (toolbarId) => {
      // 特定のファイル操作ツールバーアクションを処理
      return false;
    },
    
    // CSVエクスポート処理
    'exportCSV': (hotInstance) => {
      console.log('Exporting CSV...');
      if (!hotInstance) return;
      
      try {
        // データを取得
        const data = hotInstance.getData();
        
        // CSVに変換
        const csvContent = this.convertToCSV(data);
        
        // ダウンロード
        this.downloadCSV(csvContent, 'spreadsheet-export.csv');
        
        console.log('CSV exported successfully');
      } catch (error) {
        console.error('CSV export error:', error);
      }
    }
  },
  
  // CSVに変換
  convertToCSV(data) {
    return data.map(row => 
      row.map(cell => 
        typeof cell === 'string' && cell.includes(',') 
          ? `"${cell}"` 
          : cell
      ).join(',')
    ).join('\n');
  },
  
  // CSVをダウンロード
  downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
  
  // ローカルストレージにファイルを保存
  saveToLocalStorage(filename, data) {
    try {
      localStorage.setItem(`spreadsheet_${filename}`, JSON.stringify(data));
      
      // ファイルリストを更新
      const fileList = JSON.parse(localStorage.getItem('spreadsheet_files') || '[]');
      if (!fileList.includes(filename)) {
        fileList.push(filename);
        localStorage.setItem('spreadsheet_files', JSON.stringify(fileList));
      }
      
      return true;
    } catch (error) {
      console.error('Save to localStorage error:', error);
      return false;
    }
  },
  
  // ローカルストレージからファイルを読み込む
  loadFromLocalStorage(filename) {
    try {
      const data = localStorage.getItem(`spreadsheet_${filename}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Load from localStorage error:', error);
      return null;
    }
  },
  
  // 保存されたファイルのリストを取得
  getSavedFileList() {
    try {
      return JSON.parse(localStorage.getItem('spreadsheet_files') || '[]');
    } catch (error) {
      console.error('Get file list error:', error);
      return [];
    }
  }
};

export default fileOperationsPlugin;