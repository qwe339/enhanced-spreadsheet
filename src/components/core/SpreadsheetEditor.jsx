import React, { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { HotTable } from '@handsontable/react';
import { registerAllModules } from 'handsontable/registry';
import Handsontable from 'handsontable';
import 'handsontable/dist/handsontable.full.min.css';
import { HyperFormula } from 'hyperformula';

// コンテキスト
import { useSpreadsheet } from '../../context/SpreadsheetContext';

// カスタムフック
import useSpreadsheetData from '../../hooks/useSpreadsheetData';
import useUndoRedo from '../../hooks/useUndoRedo';
import useCellFormatting from '../../hooks/useCellFormatting';
import useFileImportExport from '../../hooks/useFileImportExport';
import useCellFeatures from '../../hooks/useCellFeatures';
import useCharts from '../../hooks/useCharts';

// コンポーネント
import MenuBar from './MenuBar';
import Toolbar from './Toolbar';
import FormulaBar from './FormulaBar';
import SheetTabs from './SheetTabs';
import StatusBar from './StatusBar';

// ユーティリティ
import { 
  numToLetter, 
  indicesToCellAddress, 
  getRangeAddress, 
  isNumeric 
} from '../../utils/cellUtils';

// CSSスタイル
import '../../styles/SpreadsheetEditor.css';

// すべてのHandsontableモジュールを登録
registerAllModules();

/**
 * スプレッドシートエディタのメインコンポーネント
 */
const SpreadsheetEditor = () => {
  // Handsontableの参照
  const hotRef = useRef(null);

  // コンテキストとカスタムフック
  const { state, dispatch, actionTypes } = useSpreadsheet();
  const spreadsheetData = useSpreadsheetData();
  const undoRedo = useUndoRedo();
  const cellFormatting = useCellFormatting();
  const fileIO = useFileImportExport();
  const cellFeatures = useCellFeatures();
  const charts = useCharts();
  
  // UI状態
  const [isFormulaEditing, setIsFormulaEditing] = useState(false);
  const [showModals, setShowModals] = useState({
    about: false,
    chart: false,
    conditionalFormat: false,
    csvImport: false,
    dataValidation: false,
    formatCell: false,
    openFile: false,
    printPreview: false,
    saveAs: false,
    search: false,
    shortcuts: false
  });

// モーダル表示状態のデバッグ
useEffect(() => {
  console.log('現在のモーダル表示状態:', showModals);
}, [showModals]);

  // スプレッドシートデータをカスタムフックから取得
  const {
    currentSheet,
    sheets,
    currentSheetData,
    selectedCell,
    selectionRange,
    cellAddress,
    formulaValue,
    statusMessage,
    selectionStats,
    isModified,
    currentFilename,
    lastSaved,
    
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
  } = spreadsheetData;
  
  // アンドゥ・リドゥ機能
  const {
    pushToUndoStack,
    undo,
    redo,
    clearUndoRedoStack
  } = undoRedo;
  
  // セルの書式設定
  const {
    applyStyleToSelection,
    applyCurrentSheetStyles,
    applyConditionalFormatting
  } = cellFormatting;
  
  // ファイル操作
  const {
    saveToLocalStorage,
    saveAs,
    loadSavedFile,
    getSavedFilesList,
    importCSV,
    importExcel,
    exportCSV,
    exportExcel
  } = fileIO;

  // HyperFormulaの初期化
useEffect(() => {
  if (!state.hyperformulaInstance) {
    try {
      // HyperFormulaインスタンスを作成
      const hfInstance = HyperFormula.buildEmpty({
        licenseKey: 'gpl-v3' // または空文字列 ''
      });
      
      // シートを明示的に作成
      // 注: setActiveSheetではなく、正しいメソッドを使用
      try {
        hfInstance.addSheet('sheet1');
        // 注: 最新のHyperFormulaではシートのアクティブ化は別のメソッドまたは
        // 不要である可能性があります
        console.log('シートが正常に作成されました');
      } catch (sheetError) {
        console.warn('シート作成の警告:', sheetError);
      }
      
      // 状態に保存
      dispatch({
        type: actionTypes.SET_HYPERFORMULA_INSTANCE,
        payload: hfInstance
      });
      
      console.log('HyperFormulaが正常に初期化されました');
    } catch (error) {
      console.error('HyperFormula初期化エラー:', error);
    }
  }
}, []);

  // ページタイトルの更新
  useEffect(() => {
    document.title = isModified 
      ? `*${currentFilename} - 拡張スプレッドシート` 
      : `${currentFilename} - 拡張スプレッドシート`;
  }, [currentFilename, isModified]);

// シート変更時の処理
useEffect(() => {
  const hot = hotRef.current?.hotInstance;
  if (hot && !hot.isDestroyed) {
    try {
      // データを読み込み
      hot.loadData(currentSheetData);
      
      // フォーミュラプラグインのシート名を更新
      if (state.hyperformulaInstance) {
        try {
          // シートが存在するか確認
          let sheetExists = false;
          
          // シートの存在確認方法を変更
          // API ドキュメントに基づいて適切なメソッドを使用
          try {
            // 方法1: getSheetId を使用
            const sheetId = state.hyperformulaInstance.getSheetId(currentSheet);
            sheetExists = sheetId !== undefined;
          } catch (e) {
            // 方法2: シート一覧を取得する方法を試す
            try {
              const sheets = state.hyperformulaInstance.getSheets();
              sheetExists = sheets.includes(currentSheet);
            } catch (e2) {
              console.warn('シート存在確認エラー:', e2);
            }
          }
          
          // シートが存在しない場合は作成
          if (!sheetExists) {
            console.log(`シート "${currentSheet}" が存在しないため作成します`);
            state.hyperformulaInstance.addSheet(currentSheet);
          }
          
          hot.updateSettings({
            formulas: {
              engine: state.hyperformulaInstance,
              sheetName: currentSheet
            }
          });
          console.log(`フォーミュラプラグインのシート名を "${currentSheet}" に更新しました`);
        } catch (err) {
          console.error('シート名更新エラー:', err);
          
          // エラーが発生した場合でもUIは壊れないように、
          // 最低限の設定を適用
          hot.updateSettings({
            formulas: {
              engine: state.hyperformulaInstance
            }
          });
        }
      }
      
      // スタイルと条件付き書式を適用
      setTimeout(() => {
        if (hot && !hot.isDestroyed) {
          if (typeof applyCurrentSheetStyles === 'function') {
            applyCurrentSheetStyles(hot);
          }
          if (typeof applyConditionalFormatting === 'function') {
            applyConditionalFormatting(hot);
          }
        }
      }, 0);
    } catch (error) {
      console.error('Handsontable更新エラー:', error);
    }
  }
}, [currentSheet, currentSheetData, applyCurrentSheetStyles, applyConditionalFormatting, state.hyperformulaInstance]);

  // セル選択時のイベントハンドラー
  const handleAfterSelectionEnd = (row, column, row2, column2) => {
    // セルアドレスを更新（例: A1）
    const colLabel = numToLetter(column);
    setCellAddress(`${colLabel}${row + 1}`);
    
    // セルの値を取得してフォーミュラバーに表示
    const hot = hotRef.current.hotInstance;
    const value = hot.getDataAtCell(row, column);
    setFormulaValue(value !== null ? String(value) : '');
    
    // 選択範囲を更新
    setSelectedCell({ row, col: column });
    setSelectionRange({ startRow: row, startCol: column, endRow: row2, endCol: column2 });
    
    // 選択範囲の統計を計算
    updateCellSelectionStats(row, column, row2, column2);
  };

  // 選択範囲の統計情報を更新
  const updateCellSelectionStats = (row, col, row2, col2) => {
    const hot = hotRef.current.hotInstance;
    const selText = `${numToLetter(col)}${row + 1}:${numToLetter(col2)}${row2 + 1}`;
    
    // 選択範囲の数値を収集
    const selectedValues = [];
    for (let r = Math.min(row, row2); r <= Math.max(row, row2); r++) {
      for (let c = Math.min(col, col2); c <= Math.max(col, col2); c++) {
        const value = hot.getDataAtCell(r, c);
        if (value !== null && value !== '' && isNumeric(value)) {
          selectedValues.push(parseFloat(value));
        }
      }
    }
    
    // 統計情報を計算
    if (selectedValues.length > 0) {
      const sum = selectedValues.reduce((a, b) => a + b, 0);
      const average = sum / selectedValues.length;
      
      updateSelectionStats({
        sum: sum.toFixed(2),
        average: average.toFixed(2),
        count: selectedValues.length,
        selection: selText
      });
    } else {
      updateSelectionStats({
        sum: '0',
        average: '0',
        count: 0,
        selection: selText
      });
    }
  };

  // 数式バーの値変更ハンドラー
  const handleFormulaInputChange = (value) => {
    setFormulaValue(value);
  };

  // 数式バーでEnterキーが押された時の処理
  const handleFormulaSubmit = () => {
    const hot = hotRef.current.hotInstance;
    if (selectedCell) {
      // 変更前の状態をアンドゥスタックに保存
      pushToUndoStack(hot);
      
      // セルの値を更新
      hot.setDataAtCell(selectedCell.row, selectedCell.col, formulaValue);
      
      // 編集モードを終了
      setIsFormulaEditing(false);
    }
  };

  // データ変更時のイベントハンドラー
  const handleAfterChange = (changes, source) => {
    if (!changes || source === 'loadData') return;
    
    const hot = hotRef.current.hotInstance;
    
    // 変更前の状態をアンドゥスタックに保存
    pushToUndoStack(hot);
    
    // シートデータを更新
    updateCurrentSheetData(hot.getData());
    
    // 変更フラグを設定
    setModified(true);
  };

  // 新規作成
  const handleNewFile = () => {
    if (isModified) {
      if (window.confirm('変更が保存されていません。新しいファイルを作成しますか？')) {
        resetSpreadsheet();
      }
    } else {
      resetSpreadsheet();
    }
  };

  // 保存
  const handleSave = () => {
    saveToLocalStorage();
  };

  // メニュー項目のクリックハンドラー
  const handleMenuItemClick = (itemId) => {
  switch (itemId) {
    case 'new':
      console.log('新規作成処理を実行中...');
      handleNewFile();
      console.log('新規作成処理完了');
      break;
    case 'open':
      console.log('ファイルを開く処理を実行中...');
      setShowModals(prev => {
        console.log('モーダル状態を更新:', {...prev, openFile: true});
        return {...prev, openFile: true};
      });
      break;
    case 'save':
      console.log('保存処理を実行中...');
      handleSave();
      console.log('保存処理完了');
      break;
    case 'saveAs':
      console.log('名前を付けて保存処理を実行中...');
      setShowModals(prev => {
        console.log('モーダル状態を更新:', {...prev, saveAs: true});
        return {...prev, saveAs: true};
      });
      break;
    case 'importCSV':
      console.log('CSVインポート処理を実行中...');
      setShowModals(prev => {
        console.log('モーダル状態を更新:', {...prev, csvImport: true});
        return {...prev, csvImport: true};
      });
      break;
    case 'importExcel':
      console.log('Excelインポート処理を実行中...');
      // ファイル選択ダイアログを表示
      break;
    case 'exportCSV':
      console.log('CSVエクスポート処理を実行中...');
      exportCSV(hotRef.current?.hotInstance);
      console.log('CSVエクスポート処理完了');
      break;
    case 'exportExcel':
      console.log('Excelエクスポート処理を実行中...');
      exportExcel(hotRef.current?.hotInstance);
      console.log('Excelエクスポート処理完了');
      break;
    // その他のケースも同様にデバッグログを追加
    default:
      console.log('未処理のメニュー項目:', itemId);
      break;
  }
};

  // Handsontableの設定
const hotSettings = {
  data: currentSheetData,
  rowHeaders: true,
  colHeaders: true,
  licenseKey: 'non-commercial-and-evaluation', // この値は問題ないようです
  contextMenu: true,
  manualColumnResize: true,
  manualRowResize: true,
  comments: true,
  // HyperFormula連携（条件付き）- sheetNameが存在するか確認
  ...(state.hyperformulaInstance ? {
    formulas: {
      engine: state.hyperformulaInstance,
      sheetName: 'sheet1' // 明示的にsheet1を指定
    }
  } : {}),
  stretchH: 'all',
  autoWrapRow: true,
  wordWrap: true,
  mergeCells: true,
  fixedRowsTop: 0,
  fixedColumnsLeft: 0,
  minSpareRows: 5,
  minSpareCols: 2,
  // イベントハンドラー
  afterSelectionEnd: handleAfterSelectionEnd,
  afterChange: handleAfterChange,
  // セルレンダラー（簡易版）
  cells: function(row, col, prop) {
    const cellProperties = {};
    return cellProperties;
  },
  className: 'htCustomStyles',
  outsideClickDeselects: false
};

  return (
    <div className="spreadsheet-container">
      <Helmet>
        <title>{isModified ? `*${currentFilename}` : currentFilename} - 拡張スプレッドシート</title>
      </Helmet>
      
      <div className="header">
        <h1>拡張スプレッドシート</h1>
        <div className="file-info">
          {currentFilename} {isModified && '*'}
          {lastSaved && (
            <span className="last-saved">
              （最終保存: {new Date(lastSaved).toLocaleString()}）
            </span>
          )}
        </div>
      </div>
      
      {/* メニューバー */}
      <MenuBar onMenuItemClick={handleMenuItemClick} />
      
      {/* ツールバー */}
      <Toolbar 
        onNew={handleNewFile}
        onSave={handleSave}
        onUndo={() => undo(hotRef.current?.hotInstance)}
        onRedo={() => redo(hotRef.current?.hotInstance)}
        onApplyBold={() => applyStyleToSelection(hotRef.current?.hotInstance, { fontWeight: 'bold' })}
        onApplyItalic={() => applyStyleToSelection(hotRef.current?.hotInstance, { fontStyle: 'italic' })}
        onApplyUnderline={() => applyStyleToSelection(hotRef.current?.hotInstance, { textDecoration: 'underline' })}
        onAlignLeft={() => applyStyleToSelection(hotRef.current?.hotInstance, { textAlign: 'left' })}
        onAlignCenter={() => applyStyleToSelection(hotRef.current?.hotInstance, { textAlign: 'center' })}
        onAlignRight={() => applyStyleToSelection(hotRef.current?.hotInstance, { textAlign: 'right' })}
      />
      
      {/* 数式バー */}
      <FormulaBar 
        cellAddress={cellAddress}
        value={formulaValue}
        onChange={handleFormulaInputChange}
        onSubmit={handleFormulaSubmit}
        onFocus={() => setIsFormulaEditing(true)}
        onBlur={() => setIsFormulaEditing(false)}
      />
      
      {/* シートタブ */}
      <SheetTabs 
        sheets={sheets}
        currentSheet={currentSheet}
        onSheetChange={(sheetId) => switchToSheet(sheetId)}
        onAddSheet={() => addSheet()}
      />
      
      {/* スプレッドシート本体 */}
      <div className="spreadsheet-wrapper">
        <HotTable
          ref={hotRef}
          {...hotSettings}
        />
      </div>
      
      {/* ステータスバー */}
      <StatusBar 
        message={statusMessage}
        stats={selectionStats}
      />
      
      {/* モーダルの実装はここに追加 */}
    </div>
  );
};

export default SpreadsheetEditor;