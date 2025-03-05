/**
 * セル操作に関するユーティリティ関数
 */

/**
 * 列インデックスをアルファベット表記に変換する (0 -> A, 1 -> B, ..., 26 -> AA)
 * @param {number} colIndex 列インデックス (0から始まる)
 * @return {string} アルファベット表記
 */
export function numToLetter(colIndex) {
  let temp, letter = '';
  while (colIndex >= 0) {
    temp = colIndex % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    colIndex = (colIndex - temp) / 26 - 1;
  }
  return letter;
}

/**
 * アルファベット表記を列インデックスに変換する (A -> 0, B -> 1, ..., AA -> 26)
 * @param {string} colLetter アルファベット表記
 * @return {number} 列インデックス
 */
export function letterToNum(colLetter) {
  let result = 0;
  for (let i = 0; i < colLetter.length; i++) {
    result *= 26;
    result += colLetter.charCodeAt(i) - 64;
  }
  return result - 1;
}

/**
 * 行と列のインデックスからセルアドレスを生成する
 * @param {number} rowIndex 行インデックス (0から始まる)
 * @param {number} colIndex 列インデックス (0から始まる)
 * @return {string} セルアドレス (例: 'A1')
 */
export function indicesToCellAddress(rowIndex, colIndex) {
  return `${numToLetter(colIndex)}${rowIndex + 1}`;
}

/**
 * セルアドレスからインデックスに変換する
 * @param {string} address セルアドレス (例: 'A1')
 * @return {Object} {row, col} 行と列のインデックス
 */
export function cellAddressToIndices(address) {
  const match = address.match(/([A-Z]+)([0-9]+)/);
  if (!match) return { row: 0, col: 0 };
  
  const colLetter = match[1];
  const rowNumber = parseInt(match[2], 10);
  
  return {
    row: rowNumber - 1,
    col: letterToNum(colLetter)
  };
}

/**
 * 選択範囲からレンジアドレスを生成する
 * @param {Object} range {startRow, startCol, endRow, endCol}
 * @return {string} レンジアドレス (例: 'A1:B2')
 */
export function getRangeAddress(range) {
  if (!range) return '';
  
  const { startRow, startCol, endRow, endCol } = range;
  return `${indicesToCellAddress(startRow, startCol)}:${indicesToCellAddress(endRow, endCol)}`;
}

/**
 * 値が数値かどうかをチェックする
 * @param {any} value チェックする値
 * @return {boolean} 数値の場合はtrue
 */
export function isNumeric(value) {
  return !isNaN(parseFloat(value)) && isFinite(value);
}