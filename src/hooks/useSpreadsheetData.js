import { useCallback } from 'react';
import { useSpreadsheet } from '../context/SpreadsheetContext';

/**
 * スプレッドシートのデータを管理するためのカスタムフック
 */
const useSpreadsheetData = () => {
  const { state, dispatch, actionTypes } = useSpreadsheet();
  
  /**
   * 指定されたシートをアクティブにする
   * @param {string} sheetId シートID
   */
  const switchToSheet = useCallback((sheetId) => {
    // 現在のシートと同じ場合は何もしない
    if (state.currentSheet === sheetId) return;
    
    // シートをアクティブにする
    dispatch({ type: actionTypes.SET_CURRENT_SHEET, payload: sheetId });
  }, [state.currentSheet, dispatch, actionTypes]);
  
  /**
   * 新しいシートを追加する
   * @param {string} sheetName シート名（省略するとデフォルト名）
   * @returns {string} 新しいシートのID
   */
  const addSheet = useCallback((sheetName = null) => {
    let newSheetId;
    
    if (sheetName) {
      // 名前が指定されている場合は、その名前を使用（重複チェック）
      let counter = 1;
      newSheetId = sheetName;
      
      while (state.sheets.includes(newSheetId)) {
        newSheetId = `${sheetName}(${counter})`;
        counter++;
      }
    } else {
      // 名前が指定されていない場合は自動生成
      const sheetCount = state.sheets.length;
      newSheetId = `sheet${sheetCount + 1}`;
    }
    
    dispatch({ type: actionTypes.ADD_SHEET, payload: newSheetId });
    
    // 新しいシートを作成した後、そのシートに切り替える
    dispatch({ type: actionTypes.SET_CURRENT_SHEET, payload: newSheetId });
    
    return newSheetId;
  }, [state.sheets, dispatch, actionTypes]);
  
  /**
   * シートの名前を変更する
   * @param {string} oldSheetId 変更前のシートID
   * @param {string} newSheetName 新しいシート名
   */
  const renameSheet = useCallback((oldSheetId, newSheetName) => {
    // 変更前と同じ名前の場合は何もしない
    if (oldSheetId === newSheetName) return;
    
    // 名前が重複していないか確認
    let counter = 1;
    let newSheetId = newSheetName;
    
    while (state.sheets.includes(newSheetId) && newSheetId !== oldSheetId) {
      newSheetId = `${newSheetName}(${counter})`;
      counter++;
    }
    
    dispatch({ 
      type: actionTypes.RENAME_SHEET, 
      payload: { oldSheetId, newSheetId } 
    });
  }, [state.sheets, dispatch, actionTypes]);
  
  /**
   * シートを削除する
   * @param {string} sheetId 削除するシートのID
   */
  const deleteSheet = useCallback((sheetId) => {
    // 最後のシートは削除できない
    if (state.sheets.length <= 1) {
      console.warn('最後のシートは削除できません');
      return;
    }
    
    dispatch({ type: actionTypes.DELETE_SHEET, payload: sheetId });
  }, [state.sheets, dispatch, actionTypes]);
  
  /**
   * 現在のシートのデータを更新する
   * @param {Array} data 更新後のデータ
   */
  const updateCurrentSheetData = useCallback((data) => {
    dispatch({ 
      type: actionTypes.UPDATE_SHEET_DATA, 
      payload: { sheetId: state.currentSheet, data } 
    });
  }, [state.currentSheet, dispatch, actionTypes]);
  
  /**
   * セルの選択情報を更新する
   * @param {Object} cell {row, col}
   */
  const setSelectedCell = useCallback((cell) => {
    dispatch({ type: actionTypes.SET_SELECTED_CELL, payload: cell });
  }, [dispatch, actionTypes]);
  
  /**
   * 選択範囲を更新する
   * @param {Object} range {startRow, startCol, endRow, endCol}
   */
  const setSelectionRange = useCallback((range) => {
    dispatch({ type: actionTypes.SET_SELECTION_RANGE, payload: range });
  }, [dispatch, actionTypes]);
  
  /**
   * セルアドレスを更新する
   * @param {string} address 'A1'形式のアドレス
   */
  const setCellAddress = useCallback((address) => {
    dispatch({ type: actionTypes.SET_CELL_ADDRESS, payload: address });
  }, [dispatch, actionTypes]);
  
  /**
   * 数式バーの値を更新する
   * @param {string} value 数式バーの値
   */
  const setFormulaValue = useCallback((value) => {
    dispatch({ type: actionTypes.SET_FORMULA_VALUE, payload: value });
  }, [dispatch, actionTypes]);
  
  /**
   * ステータスメッセージを更新する
   * @param {string} message メッセージ
   * @param {number} timeout ミリ秒単位のタイムアウト（0の場合は自動クリアしない）
   */
  const updateStatusMessage = useCallback((message, timeout = 3000) => {
    dispatch({ type: actionTypes.SET_STATUS_MESSAGE, payload: message });
    
    if (timeout > 0) {
      setTimeout(() => {
        dispatch({ 
          type: actionTypes.SET_STATUS_MESSAGE, 
          payload: `${state.currentSheet} アクティブ`
        });
      }, timeout);
    }
  }, [state.currentSheet, dispatch, actionTypes]);
  
  /**
   * 選択範囲の統計情報を更新する
   * @param {Object} stats {sum, average, selection}
   */
  const updateSelectionStats = useCallback((stats) => {
    dispatch({ type: actionTypes.UPDATE_SELECTION_STATS, payload: stats });
  }, [dispatch, actionTypes]);
  
  /**
   * スプレッドシートをリセットする
   */
  const resetSpreadsheet = useCallback(() => {
    dispatch({ type: actionTypes.RESET_SPREADSHEET });
  }, [dispatch, actionTypes]);
  
  /**
   * 変更フラグを設定する
   * @param {boolean} isModified 変更フラグ
   */
  const setModified = useCallback((isModified) => {
    dispatch({ type: actionTypes.SET_MODIFIED, payload: isModified });
  }, [dispatch, actionTypes]);
  
  /**
   * ファイル名を設定する
   * @param {string} filename ファイル名
   */
  const setFilename = useCallback((filename) => {
    dispatch({ type: actionTypes.SET_FILENAME, payload: filename });
  }, [dispatch, actionTypes]);
  
  /**
   * 最終保存日時を設定する
   * @param {string} timestamp ISO形式のタイムスタンプ
   */
  const setLastSaved = useCallback((timestamp) => {
    dispatch({ type: actionTypes.SET_LAST_SAVED, payload: timestamp });
  }, [dispatch, actionTypes]);

  return {
    // 状態
    currentSheet: state.currentSheet,
    sheets: state.sheets,
    currentSheetData: state.sheetData[state.currentSheet] || [],
    selectedCell: state.selectedCell,
    selectionRange: state.selectionRange,
    cellAddress: state.cellAddress,
    formulaValue: state.formulaValue,
    statusMessage: state.statusMessage,
    selectionStats: state.selectionStats,
    isModified: state.isModified,
    currentFilename: state.currentFilename,
    lastSaved: state.lastSaved,
    
    // アクション
    switchToSheet,
    addSheet,
    renameSheet,
    deleteSheet,
    updateCurrentSheetData,
    setSelectedCell,
    setSelectionRange,
    setCellAddress,
    setFormulaValue,
    updateStatusMessage,
    updateSelectionStats,
    resetSpreadsheet,
    setModified,
    setFilename,
    setLastSaved
  };
};

export default useSpreadsheetData;