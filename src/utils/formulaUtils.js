// src/utils/formulaUtils.js
import { HyperFormula } from 'hyperformula';

/**
 * HyperFormulaインスタンスを作成し初期化する
 * @param {Array} data 初期データ
 * @param {Object} options 追加オプション
 * @returns {Object} HyperFormulaインスタンス
 */
export function createHyperFormula(data, options = {}) {
  try {
    // HyperFormulaのオプション
    const defaultOptions = {
      licenseKey: 'gpl-v3',
      // 日本語の式関数名をサポート
      language: 'ja-JP',
      precisionRounding: 10, // 計算の精度
      smartRounding: true, // スマートな丸め処理
      nullDate: { year: 1899, month: 12, day: 30 }, // Excelと互換性のある日付の開始点
      maxRows: 500, // 最大行数
      maxColumns: 100, // 最大列数
      useColumnIndex: true // 列インデックスを使用（A, B, C, ...）
    };
    
    const hyperformulaOptions = {
      ...defaultOptions,
      ...options
    };
    
    // データをHyperFormula形式に変換（nullやundefinedを''に変換）
    const sheetData = data ? data.map(row => 
      row.map(cell => cell === null || cell === undefined ? '' : cell)
    ) : [[]];
    
    try {
      // シートデータを構築
      const hfInstance = HyperFormula.buildFromSheets({
        Sheet1: sheetData
      }, hyperformulaOptions);
      
      return hfInstance;
    } catch (buildError) {
      console.warn('HyperFormula buildFromSheets failed:', buildError);
      
      // 代替方法：エラー時は基本的な機能を持つダミーオブジェクトを返す
      return createDummyFormulaEngine(sheetData);
    }
  } catch (error) {
    console.error('HyperFormula initialization error:', error);
    
    // フォールバック：ダミーオブジェクトを返す
    return createDummyFormulaEngine([[]]);
  }
}

/**
 * 数式を評価する
 * @param {Object} hfInstance HyperFormulaインスタンス
 * @param {string} formula 評価する数式
 * @param {Object} cellAddress セルアドレス {sheet, row, col}
 * @returns {any} 評価結果
 */
export function evaluateFormula(hfInstance, formula, cellAddress) {
  if (!hfInstance || !formula) return null;
  
  try {
    // 数式かどうか確認
    if (formula.startsWith('=')) {
      const { sheet = 'Sheet1', row = 0, col = 0 } = cellAddress || {};
      const cellReference = { sheet, row, col };
      
      // 数式を評価（エラー処理付き）
      try {
        const result = hfInstance.calculateFormula(formula, cellReference);
        
        // 結果が数値の場合は適切にフォーマット
        if (typeof result === 'number') {
          // 非常に小さい数値や大きい数値はエクスポネンシャル表記に
          if (Math.abs(result) < 0.0001 || Math.abs(result) > 1000000000) {
            return result.toExponential(4);
          }
          
          // 小数点以下が多すぎる場合は丸める
          if (Math.abs(result - Math.round(result)) > 0) {
            const decimalStr = result.toString().split('.')[1];
            if (decimalStr && decimalStr.length > 10) {
              return result.toFixed(10);
            }
          }
        }
        
        // 日付型の場合はフォーマット
        if (result instanceof Date) {
          return result.toLocaleDateString();
        }
        
        return result;
      } catch (calcError) {
        console.warn(`式 "${formula}" の計算エラー:`, calcError);
        return '#ERROR!';
      }
    }
    
    // 数式でない場合はそのまま返す
    return formula;
  } catch (error) {
    console.error('数式評価エラー:', error);
    return '#ERROR!';
  }
}

/**
 * HyperFormulaの代わりとなる基本的な数式エンジンを作成
 * @param {Array} initialData 初期データ
 * @returns {Object} 数式エンジンのダミーオブジェクト
 */
