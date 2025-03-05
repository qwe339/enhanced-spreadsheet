import { useCallback } from 'react';
import { useSpreadsheet } from '../context/SpreadsheetContext';
import useSpreadsheetData from './useSpreadsheetData';
import { parse as parseCSV, unparse as unparseCSV } from 'papaparse';

/**
 * ファイルのインポート/エクスポート機能を管理するためのカスタムフック
 */
const useFileImportExport = () => {
  const { state, dispatch, actionTypes } = useSpreadsheet();
  const { 
    updateStatusMessage, 
    setModified, 
    setFilename, 
    setLastSaved,
    updateCurrentSheetData 
  } = useSpreadsheetData();
  
  /**
   * 現在のスプレッドシートをローカルストレージに保存する
   */
  const saveToLocalStorage = useCallback(() => {
    try {
      // 保存するデータを準備
      const saveData = {
        sheets: state.sheets,
        sheetData: state.sheetData,
        cellStyles: state.cellStyles,
        conditionalFormats: state.conditionalFormats,
        charts: state.charts,
        comments: state.comments,
        protectedCells: state.protectedCells,
        dataValidations: state.dataValidations,
        filename: state.currentFilename,
      };
      
      // ローカルストレージに保存
      localStorage.setItem(
        `spreadsheet_${state.currentFilename}`, 
        JSON.stringify(saveData)
      );
      
      // ファイル一覧を更新
      const savedFiles = JSON.parse(localStorage.getItem('spreadsheet_files') || '[]');
      if (!savedFiles.includes(state.currentFilename)) {
        savedFiles.push(state.currentFilename);
        localStorage.setItem('spreadsheet_files', JSON.stringify(savedFiles));
      }
      
      // 最終保存日時を更新
      const timestamp = new Date().toISOString();
      setLastSaved(timestamp);
      
      // 変更フラグをクリア
      setModified(false);
      
      updateStatusMessage('ファイルを保存しました', 3000);
    } catch (error) {
      console.error('保存エラー:', error);
      updateStatusMessage('ファイルの保存中にエラーが発生しました', 3000);
    }
  }, [state, dispatch, actionTypes, setLastSaved, setModified, updateStatusMessage]);
  
  /**
   * 名前を付けて保存
   * @param {string} filename 保存するファイル名
   */
  const saveAs = useCallback((filename) => {
    if (!filename) return;
    
    try {
      // ファイル名を更新
      setFilename(filename);
      
      // ファイルを保存
      setTimeout(() => {
        saveToLocalStorage();
      }, 0);
    } catch (error) {
      console.error('名前を付けて保存エラー:', error);
      updateStatusMessage('ファイルの保存中にエラーが発生しました', 3000);
    }
  }, [setFilename, saveToLocalStorage, updateStatusMessage]);
  
  /**
   * ローカルストレージから保存されたファイルを読み込む
   * @param {string} filename 読み込むファイル名
   */
  const loadSavedFile = useCallback((filename) => {
    if (!filename) return;
    
    try {
      // ローカルストレージからデータを取得
      const savedData = localStorage.getItem(`spreadsheet_${filename}`);
      if (!savedData) {
        updateStatusMessage(`ファイル '${filename}' が見つかりません`, 3000);
        return;
      }
      
      const parsedData = JSON.parse(savedData);
      
      // スプレッドシートの状態を更新
      dispatch({
        type: actionTypes.LOAD_SPREADSHEET,
        payload: {
          sheets: parsedData.sheets || ['sheet1'],
          sheetData: parsedData.sheetData || { 'sheet1': Array(50).fill().map(() => Array(26).fill('')) },
          cellStyles: parsedData.cellStyles || {},
          conditionalFormats: parsedData.conditionalFormats || {},
          charts: parsedData.charts || [],
          comments: parsedData.comments || {},
          protectedCells: parsedData.protectedCells || {},
          dataValidations: parsedData.dataValidations || {},
          currentSheet: parsedData.sheets ? parsedData.sheets[0] : 'sheet1',
          currentFilename: filename,
          lastSaved: new Date().toISOString()
        }
      });
      
      updateStatusMessage(`ファイル '${filename}' を読み込みました`, 3000);
    } catch (error) {
      console.error('ファイル読み込みエラー:', error);
      updateStatusMessage('ファイルの読み込み中にエラーが発生しました', 3000);
    }
  }, [dispatch, actionTypes, updateStatusMessage]);
  
  /**
   * ローカルストレージから保存されたファイル一覧を取得する
   * @returns {Array} 保存されたファイル名の配列
   */
  const getSavedFilesList = useCallback(() => {
    try {
      const savedFiles = JSON.parse(localStorage.getItem('spreadsheet_files') || '[]');
      return savedFiles;
    } catch (error) {
      console.error('ファイル一覧取得エラー:', error);
      return [];
    }
  }, []);
  
  /**
   * CSVファイルをインポートする
   * @param {string} csvContent CSVの内容
   * @param {Object} options インポートオプション
   */
  const importCSV = useCallback((csvContent, options = {}) => {
    try {
      // CSVを解析
      parseCSV(csvContent, {
        complete: (results) => {
          const { data } = results;
          if (!data || data.length === 0) {
            updateStatusMessage('CSVデータが空です', 3000);
            return;
          }
          
          // 現在のシートにデータを設定
          updateCurrentSheetData(data);
          setModified(true);
          
          updateStatusMessage('CSVをインポートしました', 3000);
        },
        error: (error) => {
          console.error('CSVインポートエラー:', error);
          updateStatusMessage('CSVのインポート中にエラーが発生しました', 3000);
        },
        ...options
      });
    } catch (error) {
      console.error('CSVインポートエラー:', error);
      updateStatusMessage('CSVのインポート中にエラーが発生しました', 3000);
    }
  }, [updateCurrentSheetData, setModified, updateStatusMessage]);
  
  /**
   * Excelファイルをインポートする (実際のところ現在はモック)
   * @param {File} file Excelファイル
   */
  const importExcel = useCallback((file) => {
    // 実際の実装では、sheetjs/xlsx などのライブラリを使用する
    updateStatusMessage('Excel機能は現在実装中です', 3000);
  }, [updateStatusMessage]);
  
  /**
   * 現在のシートをCSVとしてエクスポートする
   * @param {Object} hotInstance Handsontableインスタンス
   */
  const exportCSV = useCallback((hotInstance) => {
    if (!hotInstance) {
      updateStatusMessage('エクスポートするデータがありません', 3000);
      return;
    }
    
    try {
      // データを取得
      const data = hotInstance.getData();
      
      // CSVに変換
      const csv = unparseCSV(data);
      
      // ダウンロードリンクを作成
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${state.currentFilename}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      
      // ダウンロードを実行
      link.click();
      
      // クリーンアップ
      document.body.removeChild(link);
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);
      
      updateStatusMessage('CSVをエクスポートしました', 3000);
    } catch (error) {
      console.error('CSVエクスポートエラー:', error);
      updateStatusMessage('CSVのエクスポート中にエラーが発生しました', 3000);
    }
  }, [state.currentFilename, updateStatusMessage]);
  
  /**
   * 現在のシートをExcelとしてエクスポートする (実際のところ現在はモック)
   * @param {Object} hotInstance Handsontableインスタンス
   */
  const exportExcel = useCallback((hotInstance) => {
    // 実際の実装では、sheetjs/xlsx などのライブラリを使用する
    updateStatusMessage('Excel機能は現在実装中です', 3000);
  }, [updateStatusMessage]);
  
  return {
    saveToLocalStorage,
    saveAs,
    loadSavedFile,
    getSavedFilesList,
    importCSV,
    importExcel,
    exportCSV,
    exportExcel
  };
};

export default useFileImportExport;