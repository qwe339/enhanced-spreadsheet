// file-operations/index.js

import Papa from 'papaparse';

class FileOperations {
  constructor(registry) {
    this.registry = registry;
    this.hotInstance = null;
    this.currentFilename = null;
    this.isModified = false;
    
    // イベントリスナーの設定
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // CSVインポートイベント
    document.addEventListener('spreadsheet-import-csv', (e) => {
      if (e.detail && e.detail.data) {
        this.importCSVData(e.detail.data);
      }
    });
    
    // データ更新イベント
    document.addEventListener('spreadsheet-data-updated', (e) => {
      if (e.detail) {
        this.isModified = true;
      }
    });
  }
  
  // Handsontableインスタンスを設定
  setHotInstance(instance) {
    this.hotInstance = instance;
  }
  
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
  
  // CSVデータをインポート
  importCSVData(data) {
    if (!data || !Array.isArray(data) || data.length === 0) {
      this.showStatusMessage('インポートするデータがありません', true);
      return;
    }
    
    console.log('CSVデータをインポート:', data);
    
    // データ検証と前処理
    const processedData = data.map(row => {
      if (!Array.isArray(row)) {
        // 配列でない行があれば変換
        return Object.values(row);
      }
      return row;
    });
    
    // Handsontableインスタンスの取得（複数の方法を試行）
    const getHotInstance = () => {
      // 登録済みインスタンスの取得を試行
      if (this.registry && this.registry.hotInstance) {
        console.log('Registry経由でHotInstanceを取得しました');
        return this.registry.hotInstance;
      }
      
      // グローバル変数から取得を試行
      if (window.__hotInstance) {
        console.log('グローバル変数経由でHotInstanceを取得しました');
        return window.__hotInstance;
      }
      
      // DOM探索による取得を試行
      const hotContainer = document.querySelector('.spreadsheet-grid-container');
      if (hotContainer) {
        const handsontableEl = hotContainer.querySelector('.handsontable');
        if (handsontableEl && handsontableEl.hotInstance) {
          console.log('DOM経由でHotInstanceを取得しました');
          return handsontableEl.hotInstance;
        }
      }
      
      // 最終手段：直接アクセス
      const hotElements = document.querySelectorAll('.handsontable');
      for (const el of hotElements) {
        if (el.hotInstance) {
          console.log('DOM全探索でHotInstanceを取得しました');
          return el.hotInstance;
        }
      }
      
      return null;
    };
    
    const hotInstance = getHotInstance();
    
    if (hotInstance) {
      try {
        console.log(`データをロードします: ${processedData.length}行 x ${processedData[0]?.length || 0}列`);
        
        // 一時的にイベント通知を無効化
        hotInstance.suspendExecution();
        
        // 明示的にデータをクリア
        hotInstance.clear();
        
        // データをロード
        hotInstance.loadData(processedData);
        
        // 元の状態に戻す
        hotInstance.resumeExecution();
        
        // 強制的に再描画
        hotInstance.render();
        
        // SpreadsheetContextの状態を更新
        try {
          // カスタムイベント経由でコンテキスト更新
          document.dispatchEvent(new CustomEvent('spreadsheet-data-updated', { 
            detail: { 
              data: processedData,
              sheetId: 'Sheet1', // デフォルトシート名、必要に応じて変更
              isModified: true 
            } 
          }));
        } catch (e) {
          console.warn('コンテキスト更新エラー:', e);
        }
        
        this.showStatusMessage('CSVデータをインポートしました');
      } catch (error) {
        console.error('CSVデータ適用エラー:', error);
        this.showStatusMessage(`CSVデータの適用に失敗しました: ${error.message}`, true);
        
        // エラー詳細をコンソールに出力（デバッグ用）
        console.debug('データサンプル:', processedData.slice(0, 3));
        console.debug('Handsontable状態:', hotInstance.getPlugin('copyPaste').rowsLimit);
      }
    } else {
      console.error('Handsontableインスタンスが見つかりません');
      
      // フォールバック処理
      this.showStatusMessage('エディタの初期化が完了していません', true);
      
      // 代替イベント発行
      document.dispatchEvent(new CustomEvent('spreadsheet-import-failed', { 
        detail: { 
          reason: 'エディタが初期化されていません',
          dataSize: `${processedData.length}行 x ${processedData[0]?.length || 0}列`
        } 
      }));
    }
  }
  
  // CSVデータをエクスポート
  exportCSVData() {
    const hotInstance = this.hotInstance || this.getHotInstance();
    
    if (!hotInstance) {
      this.showStatusMessage('エクスポートするデータがありません', true);
      return;
    }
    
    try {
      // データを取得
      const data = hotInstance.getData();
      
      // CSVにエクスポート
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
  }
  
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
  }
  
  // ファイルを保存
  saveFile(filename) {
    if (!filename) {
      filename = this.currentFilename || 'spreadsheet';
    }
    
    const hotInstance = this.hotInstance || this.getHotInstance();
    
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
      return true;
    } catch (error) {
      console.error('ファイル保存エラー:', error);
      this.showStatusMessage('ファイルの保存に失敗しました', true);
      return false;
    }
  }
  
  // ファイルを読み込み
  loadFile(filename) {
    if (!filename) {
      this.showStatusMessage('ファイル名が指定されていません', true);
      return false;
    }
    
    try {
      // ローカルストレージからデータを取得
      const savedData = localStorage.getItem(`spreadsheet_${filename}`);
      
      if (!savedData) {
        this.showStatusMessage(`ファイル "${filename}" が見つかりません`, true);
        return false;
      }
      
      const parsedData = JSON.parse(savedData);
      
      // Handsontableインスタンスを取得
      const hotInstance = this.hotInstance || this.getHotInstance();
      
      if (!hotInstance) {
        this.showStatusMessage('エディタが初期化されていません', true);
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
  }
  
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
  }
  
  // 保存されたファイル一覧を取得
  getSavedFilesList() {
    try {
      const fileList = localStorage.getItem('spreadsheet_files');
      return fileList ? JSON.parse(fileList) : [];
    } catch (error) {
      console.error('ファイルリスト取得エラー:', error);
      return [];
    }
  }
  
  // ファイルを削除
  deleteFile(filename) {
    if (!filename) return false;
    
    try {
      // ローカルストレージからファイルを削除
      localStorage.removeItem(`spreadsheet_${filename}`);
      
      // ファイルリストを更新
      const files = this.getSavedFilesList().filter(file => file !== filename);
      localStorage.setItem('spreadsheet_files', JSON.stringify(files));
      
      // 現在開いているファイルが削除された場合
      if (this.currentFilename === filename) {
        this.currentFilename = null;
      }
      
      this.showStatusMessage(`ファイル "${filename}" を削除しました`);
      return true;
    } catch (error) {
      console.error('ファイル削除エラー:', error);
      this.showStatusMessage('ファイルの削除に失敗しました', true);
      return false;
    }
  }
  
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
    
    // 最終手段：直接アクセス
    const hotElements = document.querySelectorAll('.handsontable');
    for (const el of hotElements) {
      if (el.hotInstance) {
        return el.hotInstance;
      }
    }
    
    return null;
  }
}

export default FileOperations;