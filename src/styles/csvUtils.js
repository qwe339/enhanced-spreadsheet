// src/utils/csvUtils.js
import Papa from 'papaparse';

/**
 * CSVデータをインポートする
 * @param {string} content CSVの内容
 * @param {Object} options インポートオプション
 * @returns {Promise<Array>} パース済みのデータ
 */
export async function importCSV(content, options = {}) {
  const {
    delimiter = ',',
    header = false,
    dynamicTyping = true,
    skipEmptyLines = true,
    transformHeader = null,
    complete = null,
    error = null,
    encoding = 'UTF-8',
    ...otherOptions
  } = options;
  
  return new Promise((resolve, reject) => {
    Papa.parse(content, {
      delimiter,
      header,
      dynamicTyping,
      skipEmptyLines,
      transformHeader,
      encoding,
      ...otherOptions,
      complete: (results) => {
        if (complete) complete(results);
        resolve(results.data);
      },
      error: (error) => {
        if (error) error(error);
        reject(error);
      }
    });
  });
}

/**
 * データをCSVにエクスポートする
 * @param {Array} data エクスポートするデータ
 * @param {Object} options エクスポートオプション
 * @returns {string} CSV文字列
 */
export function exportCSV(data, options = {}) {
  const {
    delimiter = ',',
    header = false,
    quotes = false,
    quoteChar = '"',
    escapeChar = '"',
    ...otherOptions
  } = options;
  
  return Papa.unparse(data, {
    delimiter,
    header,
    quotes,
    quoteChar,
    escapeChar,
    ...otherOptions
  });
}

/**
 * CSVをファイルとしてダウンロードする
 * @param {string} csvContent CSV内容
 * @param {string} filename ファイル名
 */
export function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename || 'export.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  
  link.click();
  
  document.body.removeChild(link);
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * CSVファイルを読み込む
 * @param {File} file CSVファイル
 * @param {Object} options インポートオプション
 * @returns {Promise<Array>} パース済みのデータ
 */
export function readCSVFile(file, options = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const content = e.target.result;
        const data = await importCSV(content, options);
        resolve(data);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = (error) => {
      reject(error);
    };
    
    reader.readAsText(file, options.encoding || 'UTF-8');
  });
}

/**
 * CSVのエンコーディングを検出する
 * @param {File} file CSVファイル
 * @returns {Promise<string>} 検出されたエンコーディング
 */
export async function detectCSVEncoding(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const content = new Uint8Array(e.target.result);
      
      // BOMチェック
      if (content.length >= 3 && content[0] === 0xEF && content[1] === 0xBB && content[2] === 0xBF) {
        resolve('UTF-8');
        return;
      }
      
      // 日本語環境ではShift_JISも考慮
      if (content.some(byte => byte > 0x7F)) {
        // 簡易的な判定（実際のアプリケーションではもっと堅牢な判定が必要）
        resolve('Shift_JIS');
        return;
      }
      
      // デフォルトはUTF-8
      resolve('UTF-8');
    };
    
    reader.readAsArrayBuffer(file.slice(0, 4096));
  });
}