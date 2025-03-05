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
          licenseKey: 'non-commercial-and-evaluation'
        });
        
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
  if (hot && !hot.isDestroyed) { // インスタンスが破棄されていないことを確認
    try {
      // データを読み込み
      hot.loadData(currentSheetData);
      
      // フォーミュラプラグインのシート名を更新
      if (state.hyperformulaInstance) {
        hot.updateSettings({
          formulas: {
            engine: state.hyperformulaInstance,
            sheetName: currentSheet
          }
        });
      }
      
      // スタイルと条件付き書式を適用（非同期で処理）
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
        handleNewFile();
        break;
      case 'open':
        setShowModals(prev => ({ ...prev, openFile: true }));
        break;
      case 'save':
        handleSave();
        break;
      case 'saveAs':
        setShowModals(prev => ({ ...prev, saveAs: true }));
        break;
      case 'importCSV':
        setShowModals(prev => ({ ...prev, csvImport: true }));
        break;
      case 'importExcel':
        // ファイル選択ダイアログを表示
        break;
      case 'exportCSV':
        exportCSV(hotRef.current?.hotInstance);
        break;
      case 'exportExcel':
        exportExcel(hotRef.current?.hotInstance);
        break;
      case 'print':
        setShowModals(prev => ({ ...prev, printPreview: true }));
        break;
      case 'undo':
        undo(hotRef.current?.hotInstance);
        break;
      case 'redo':
        redo(hotRef.current?.hotInstance);
        break;
      case 'search':
        setShowModals(prev => ({ ...prev, search: true }));
        break;
      case 'formatCell':
        setShowModals(prev => ({ ...prev, formatCell: true }));
        break;
      case 'bold':
        applyStyleToSelection(hotRef.current?.hotInstance, { fontWeight: 'bold' });
        break;
      case 'italic':
        applyStyleToSelection(hotRef.current?.hotInstance, { fontStyle: 'italic' });
        break;
      case 'underline':
        applyStyleToSelection(hotRef.current?.hotInstance, { textDecoration: 'underline' });
        break;
      case 'alignLeft':
        applyStyleToSelection(hotRef.current?.hotInstance, { textAlign: 'left' });
        break;
      case 'alignCenter':
        applyStyleToSelection(hotRef.current?.hotInstance, { textAlign: 'center' });
        break;
      case 'alignRight':
        applyStyleToSelection(hotRef.current?.hotInstance, { textAlign: 'right' });
        break;
      case 'about':
        setShowModals(prev => ({ ...prev, about: true }));
        break;
      case 'shortcuts':
        setShowModals(prev => ({ ...prev, shortcuts: true }));
        break;
      default:
        break;
    }
  };

  // Handsontableの設定
  const hotSettings = {
    data: currentSheetData,
    rowHeaders: true,
    colHeaders: true,
    licenseKey: 'non-commercial-and-evaluation',
    contextMenu: true,
    manualColumnResize: true,
    manualRowResize: true,
    comments: true,
    // HyperFormula連携（条件付き）
    ...(state.hyperformulaInstance ? {
      formulas: {
        engine: state.hyperformulaInstance,
        sheetName: currentSheet
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