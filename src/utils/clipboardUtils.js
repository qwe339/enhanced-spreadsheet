// src/utils/clipboardUtils.js
/**
 * データをクリップボードにコピーする
 * @param {Array} data コピーするデータ
 * @param {boolean} asHTML HTMLとしてコピーするかどうか
 * @returns {Promise} 処理結果を示すPromise
 */
export async function copyToClipboard(data, asHTML = false) {
  if (!data || data.length === 0) return false;
  
  try {
    // テキスト形式でコピー
    const textData = data.map(row => row.join('\t')).join('\n');
    
    // HTML形式でコピー (テーブル形式)
    const htmlData = `
      <table>
        ${data.map(row => `
          <tr>
            ${row.map(cell => `<td>${cell !== null ? cell : ''}</td>`).join('')}
          </tr>
        `).join('')}
      </table>
    `;
    
    // クリップボードに書き込み
    if (navigator.clipboard && navigator.clipboard.write) {
      // モダンブラウザの場合
      const clipboardData = [
        new ClipboardItem({
          'text/plain': new Blob([textData], { type: 'text/plain' }),
          'text/html': new Blob([htmlData], { type: 'text/html' })
        })
      ];
      
      await navigator.clipboard.write(clipboardData);
    } else {
      // フォールバック: テキストのみコピー
      await navigator.clipboard.writeText(textData);
    }
    
    return true;
  } catch (error) {
    console.error('クリップボードコピーエラー:', error);
    
    // フォールバック: document.execCommand (非推奨だが広くサポート)
    try {
      const textarea = document.createElement('textarea');
      textarea.value = data.map(row => row.join('\t')).join('\n');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    } catch (fallbackError) {
      console.error('クリップボードフォールバックエラー:', fallbackError);
      return false;
    }
  }
}

/**
 * クリップボードからデータを取得する
 * @returns {Promise<Array>} 取得したデータ
 */
export async function pasteFromClipboard() {
  try {
    // モダンAPIでクリップボードからHTMLとテキストを取得
    if (navigator.clipboard && navigator.clipboard.read) {
      try {
        const clipboardItems = await navigator.clipboard.read();
        
        for (const item of clipboardItems) {
          // HTML形式があれば優先的に使用
          if (item.types.includes('text/html')) {
            const htmlBlob = await item.getType('text/html');
            const htmlText = await htmlBlob.text();
            
            // HTML解析
            return parseHTMLTable(htmlText);
          }
          
          // テキスト形式
          if (item.types.includes('text/plain')) {
            const textBlob = await item.getType('text/plain');
            const text = await textBlob.text();
            
            // タブと改行で分割
            return text.split('\n').map(line => line.split('\t'));
          }
        }
      } catch (error) {
        console.warn('クリップボードの読み込みに失敗、テキストのみ取得します:', error);
      }
    }
    
    // フォールバック: テキストのみ読み込み
    const text = await navigator.clipboard.readText();
    return text.split('\n').map(line => line.split('\t'));
  } catch (error) {
    console.error('クリップボード読み込みエラー:', error);
    
    // 最後のフォールバック: 空のデータを返す
    return [['']];
  }
}

/**
 * HTML形式のテーブルをパースする
 * @param {string} html HTML文字列
 * @returns {Array} パースしたデータ
 */
function parseHTMLTable(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const tables = doc.querySelectorAll('table');
  
  if (tables.length === 0) {
    return [['']];
  }
  
  const table = tables[0];
  const rows = table.querySelectorAll('tr');
  const result = [];
  
  for (let i = 0; i < rows.length; i++) {
    const rowData = [];
    const cells = rows[i].querySelectorAll('td, th');
    
    for (let j = 0; j < cells.length; j++) {
      rowData.push(cells[j].textContent || '');
    }
    
    result.push(rowData);
  }
  
  return result;
}