function createDummyFormulaEngine(initialData) {
  // データのコピーを保持
  let sheetData = { Sheet1: JSON.parse(JSON.stringify(initialData || [[]])) };
  let sheets = ['Sheet1'];
  
  return {
    // シートを追加
    addSheet: (sheetName) => {
      if (!sheets.includes(sheetName)) {
        sheets.push(sheetName);
        sheetData[sheetName] = [[]];
      }
    },
    
    // シートの内容を設定
    setSheetContent: (sheetName, data) => {
      if (sheets.includes(sheetName)) {
        sheetData[sheetName] = JSON.parse(JSON.stringify(data));
      }
    },
    
    // シートを削除
    removeSheet: (sheetName) => {
      if (sheets.includes(sheetName) && sheets.length > 1) {
        sheets = sheets.filter(s => s !== sheetName);
        delete sheetData[sheetName];
      }
    },
    
    // セルの内容を設定
    setCellContents: (address, value) => {
      const { sheet, row, col } = address;
      if (sheets.includes(sheet)) {
        // 必要に応じてデータ配列を拡張
        while (sheetData[sheet].length <= row) {
          sheetData[sheet].push([]);
        }
        while (sheetData[sheet][row].length <= col) {
          sheetData[sheet][row].push('');
        }
        sheetData[sheet][row][col] = value;
      }
    },
    
    // 数式を計算（簡易版）
    calculateFormula: (formula, cellReference) => {
      if (!formula.startsWith('=')) return formula;
      
      const expression = formula.substring(1).trim();
      
      try {
        // 単純な計算式を処理（SUM, AVERAGE, MAX, MIN）
        if (expression.toUpperCase().startsWith('SUM(') && expression.endsWith(')')) {
          return calculateSum(expression, cellReference, sheetData);
        } else if (expression.toUpperCase().startsWith('AVERAGE(') && expression.endsWith(')')) {
          return calculateAverage(expression, cellReference, sheetData);
        } else if (expression.toUpperCase().startsWith('MAX(') && expression.endsWith(')')) {
          return calculateMax(expression, cellReference, sheetData);
        } else if (expression.toUpperCase().startsWith('MIN(') && expression.endsWith(')')) {
          return calculateMin(expression, cellReference, sheetData);
        }
        
        // 単純な四則演算を評価
        return evaluateSimpleExpression(expression, cellReference, sheetData);
      } catch (error) {
        console.error('数式計算エラー:', error);
        return '#ERROR!';
      }
    },
    
    // バッチ処理
    batch: (callback) => {
      callback();
    },
    
    // シートの値を取得
    getSheetValues: (sheetName) => {
      return sheets.includes(sheetName) ? sheetData[sheetName] : [[]];
    },
    
    // クリーンアップ
    destroy: () => {
      sheetData = {};
      sheets = [];
    },
    
    // ダミーエンジンであることを示すフラグ
    isDummy: true
  };
}

/**
 * 単純な四則演算式を評価する
 * @param {string} expression 式
 * @param {Object} cellReference セル参照
 * @param {Object} sheetData シートデータ
 * @returns {number} 計算結果
 */
function evaluateSimpleExpression(expression, cellReference, sheetData) {
  // セル参照を値に置換
  const replacedExpression = replaceReferences(expression, cellReference, sheetData);
  
  // 安全でない方法だが、簡単な四則演算のためのサンプル実装
  try {
    // eslint-disable-next-line no-new-func
    return Function(`"use strict"; return (${replacedExpression})`)();
  } catch (error) {
    console.error('式の評価エラー:', error);
    return '#ERROR!';
  }
}

/**
 * 式内のセル参照を実際の値に置換する
 * @param {string} expression 式
 * @param {Object} cellReference 現在のセル参照
 * @param {Object} sheetData シートデータ
 * @returns {string} 置換後の式
 */
