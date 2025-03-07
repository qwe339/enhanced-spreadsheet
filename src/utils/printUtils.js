// src/utils/printUtils.js
/**
 * 印刷用のプレビューを表示する
 * @param {Object} hotInstance Handsontableインスタンス
 * @param {Object} options 印刷オプション
 */
export function showPrintPreview(hotInstance, options = {}) {
  if (!hotInstance) return;
  
  const {
    title = '',
    fileName = 'スプレッドシート',
    sheetName = 'Sheet1',
    showHeaders = true,
    showGrid = true,
    orientation = 'landscape',
    pageSize = 'a4',
    margins = { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
    scaling = 100,
    fitToPage = false,
    includeHeaderFooter = true
  } = options;
  
  // 新しいウィンドウを開く
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) {
    alert('ポップアップがブロックされました。印刷プレビューを表示するには、ポップアップを許可してください。');
    return;
  }
  
  // データを取得
  const tableData = hotInstance.getData();
  const numRows = tableData.length;
  const numCols = tableData[0] ? tableData[0].length : 0;
  
  // 列ヘッダーを取得
  const colHeaders = [];
  for (let i = 0; i < numCols; i++) {
    colHeaders.push(hotInstance.getColHeader(i) || '');
  }
  
  // 行ヘッダーを取得
  const rowHeaders = [];
  for (let i = 0; i < numRows; i++) {
    rowHeaders.push(hotInstance.getRowHeader(i) || '');
  }
  
  // セルスタイルを取得
  const cellStyles = [];
  for (let row = 0; row < numRows; row++) {
    for (let col = 0; col < numCols; col++) {
      const td = hotInstance.getCell(row, col);
      if (td) {
        const style = window.getComputedStyle(td);
        cellStyles.push({
          row,
          col,
          fontWeight: style.fontWeight,
          fontStyle: style.fontStyle,
          textDecoration: style.textDecoration,
          textAlign: style.textAlign,
          backgroundColor: style.backgroundColor,
          color: style.color,
          fontSize: style.fontSize
        });
      }
    }
  }
  
  // プレビューページのHTMLを作成
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>印刷プレビュー - ${fileName}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
        }
        
        .print-controls {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: #f8f8f8;
          padding: 10px;
          display: flex;
          justify-content: space-between;
          border-bottom: 1px solid #ddd;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          z-index: 100;
        }
        
        .print-options {
          margin-top: 50px;
          margin-bottom: 20px;
          padding: 15px;
          background: #f8f8f8;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        
        .option-group {
          margin-bottom: 10px;
        }
        
        .option-group label {
          display: inline-block;
          width: 150px;
        }
        
        .spreadsheet-table {
          border-collapse: collapse;
          width: 100%;
          margin-top: 20px;
        }
        
        .spreadsheet-table th, .spreadsheet-table td {
          ${showGrid ? 'border: 1px solid #ddd;' : ''}
          padding: 5px;
        }
        
        .spreadsheet-table th {
          background-color: #f1f1f1;
          text-align: center;
        }
        
        .corner-header {
          background-color: #e8e8e8;
        }
        
        @media print {
          .print-controls, .print-options {
            display: none;
          }
          
          body {
            padding: 0;
          }
          
          @page {
            size: ${pageSize} ${orientation};
            margin: ${margins.top} ${margins.right} ${margins.bottom} ${margins.left};
          }
          
          .spreadsheet-title {
            text-align: center;
            margin-bottom: 10px;
          }
          
          .spreadsheet-table {
            ${fitToPage ? 'width: 100%;' : ''}
            transform: scale(${scaling / 100});
            transform-origin: top left;
          }
        }
        
        /* セルスタイルを適用 */
        ${cellStyles.map(style => `
          .cell-${style.row}-${style.col} {
            font-weight: ${style.fontWeight};
            font-style: ${style.fontStyle};
            text-decoration: ${style.textDecoration};
            text-align: ${style.textAlign};
            background-color: ${style.backgroundColor};
            color: ${style.color};
            font-size: ${style.fontSize};
          }
        `).join('\n')}
      </style>
    </head>
    <body>
      <div class="print-controls">
        <h2>印刷プレビュー - ${fileName}</h2>
        <div>
          <button onclick="window.print()">印刷</button>
          <button onclick="window.close()">閉じる</button>
        </div>
      </div>
      
      <div class="print-options">
        <div class="option-group">
          <label>表示オプション:</label>
          <input type="checkbox" id="show-headers" ${showHeaders ? 'checked' : ''} onchange="toggleHeaders()">
          <label for="show-headers">ヘッダーを表示</label>
          
          <input type="checkbox" id="show-grid" ${showGrid ? 'checked' : ''} onchange="toggleGrid()">
          <label for="show-grid">グリッド線を表示</label>
        </div>
        
        <div class="option-group">
          <label>ページ設定:</label>
          <select id="orientation" onchange="changeOrientation()">
            <option value="portrait" ${orientation === 'portrait' ? 'selected' : ''}>縦向き</option>
            <option value="landscape" ${orientation === 'landscape' ? 'selected' : ''}>横向き</option>
          </select>
          
          <select id="page-size" onchange="changePageSize()">
            <option value="a4" ${pageSize === 'a4' ? 'selected' : ''}>A4</option>
            <option value="letter" ${pageSize === 'letter' ? 'selected' : ''}>レター</option>
            <option value="legal" ${pageSize === 'legal' ? 'selected' : ''}>リーガル</option>
          </select>
          
          <input type="number" id="scaling" min="50" max="200" value="${scaling}" onchange="changeScaling()">
          <label for="scaling">%</label>
        </div>
      </div>
      
      <h1 class="spreadsheet-title">${title || `${fileName} - ${sheetName}`}</h1>
      
      <table class="spreadsheet-table">
        ${showHeaders ? `
          <tr>
            <th class="corner-header"></th>
            ${colHeaders.map(header => `<th>${header}</th>`).join('')}
          </tr>
        ` : ''}
        
        ${tableData.map((row, rowIndex) => `
          <tr>
            ${showHeaders ? `<th>${rowHeaders[rowIndex]}</th>` : ''}
            ${row.map((cell, colIndex) => `
              <td class="cell-${rowIndex}-${colIndex}">${cell !== null && cell !== undefined ? cell : ''}</td>
            `).join('')}
          </tr>
        `).join('')}
      </table>
      
      <script>
        function toggleHeaders() {
          const showHeaders = document.getElementById('show-headers').checked;
          document.querySelectorAll('th').forEach(th => {
            th.style.display = showHeaders ? '' : 'none';
          });
        }
        
        function toggleGrid() {
          const showGrid = document.getElementById('show-grid').checked;
          const table = document.querySelector('.spreadsheet-table');
          table.style.borderCollapse = showGrid ? 'collapse' : 'separate';
          
          document.querySelectorAll('.spreadsheet-table th, .spreadsheet-table td').forEach(cell => {
            cell.style.border = showGrid ? '1px solid #ddd' : 'none';
          });
        }
        
        function changeOrientation() {
          const orientation = document.getElementById('orientation').value;
          const style = document.createElement('style');
          style.innerHTML = \`@page { size: \${document.getElementById('page-size').value} \${orientation}; }\`;
          document.head.appendChild(style);
        }
        
        function changePageSize() {
          const pageSize = document.getElementById('page-size').value;
          const style = document.createElement('style');
          style.innerHTML = \`@page { size: \${pageSize} \${document.getElementById('orientation').value}; }\`;
          document.head.appendChild(style);
        }
        
        function changeScaling() {
          const scaling = document.getElementById('scaling').value;
          const table = document.querySelector('.spreadsheet-table');
          table.style.transform = \`scale(\${scaling / 100})\`;
        }
      </script>
    </body>
    </html>
  `;
  
  // HTMLを書き込み
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

/**
 * 直接印刷する
 * @param {Object} hotInstance Handsontableインスタンス
 * @param {Object} options 印刷オプション
 */
export function printDirect(hotInstance, options = {}) {
  const {
    fileName = 'スプレッドシート',
    sheetName = 'Sheet1',
    showHeaders = true,
    showGrid = true
  } = options;
  
  // 印刷用のスタイルを適用
  const originalStyles = document.createElement('style');
  originalStyles.innerHTML = `
    @media print {
      body * {
        visibility: hidden;
      }
      .spreadsheet-grid-container, .spreadsheet-grid-container * {
        visibility: visible;
      }
      .spreadsheet-grid-container {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
      }
      .handsontable th, .handsontable td {
        border: ${showGrid ? '1px solid #000' : 'none'} !important;
      }
      .handsontable th.htNoFrame, .handsontable td.htNoFrame {
        border: none !important;
      }
      .handsontable .htCore th.currentRow, .handsontable .htCore td.currentRow {
        background-color: transparent !important;
      }
      .handsontable .htCore th.currentCol, .handsontable .htCore td.currentCol {
        background-color: transparent !important;
      }
      ${!showHeaders ? '.handsontable th { display: none !important; }' : ''}
      /* シート名とファイル名を印刷用に追加 */
      .spreadsheet-grid-container::before {
        content: "${fileName} - ${sheetName}";
        visibility: visible;
        display: block;
        text-align: center;
        font-size: 14pt;
        margin-bottom: 10px;
      }
      /* ページ設定 */
      @page {
        size: landscape;
        margin: 1cm;
      }
    }
  `;
  document.head.appendChild(originalStyles);
  
  // 印刷
  window.print();
  
  // スタイルを削除
  document.head.removeChild(originalStyles);
}