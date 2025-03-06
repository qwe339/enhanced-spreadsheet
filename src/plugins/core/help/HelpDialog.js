class HelpDialog {
  constructor() {
    this.dialog = null;
    this.createDialog();
  }
  
  createDialog() {
    // ヘルプダイアログのHTML要素を作成
    const dialog = document.createElement('div');
    dialog.className = 'help-dialog-overlay';
    
    dialog.innerHTML = `
      <div class="help-dialog">
        <div class="help-dialog-header">
          <h2>スプレッドシートヘルプ</h2>
          <button class="help-dialog-close">×</button>
        </div>
        <div class="help-dialog-content">
          <h3>基本操作</h3>
          <ul>
            <li><strong>セル選択:</strong> クリックまたは矢印キー</li>
            <li><strong>セル編集:</strong> ダブルクリックまたはF2キー</li>
            <li><strong>範囲選択:</strong> ドラッグまたはShift+矢印キー</li>
            <li><strong>コピー:</strong> Ctrl+C</li>
            <li><strong>切り取り:</strong> Ctrl+X</li>
            <li><strong>貼り付け:</strong> Ctrl+V</li>
          </ul>
          
          <h3>数式</h3>
          <p>数式は = で始まります。例: =SUM(A1:A5)</p>
          <p>利用可能な関数: SUM, AVERAGE, COUNT, MAX, MIN など</p>
          
          <h3>書式設定</h3>
          <p>書式メニューから太字、斜体、下線などを適用できます。</p>
          
          <h3>ファイル操作</h3>
          <p>ファイルメニューからCSVのインポート・エクスポートやデータの保存が行えます。</p>
        </div>
      </div>
    `;
    
    // クローズボタンのイベントリスナーを設定
    const closeButton = dialog.querySelector('.help-dialog-close');
    closeButton.addEventListener('click', () => this.hide());
    
    // オーバーレイをクリックしたら閉じる
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) this.hide();
    });
    
    // ダイアログを非表示に
    dialog.style.display = 'none';
    
    // DOMに追加
    document.body.appendChild(dialog);
    this.dialog = dialog;
  }
  
  show() {
    if (this.dialog) {
      this.dialog.style.display = 'flex';
    }
  }
  
  hide() {
    if (this.dialog) {
      this.dialog.style.display = 'none';
    }
  }
}

export default HelpDialog;