function replaceReferences(expression, cellReference, sheetData) {
  // 単一セル参照の正規表現 (例: A1, $B$2, Sheet1!C3)
  const cellRefRegex = /([A-Za-z0-9_]+!)?(\$?[A-Za-z]+)(\$?[0-9]+)/g;
  
  // 範囲参照の正規表現 (例: A1:B2, $C$3:$D$4, Sheet1!E5:F6)
  const rangeRefRegex = /([A-Za-z0-9_]+!)?(\$?[A-Za-z]+)(\$?[0-9]+):(\$?[A-Za-z]+)(\$?[0-9]+)/g;
  
  let result = expression;
  
  // まず範囲参照を処理
  result = result.replace(rangeRefRegex, (match, sheetPrefix, startCol, startRow, endCol, endRow) => {
    try {
      const sheet = sheetPrefix ? sheetPrefix.slice(0, -1) : cellReference.sheet;
      
      // 列文字を数値に変換 (A->0, B->1, ...)
      const startColIndex = letterToIndex(startCol.replace('$', ''));
      const endColIndex = letterToIndex(endCol.replace('$', ''));
      
      // 行番号を0ベースのインデックスに変換
      const startRowIndex = parseInt(startRow.replace('$', ''), 10) - 1;
      const endRowIndex = parseInt(endRow.replace('$', ''), 10) - 1;
      
      // 範囲内のすべての値を取得
      const values = [];
      for (let row = startRowIndex; row <= endRowIndex; row++) {
        for (let col = startColIndex; col <= endColIndex; col++) {
          if (sheetData[sheet] && 
              sheetData[sheet][row] && 
              sheetData[sheet][row][col] !== undefined) {
            const cellValue = sheetData[sheet][row][col];
            if (cellValue !== '' && !isNaN(Number(cellValue))) {
              values.push(Number(cellValue));
            }
          }
        }
      }
      
      // 配列を返す（関数内で処理されることを想定）
      return JSON.stringify(values);
    } catch (error) {
      console.error('範囲参照の処理エラー:', error);
      return 'null';
    }
  });
  
  // 次に単一セル参照を処理
  result = result.replace(cellRefRegex, (match, sheetPrefix, col, row) => {
    try {
      // 範囲参照の一部で既に処理された場合はスキップ
      if (result.includes(`"${match}"`)) return match;
      
      const sheet = sheetPrefix ? sheetPrefix.slice(0, -1) : cellReference.sheet;
      
      // 列文字を数値に変換
      const colIndex = letterToIndex(col.replace('$', ''));
      
      // 行番号を0ベースのインデックスに変換
      const rowIndex = parseInt(row.replace('$', ''), 10) - 1;
      
      // セルの値を取得
      if (sheetData[sheet] && 
          sheetData[sheet][rowIndex] && 
          sheetData[sheet][rowIndex][colIndex] !== undefined) {
        const cellValue = sheetData[sheet][rowIndex][colIndex];
        
        // 数値に変換可能であれば変換
        if (cellValue !== '' && !isNaN(Number(cellValue))) {
          return Number(cellValue);
        }
        
        // 文字列の場合は引用符で囲む
        if (typeof cellValue === 'string') {
          return `"${cellValue.replace(/"/g, '\\"')}"`;
        }
        
        return cellValue || 0;
      }
      
      return 0;  // 未定義のセルは0として扱う
    } catch (error) {
      console.error('セル参照の処理エラー:', error, match);
      return 0;
    }
  });
  
  return result;
}

/**
 * 列の文字表記をインデックスに変換する
 * @param {string} colStr 列の文字表記 (例: A, B, AA)
 * @returns {number} 0から始まる列インデックス
 */
function letterToIndex(colStr) {
  let result = 0;
  for (let i = 0; i < colStr.length; i++) {
    result = result * 26 + (colStr.charCodeAt(i) - 64);
  }
  return result - 1;
}

/**
 * SUM関数を計算
 * @param {string} expression SUM関数を含む式
 * @param {Object} cellReference セル参照
 * @param {Object} sheetData シートデータ
 * @returns {number} 合計値
 */
