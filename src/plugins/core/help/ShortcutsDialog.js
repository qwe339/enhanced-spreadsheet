class ShortcutsDialog {
  constructor() {
    this.dialog = null;
    this.createDialog();
  }
  
  createDialog() {
    // ショートカットダイアログのHTML要素を作成
    const dialog = document.createElement('div');
    dialog.className = 'help-dialog-overlay';
    
    dialog.innerHTML = `
      <div class="help-dialog">
        <div class="help-dialog-header">
          <h2>キーボードショートカット</h2>
          <button class="help-dialog-close">×</button>
        </div>
        <div class="help-dialog-content">
          <table class="shortcuts-table">
            <tr>
              <th>ショートカット</th>
              <th>機能</th>
            </tr>
            <tr>
              <td>Ctrl+N</td>
              <td>新規ファイル</td>
            </tr>
            <tr>
              <td>Ctrl+S</td>
              <td>保存</td>
            </tr>
            <tr>
              <td>Ctrl+Z</td>
              <td>元に戻す</td>
            </tr>
            <tr>
              <td>Ctrl+Y</td>
              <td>やり直し</td>
            </tr>
            <tr>
              <td>Ctrl+C</td>
              <td>コピー</td>
            </tr>
            <tr>
              <td>Ctrl+X</td>
              <td>切り取り</td>
            </tr>
            <tr>
              <td>Ctrl+V</td>
              <td>貼り付け</td>
            </tr>
            <tr>
              <td>Ctrl+B</td>
              <td>太字</td>
            </tr>
            <tr>
              <td>Ctrl+I</td>
              <td>斜体</td>
            </tr>
            <tr>
              <td>Ctrl+U</td>
              <td>下線</td>
            </tr>
            <tr>
              <td>F2</td>
              <td>セル編集</td>
            </tr>
            <tr>
              <td>F1</td>
              <td>ヘルプ</td>
            </tr>
          </table>
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

export default ShortcutsDialog;