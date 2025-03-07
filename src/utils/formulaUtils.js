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
      // 言語指定を削除 - デフォルト値を使用
    };
    
    const hyperformulaOptions = {
      ...defaultOptions,
      ...options
    };
    
    // データをHyperFormula形式に変換
    const sheetData = data ? data.map(row => 
      row.map(cell => cell === null ? '' : cell)
    ) : [[]];
    
    // インスタンスを作成（言語指定なし）
    try {
      // 代替方法1：registerLanguageを使わずにビルド
      const hfInstance = HyperFormula.buildFromSheets({
        Sheet1: sheetData
      }, hyperformulaOptions);
      
      return hfInstance;
    } catch (buildError) {
      console.warn('HyperFormula buildFromSheets failed:', buildError);
      
      // 代替方法2：最小限の機能で初期化
      return {
        addSheet: () => {},
        setSheetContent: () => {},
        calculateFormula: () => '#ERROR!',
        setCellContents: () => {},
        batch: (callback) => callback(),
        getSheetValues: () => []
      };
    }
  } catch (error) {
    console.error('HyperFormula initialization error:', error);
    
    // フォールバック：ダミーオブジェクトを返す
    return {
      addSheet: () => {},
      setSheetContent: () => {},
      calculateFormula: () => '#ERROR!',
      setCellContents: () => {},
      batch: (callback) => callback(),
      getSheetValues: () => []
    };
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
        return hfInstance.calculateFormula(formula, cellReference);
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
            newValue === null ? '' : newValue
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

/**
 * 簡易的な数式計算機能
 * @param {string} formula 計算する数式
 * @param {Object} contextData 計算に使用するコンテキストデータ
 * @returns {any} 計算結果
 */
export function calculateSimpleFormula(formula, contextData = {}) {
  if (!formula || typeof formula !== 'string') return formula;
  
  // '='で始まる場合は数式
  if (!formula.startsWith('=')) return formula;
  
  // 数式から = を削除
  const expression = formula.substring(1);
  
  try {
    // セル参照を置換
    const replacedExpression = replaceReferences(expression, contextData);
    
    // JavaScriptの eval を使用した簡易計算 (実際のアプリケーションでは非推奨)
    return eval(replacedExpression);
  } catch (error) {
    console.error('数式計算エラー:', error);
    return '#ERROR!';
  }
}

/**
 * セル参照を値に置換する
 * @param {string} expression 数式
 * @param {Object} contextData コンテキストデータ
 * @returns {string} 置換後の式
 */
function replaceReferences(expression, contextData) {
  // A1形式のセル参照のパターン
  const cellPattern = /([A-Z]+)([0-9]+)/g;
  
  return expression.replace(cellPattern, (match, col, row) => {
    const colIndex = letterToNumber(col);
    const rowIndex = parseInt(row, 10) - 1;
    
    // コンテキストデータから値を取得
    if (Array.isArray(contextData) && 
        contextData[rowIndex] && 
        contextData[rowIndex][colIndex] !== undefined) {
      return contextData[rowIndex][colIndex];
    }
    
    return 0; // 見つからない場合は0を返す
  });
}

/**
 * アルファベットを数値に変換 (A→0, B→1, ...)
 * @param {string} str アルファベット
 * @returns {number} 数値
 */
function letterToNumber(str) {
  let result = 0;
  for (let i = 0; i < str.length; i++) {
    result *= 26;
    result += str.charCodeAt(i) - 'A'.charCodeAt(0) + 1;
  }
  return result - 1;
}