function calculateSum(expression, cellReference, sheetData) {
  // 引数の部分を抽出
  const argsMatch = /SUM\((.*)\)/i.exec(expression);
  if (!argsMatch) return '#ERROR!';
  
  // 引数を値に置換
  const replacedArgs = replaceReferences(argsMatch[1], cellReference, sheetData);
  
  try {
    // JSONとして評価
    // eslint-disable-next-line no-new-func
    const values = Function(`"use strict"; return (${replacedArgs})`)();
    
    if (Array.isArray(values)) {
      // 数値の配列の場合は合計を計算
      return values.reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0);
    } else if (typeof values === 'number') {
      // 単一の数値の場合はそのまま返す
      return values;
    }
    
    return 0;
  } catch (error) {
    console.error('SUM関数の計算エラー:', error);
    return '#ERROR!';
  }
}

/**
 * AVERAGE関数を計算
 * @param {string} expression AVERAGE関数を含む式
 * @param {Object} cellReference セル参照
 * @param {Object} sheetData シートデータ
 * @returns {number} 平均値
 */
function calculateAverage(expression, cellReference, sheetData) {
  // 引数の部分を抽出
  const argsMatch = /AVERAGE\((.*)\)/i.exec(expression);
  if (!argsMatch) return '#ERROR!';
  
  // 引数を値に置換
  const replacedArgs = replaceReferences(argsMatch[1], cellReference, sheetData);
  
  try {
    // JSONとして評価
    // eslint-disable-next-line no-new-func
    const values = Function(`"use strict"; return (${replacedArgs})`)();
    
    if (Array.isArray(values)) {
      // 数値のみをフィルタリング
      const numbers = values.filter(val => typeof val === 'number');
      if (numbers.length === 0) return 0;
      
      // 平均を計算
      const sum = numbers.reduce((acc, val) => acc + val, 0);
      return sum / numbers.length;
    } else if (typeof values === 'number') {
      // 単一の数値の場合はそのまま返す
      return values;
    }
    
    return 0;
  } catch (error) {
    console.error('AVERAGE関数の計算エラー:', error);
    return '#ERROR!';
  }
}

/**
 * MAX関数を計算
 * @param {string} expression MAX関数を含む式
 * @param {Object} cellReference セル参照
 * @param {Object} sheetData シートデータ
 * @returns {number} 最大値
 */
function calculateMax(expression, cellReference, sheetData) {
  // 引数の部分を抽出
  const argsMatch = /MAX\((.*)\)/i.exec(expression);
  if (!argsMatch) return '#ERROR!';
  
  // 引数を値に置換
  const replacedArgs = replaceReferences(argsMatch[1], cellReference, sheetData);
  
  try {
    // JSONとして評価
    // eslint-disable-next-line no-new-func
    const values = Function(`"use strict"; return (${replacedArgs})`)();
    
    if (Array.isArray(values)) {
      // 数値のみをフィルタリング
      const numbers = values.filter(val => typeof val === 'number');
      if (numbers.length === 0) return 0;
      
      // 最大値を計算
      return Math.max(...numbers);
    } else if (typeof values === 'number') {
      // 単一の数値の場合はそのまま返す
      return values;
    }
    
    return 0;
  } catch (error) {
    console.error('MAX関数の計算エラー:', error);
    return '#ERROR!';
  }
}

/**
 * MIN関数を計算
 * @param {string} expression MIN関数を含む式
 * @param {Object} cellReference セル参照
 * @param {Object} sheetData シートデータ
 * @returns {number} 最小値
 */
function calculateMin(expression, cellReference, sheetData) {
  // 引数の部分を抽出
  const argsMatch = /MIN\((.*)\)/i.exec(expression);
  if (!argsMatch) return '#ERROR!';
  
  // 引数を値に置換
  const replacedArgs = replaceReferences(argsMatch[1], cellReference, sheetData);
  
  try {
    // JSONとして評価
    // eslint-disable-next-line no-new-func
    const values = Function(`"use strict"; return (${replacedArgs})`)();
    
    if (Array.isArray(values)) {
      // 数値のみをフィルタリング
      const numbers = values.filter(val => typeof val === 'number');
      if (numbers.length === 0) return 0;
      
      // 最小値を計算
      return Math.min(...numbers);
    } else if (typeof values === 'number') {
      // 単一の数値の場合はそのまま返す
      return values;
    }
    
    return 0;
  } catch (error) {
    console.error('MIN関数の計算エラー:', error);
    return '#ERROR!';
  }
}

