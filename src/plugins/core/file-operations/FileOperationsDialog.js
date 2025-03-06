class FileOperationsDialog {
  constructor(plugin) {
    this.plugin = plugin;
    this.openDialog = null;
    this.saveAsDialog = null;
    this.importCSVDialog = null;
  }
  
  // ファイルを開くダイアログを表示
  showOpenDialog() {
    // 既存のダイアログがあれば削除
    this.removeOpenDialog();
    
    // ファイルリストを取得
    const fileList = this.plugin.getSavedFileList();
    
    // ダイアログを作成
    const dialog = document.createElement('div');
    dialog.className = 'file-dialog-overlay';
    
    dialog.innerHTML = `
      <div class="file-dialog">
        <div class="file-dialog-header">
          <h2>ファイルを開く</h2>
          <button class="file-dialog-close">×</button>
        </div>
        <div class="file-dialog-content">
          ${fileList.length === 0 
            ? '<p>保存されたファイルがありません</p>' 
            : `
              <div class="file-list">
                ${fileList.map(file => `
                  <div class="file-item" data-filename="${file}">${file}</div>
                `).join('')}
              </div>
            `
          }
        </div>
        <div class="file-dialog-footer">
          <button class="file-dialog-cancel">キャンセル</button>
          <button class="file-dialog-open" ${fileList.length === 0 ? 'disabled' : ''}>開く</button>
        </div>
      </div>
    `;
    
    // クローズボタンのクリックイベント
    const closeBtn = dialog.querySelector('.file-dialog-close');
    closeBtn.addEventListener('click', () => this.removeOpenDialog());
    
    // キャンセルボタンのクリックイベント
    const cancelBtn = dialog.querySelector('.file-dialog-cancel');
    cancelBtn.addEventListener('click', () => this.removeOpenDialog());
    
    // 背景クリックでダイアログを閉じる
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) this.removeOpenDialog();
    });
    
    // ファイルリストアイテムのクリックイベント
    let selectedFile = null;
    const fileItems = dialog.querySelectorAll('.file-item');
    fileItems.forEach(item => {
      item.addEventListener('click', () => {
        fileItems.forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        selectedFile = item.getAttribute('data-filename');
      });
      
      // ダブルクリックで開く
      item.addEventListener('dblclick', () => {
        const filename = item.getAttribute('data-filename');
        this.openFile(filename);
        this.removeOpenDialog();
      });
    });
    
    // 開くボタンのクリックイベント
    const openBtn = dialog.querySelector('.file-dialog-open');
    openBtn.addEventListener('click', () => {
      if (selectedFile) {
        this.openFile(selectedFile);
        this.removeOpenDialog();
      } else {
        alert('ファイルを選択してください');
      }
    });
    
    // DOMに追加
    document.body.appendChild(dialog);
    this.openDialog = dialog;
  }
  
  // 名前を付けて保存ダイアログを表示
  showSaveAsDialog() {
    // 既存のダイアログがあれば削除
    this.removeSaveAsDialog();
    
    // ダイアログを作成
    const dialog = document.createElement('div');
    dialog.className = 'file-dialog-overlay';
    
    dialog.innerHTML = `
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
    const closeBtn = dialog.querySelector('.file-dialog-close');
    closeBtn.addEventListener('click', () => this.removeSaveAsDialog());
    
    // キャンセルボタンのクリックイベント
    const cancelBtn = dialog.querySelector('.file-dialog-cancel');
    cancelBtn.addEventListener('click', () => this.removeSaveAsDialog());
    
    // 背景クリックでダイアログを閉じる
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) this.removeSaveAsDialog();
    });
    
    // 保存ボタンのクリックイベント
    const saveBtn = dialog.querySelector('.file-dialog-save');
    const filenameInput = dialog.querySelector('#filename');
    
    saveBtn.addEventListener('click', () => {
      const filename = filenameInput.value.trim();
      if (!filename) {
        alert('ファイル名を入力してください');
        return;
      }
      
      this.saveFile(filename);
      this.removeSaveAsDialog();
    });
    
    // Enterキーで保存
    filenameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const filename = filenameInput.value.trim();
        if (filename) {
          this.saveFile(filename);
          this.removeSaveAsDialog();
        }
      }
    });
    
    // DOMに追加
    document.body.appendChild(dialog);
    this.saveAsDialog = dialog;
    
    // 入力欄にフォーカス
    setTimeout(() => filenameInput.focus(), 100);
  }
  
  // CSVインポートダイアログを表示
  showImportCSVDialog() {
    // 既存のダイアログがあれば削除
    this.removeImportCSVDialog();
    
    // ダイアログを作成
    const dialog = document.createElement('div');
    dialog.className = 'file-dialog-overlay';
    
    dialog.innerHTML = `
      <div class="file-dialog">
        <div class="file-dialog-header">
          <h2>CSVインポート</h2>
          <button class="file-dialog-close">×</button>
        </div>
        <div class="file-dialog-content">
          <div class="file-form-group">
            <label for="csv-file">CSVファイル:</label>
            <input type="file" id="csv-file" accept=".csv,.txt">
          </div>
          <div class="file-form-group">
            <label for="delimiter">区切り文字:</label>
            <select id="delimiter">
              <option value=",">カンマ (,)</option>
              <option value=";">セミコロン (;)</option>
              <option value="tab">タブ</option>
            </select>
          </div>
        </div>
        <div class="file-dialog-footer">
          <button class="file-dialog-cancel">キャンセル</button>
          <button class="file-dialog-import">インポート</button>
        </div>
      </div>
    `;
    
    // クローズボタンのクリックイベント
    const closeBtn = dialog.querySelector('.file-dialog-close');
    closeBtn.addEventListener('click', () => this.removeImportCSVDialog());
    
    // キャンセルボタンのクリックイベント
    const cancelBtn = dialog.querySelector('.file-dialog-cancel');
    cancelBtn.addEventListener('click', () => this.removeImportCSVDialog());
    
    // 背景クリックでダイアログを閉じる
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) this.removeImportCSVDialog();
    });
    
    // インポートボタンのクリックイベント
    const importBtn = dialog.querySelector('.file-dialog-import');
    const fileInput = dialog.querySelector('#csv-file');
    const delimiterSelect = dialog.querySelector('#delimiter');
    
    importBtn.addEventListener('click', () => {
      const file = fileInput.files[0];
      if (!file) {
        alert('ファイルを選択してください');
        return;
      }
      
      const delimiter = delimiterSelect.value === 'tab' ? '\t' : delimiterSelect.value;
      this.importCSV(file, delimiter);
      this.removeImportCSVDialog();
    });
    
    // DOMに追加
    document.body.appendChild(dialog);
    this.importCSVDialog = dialog;
  }
  
  // ダイアログを削除
  removeOpenDialog() {
    if (this.openDialog) {
      document.body.removeChild(this.openDialog);
      this.openDialog = null;
    }
  }
  
  removeSaveAsDialog() {
    if (this.saveAsDialog) {
      document.body.removeChild(this.saveAsDialog);
      this.saveAsDialog = null;
    }
  }
  
  removeImportCSVDialog() {
    if (this.importCSVDialog) {
      document.body.removeChild(this.importCSVDialog);
      this.importCSVDialog = null;
    }
  }
  
  // ファイルを開く処理
  openFile(filename) {
    console.log(`Opening file: ${filename}`);
    // プラグインからデータを読み込み
    const data = this.plugin.loadFromLocalStorage(filename);
    if (!data) {
      alert(`ファイル "${filename}" を読み込めませんでした`);
      return;
    }
    
    // スプレッドシートエディタを取得
    const editor = document.querySelector('.spreadsheet-editor');
    if (!editor) {
      alert('スプレッドシートエディタが見つかりません');
      return;
    }
    
    // カスタムイベントを発行
    const event = new CustomEvent('spreadsheet-load-data', { 
      detail: { filename, data } 
    });
    document.dispatchEvent(event);
  }
  
  // ファイルを保存
  saveFile(filename) {
    console.log(`Saving file as: ${filename}`);
    // スプレッドシートエディタを取得
    const editor = document.querySelector('.spreadsheet-editor');
    if (!editor) {
      alert('スプレッドシートエディタが見つかりません');
      return;
    }
    
    // カスタムイベントを発行
    const event = new CustomEvent('spreadsheet-save-data', { 
      detail: { filename } 
    });
    document.dispatchEvent(event);
  }
  
  // CSVをインポート
  importCSV(file, delimiter) {
    console.log(`Importing CSV with delimiter: ${delimiter}`);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const content = e.target.result;
      // カスタムイベントを発行
      const event = new CustomEvent('spreadsheet-import-csv', { 
        detail: { content, delimiter } 
      });
      document.dispatchEvent(event);
    };
    
    reader.onerror = () => {
      alert('ファイルの読み込みに失敗しました');
    };
    
    reader.readAsText(file);
  }
}

export default FileOperationsDialog;