/**
 * Handsontableのデータ変更後にHyperFormulaを更新する
 * @param {Object} hfInstance HyperFormulaインスタンス
 * @param {Array} changes Handsontableの変更情報 [[row, col, oldValue, newValue], ...]
 * @param {string} sheetName シート名
 */
export function updateHyperFormula(hfInstance, changes, sheetName = 'Sheet1') {
  if (!hfInstance || !changes || changes.length === 0) return;
  
  try {
    // バッチ操作開始
    hfInstance.batch(() => {
      changes.forEach(([row, col, oldValue, newValue]) => {
        // 変更がない場合はスキップ
        if (oldValue === newValue) return;
        
        // HyperFormulaのセルを更新
        try {
          hfInstance.setCellContents(
            { sheet: sheetName, row, col },
            newValue === null || newValue === undefined ? '' : newValue
          );
        } catch (error) {
          console.warn(`セル [${row}, ${col}] の更新エラー:`, error);
        }
      });
    });
  } catch (error) {
    console.error('HyperFormula更新エラー:', error);
  }
}

/**
 * セルアドレスから参照表記に変換する
 * @param {number} row 行インデックス (0から始まる)
 * @param {number} col 列インデックス (0から始まる)
 * @param {boolean} absolute 絶対参照かどうか
 * @param {string} sheetName シート名
 * @returns {string} セル参照 (例: 'A1', '$A$1', 'Sheet1!A1')
 */
export function cellToReference(row, col, absolute = false, sheetName = null) {
  // 列インデックスをアルファベットに変換
  let colRef = '';
  let tempCol = col;
  
  do {
    const remainder = tempCol % 26;
    colRef = String.fromCharCode(65 + remainder) + colRef;
    tempCol = Math.floor(tempCol / 26) - 1;
  } while (tempCol >= 0);
  
  // 絶対参照の場合は$記号を追加
  const colPrefix = absolute ? '$' : '';
  const rowPrefix = absolute ? '$' : '';
  
  // 行番号は1から始まる
  const rowRef = rowPrefix + (row + 1);
  const cellRef = colPrefix + colRef + rowRef;
  
  // シート名がある場合は追加
  return sheetName ? `${sheetName}!${cellRef}` : cellRef;
}

/**
 * よく使う関数の一覧を取得する
 * @returns {Array} 関数一覧 [{name, description, example}, ...]
 */
export function getCommonFormulas() {
  return [
    {
      name: 'SUM',
      description: '指定した範囲の合計を計算します',
      example: '=SUM(A1:A5)'
    },
    {
      name: 'AVERAGE',
      description: '指定した範囲の平均を計算します',
      example: '=AVERAGE(A1:A5)'
    },
    {
      name: 'COUNT',
      description: '指定した範囲内の数値の個数をカウントします',
      example: '=COUNT(A1:A5)'
    },
    {
      name: 'MAX',
      description: '指定した範囲内の最大値を返します',
      example: '=MAX(A1:A5)'
    },
    {
      name: 'MIN',
      description: '指定した範囲内の最小値を返します',
      example: '=MIN(A1:A5)'
    },
    {
      name: 'IF',
      description: '条件に応じて異なる値を返します',
      example: '=IF(A1>10, "大きい", "小さい")'
    },
    {
      name: 'CONCATENATE',
      description: '文字列を結合します',
      example: '=CONCATENATE(A1, " ", A2)'
    },
    {
      name: 'TODAY',
      description: '現在の日付を返します',
      example: '=TODAY()'
    },
    {
      name: 'NOW',
      description: '現在の日時を返します',
      example: '=NOW()'
    },
    {
      name: 'VLOOKUP',
      description: '指定した値を検索し、対応する値を返します',
      example: '=VLOOKUP(A1, B1:C10, 2, FALSE)'
    }
  ];
}