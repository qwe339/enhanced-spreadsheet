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

// モーダルコンポーネント
import Modal from '../modals/Modal';
import OpenFileModal from '../modals/OpenFileModal';
import SaveAsModal from '../modals/SaveAsModal';
import CSVImportModal from '../modals/CSVImportModal';

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

// 初期データの読み込みを確認するuseEffectを追加
useEffect(() => {
  console.log('初期データのロード確認');
  if (hotRef.current && hotRef.current.hotInstance) {
    const hot = hotRef.current.hotInstance;
    
    // シートデータが空の場合に初期データをセット
    if (!currentSheetData || currentSheetData.length === 0) {
      console.log('初期データがないため、空のグリッドを生成します');
      const emptyData = Array(50).fill().map(() => Array(26).fill(''));
      hot.loadData(emptyData);
    } else {
      console.log('既存データをロードします', currentSheetData);
      hot.loadData(currentSheetData);
    }
    
    // 明示的に再描画
    hot.render();
  }
}, []);

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

// 明示的なレンダリングを行う関数
const forceRenderGrid = useCallback(() => {
  console.log('グリッドの強制レンダリングを実行');
  if (hotRef.current && hotRef.current.hotInstance) {
    const hot = hotRef.current.hotInstance;
    
    // 現在のデータを取得
    const currentData = hot.getData() || Array(50).fill().map(() => Array(26).fill(''));
    
    // データを再設定して強制的に更新
    setTimeout(() => {
      hot.loadData(currentData);
      hot.render();
      console.log('グリッド再レンダリング完了');
    }, 100);
  }
}, []);

// コンポーネントマウント時に一度実行
useEffect(() => {
  console.log('コンポーネントがマウントされました');
  forceRenderGrid();
  
  // ウィンドウリサイズ時にも再レンダリング
  window.addEventListener('resize', forceRenderGrid);
  return () => {
    window.removeEventListener('resize', forceRenderGrid);
  };
}, [forceRenderGrid]);
    
    // 変更前の状態をアンドゥスタックに保存
    pushToUndoStack(hot);
    
    // シートデータを更新
    updateCurrentSheetData(hot.getData());
    
    // 変更フラグを設定
    setModified(true);
  };

  // 新規作成
const handleNewFile = () => {
  try {
    console.log('handleNewFile を実行中...');
    
    if (isModified) {
      if (window.confirm('変更が保存されていません。新しいファイルを作成しますか？')) {
        console.log('変更があるため確認後、スプレッドシートをリセットします...');
        
        // スプレッドシートをリセット
        resetSpreadsheet();
        
        // Handsontableのデータも明示的にリセット
        if (hotRef.current && hotRef.current.hotInstance) {
          const emptyData = Array(50).fill().map(() => Array(26).fill(''));
          hotRef.current.hotInstance.loadData(emptyData);
          console.log('Handsontableのデータをリセットしました');
        } else {
          console.warn('Handsontableインスタンスが利用できないため、データをリセットできません');
        }
        
        // 状態を更新
        updateStatusMessage('新しいスプレッドシートを作成しました', 3000);
        console.log('新規作成完了');
      } else {
        console.log('ユーザーがキャンセルしました');
      }
    } else {
      console.log('変更なし、スプレッドシートをリセットします...');
      
      // スプレッドシートをリセット
      resetSpreadsheet();
      
      // Handsontableのデータも明示的にリセット
      if (hotRef.current && hotRef.current.hotInstance) {
        const emptyData = Array(50).fill().map(() => Array(26).fill(''));
        hotRef.current.hotInstance.loadData(emptyData);
        console.log('Handsontableのデータをリセットしました');
      } else {
        console.warn('Handsontableインスタンスが利用できないため、データをリセットできません');
      }
      
      // 状態を更新
      updateStatusMessage('新しいスプレッドシートを作成しました', 3000);
      console.log('新規作成完了');
    }
  } catch (error) {
    console.error('新規作成エラー:', error);
    updateStatusMessage('新規作成中にエラーが発生しました', 3000);
    throw error; // 上位のエラーハンドラに伝播させる
  }
};

  // 保存
  const handleSave = () => {
    saveToLocalStorage();
  };

  // メニュー項目のクリックハンドラー
const handleMenuItemClick = (itemId) => {
  console.log(`メニュー項目 ${itemId} のクリックを処理します`);
  
  switch (itemId) {
    // ファイルメニュー
    case 'new':
      console.log('新規作成処理を実行中...');
      try {
        handleNewFile();
        console.log('新規作成処理完了');
      } catch (error) {
        console.error('新規作成エラー:', error);
        updateStatusMessage('新規作成中にエラーが発生しました', 3000);
      }
      break;
    
    case 'open':
      console.log('ファイルを開く処理を実行中...');
      try {
        setShowModals(prev => ({...prev, openFile: true}));
        console.log('ファイルを開くモーダルを表示しました');
      } catch (error) {
        console.error('モーダル表示エラー:', error);
        updateStatusMessage('ファイルを開くダイアログの表示に失敗しました', 3000);
      }
      break;
    
    case 'save':
      console.log('保存処理を実行中...');
      try {
        handleSave();
        console.log('保存処理完了');
      } catch (error) {
        console.error('保存エラー:', error);
        updateStatusMessage('保存中にエラーが発生しました', 3000);
      }
      break;
      
    case 'saveAs':
      console.log('名前を付けて保存処理を実行中...');
      try {
        setShowModals(prev => ({...prev, saveAs: true}));
        console.log('名前を付けて保存モーダルを表示しました');
      } catch (error) {
        console.error('モーダル表示エラー:', error);
        updateStatusMessage('名前を付けて保存ダイアログの表示に失敗しました', 3000);
      }
      break;
      
    case 'importCSV':
      console.log('CSVインポート処理を実行中...');
      try {
        setShowModals(prev => ({...prev, csvImport: true}));
        console.log('CSVインポートモーダルを表示しました');
      } catch (error) {
        console.error('モーダル表示エラー:', error);
        updateStatusMessage('CSVインポートダイアログの表示に失敗しました', 3000);
      }
      break;
      
    case 'importExcel':
      console.log('Excelインポート処理を実行中...');
      try {
        // ファイル選択ダイアログを表示
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xlsx,.xls';
        input.onchange = (event) => {
          const file = event.target.files[0];
          if (file) {
            try {
              // Excel機能は実装中とメッセージ表示
              updateStatusMessage('Excel機能は現在実装中です', 3000);
            } catch (error) {
              console.error('Excelインポートエラー:', error);
              updateStatusMessage('Excelファイルのインポートに失敗しました', 3000);
            }
          }
        };
        input.click();
        console.log('ファイル選択ダイアログを表示しました');
      } catch (error) {
        console.error('ファイル選択エラー:', error);
        updateStatusMessage('ファイル選択ダイアログの表示に失敗しました', 3000);
      }
      break;
      
    case 'exportCSV':
      console.log('CSVエクスポート処理を実行中...');
      try {
        if (hotRef.current && hotRef.current.hotInstance) {
          exportCSV(hotRef.current.hotInstance);
          console.log('CSVエクスポート処理完了');
        } else {
          throw new Error('Handsontableインスタンスが利用できません');
        }
      } catch (error) {
        console.error('CSVエクスポートエラー:', error);
        updateStatusMessage('CSVエクスポート中にエラーが発生しました', 3000);
      }
      break;
      
    case 'exportExcel':
      console.log('Excelエクスポート処理を実行中...');
      try {
        if (hotRef.current && hotRef.current.hotInstance) {
          exportExcel(hotRef.current.hotInstance);
          console.log('Excelエクスポート処理完了');
        } else {
          throw new Error('Handsontableインスタンスが利用できません');
        }
      } catch (error) {
        console.error('Excelエクスポートエラー:', error);
        updateStatusMessage('Excelエクスポート中にエラーが発生しました', 3000);
      }
      break;
      
    case 'print':
      console.log('印刷処理を実行中...');
      try {
        setShowModals(prev => ({...prev, printPreview: true}));
        console.log('印刷プレビューモーダルを表示しました');
      } catch (error) {
        console.error('印刷プレビューエラー:', error);
        updateStatusMessage('印刷プレビューの表示に失敗しました', 3000);
      }
      break;
      
    // 編集メニュー
    case 'undo':
      console.log('元に戻す処理を実行中...');
      try {
        if (hotRef.current && hotRef.current.hotInstance) {
          undo(hotRef.current.hotInstance);
          console.log('元に戻す処理完了');
        } else {
          throw new Error('Handsontableインスタンスが利用できません');
        }
      } catch (error) {
        console.error('元に戻すエラー:', error);
        updateStatusMessage('元に戻す操作に失敗しました', 3000);
      }
      break;
      
    case 'redo':
      console.log('やり直し処理を実行中...');
      try {
        if (hotRef.current && hotRef.current.hotInstance) {
          redo(hotRef.current.hotInstance);
          console.log('やり直し処理完了');
        } else {
          throw new Error('Handsontableインスタンスが利用できません');
        }
      } catch (error) {
        console.error('やり直しエラー:', error);
        updateStatusMessage('やり直し操作に失敗しました', 3000);
      }
      break;
      
    case 'cut':
      console.log('切り取り処理を実行中...');
      try {
        document.execCommand('cut');
        console.log('切り取り処理完了');
      } catch (error) {
        console.error('切り取りエラー:', error);
        updateStatusMessage('切り取り操作に失敗しました', 3000);
      }
      break;
      
    case 'copy':
      console.log('コピー処理を実行中...');
      try {
        document.execCommand('copy');
        console.log('コピー処理完了');
      } catch (error) {
        console.error('コピーエラー:', error);
        updateStatusMessage('コピー操作に失敗しました', 3000);
      }
      break;
      
    case 'paste':
      console.log('貼り付け処理を実行中...');
      try {
        document.execCommand('paste');
        console.log('貼り付け処理完了');
      } catch (error) {
        console.error('貼り付けエラー:', error);
        updateStatusMessage('貼り付け操作に失敗しました。ブラウザの権限設定を確認してください。', 3000);
      }
      break;
      
    case 'search':
      console.log('検索と置換処理を実行中...');
      try {
        setShowModals(prev => ({...prev, search: true}));
        console.log('検索と置換モーダルを表示しました');
      } catch (error) {
        console.error('検索モーダル表示エラー:', error);
        updateStatusMessage('検索ダイアログの表示に失敗しました', 3000);
      }
      break;
      
    // 書式メニュー
    case 'formatCell':
      console.log('セルの書式処理を実行中...');
      try {
        setShowModals(prev => ({...prev, formatCell: true}));
        console.log('セルの書式モーダルを表示しました');
      } catch (error) {
        console.error('書式モーダル表示エラー:', error);
        updateStatusMessage('書式設定ダイアログの表示に失敗しました', 3000);
      }
      break;
      
    case 'bold':
      console.log('太字処理を実行中...');
      try {
        if (hotRef.current && hotRef.current.hotInstance) {
          applyStyleToSelection(hotRef.current.hotInstance, { fontWeight: 'bold' });
          console.log('太字処理完了');
        } else {
          throw new Error('Handsontableインスタンスが利用できません');
        }
      } catch (error) {
        console.error('太字適用エラー:', error);
        updateStatusMessage('太字の適用に失敗しました', 3000);
      }
      break;
      
    case 'italic':
      console.log('斜体処理を実行中...');
      try {
        if (hotRef.current && hotRef.current.hotInstance) {
          applyStyleToSelection(hotRef.current.hotInstance, { fontStyle: 'italic' });
          console.log('斜体処理完了');
        } else {
          throw new Error('Handsontableインスタンスが利用できません');
        }
      } catch (error) {
        console.error('斜体適用エラー:', error);
        updateStatusMessage('斜体の適用に失敗しました', 3000);
      }
      break;
      
    case 'underline':
      console.log('下線処理を実行中...');
      try {
        if (hotRef.current && hotRef.current.hotInstance) {
          applyStyleToSelection(hotRef.current.hotInstance, { textDecoration: 'underline' });
          console.log('下線処理完了');
        } else {
          throw new Error('Handsontableインスタンスが利用できません');
        }
      } catch (error) {
        console.error('下線適用エラー:', error);
        updateStatusMessage('下線の適用に失敗しました', 3000);
      }
      break;
      
    case 'alignLeft':
      console.log('左揃え処理を実行中...');
      try {
        if (hotRef.current && hotRef.current.hotInstance) {
          applyStyleToSelection(hotRef.current.hotInstance, { textAlign: 'left' });
          console.log('左揃え処理完了');
        } else {
          throw new Error('Handsontableインスタンスが利用できません');
        }
      } catch (error) {
        console.error('左揃え適用エラー:', error);
        updateStatusMessage('左揃えの適用に失敗しました', 3000);
      }
      break;
      
    case 'alignCenter':
      console.log('中央揃え処理を実行中...');
      try {
        if (hotRef.current && hotRef.current.hotInstance) {
          applyStyleToSelection(hotRef.current.hotInstance, { textAlign: 'center' });
          console.log('中央揃え処理完了');
        } else {
          throw new Error('Handsontableインスタンスが利用できません');
        }
      } catch (error) {
        console.error('中央揃え適用エラー:', error);
        updateStatusMessage('中央揃えの適用に失敗しました', 3000);
      }
      break;
      
    case 'alignRight':
      console.log('右揃え処理を実行中...');
      try {
        if (hotRef.current && hotRef.current.hotInstance) {
          applyStyleToSelection(hotRef.current.hotInstance, { textAlign: 'right' });
          console.log('右揃え処理完了');
        } else {
          throw new Error('Handsontableインスタンスが利用できません');
        }
      } catch (error) {
        console.error('右揃え適用エラー:', error);
        updateStatusMessage('右揃えの適用に失敗しました', 3000);
      }
      break;
      
    // ヘルプメニュー
    case 'about':
      console.log('バージョン情報処理を実行中...');
      try {
        setShowModals(prev => ({...prev, about: true}));
        console.log('バージョン情報モーダルを表示しました');
      } catch (error) {
        console.error('バージョン情報モーダル表示エラー:', error);
        updateStatusMessage('バージョン情報の表示に失敗しました', 3000);
      }
      break;
      
    case 'shortcuts':
      console.log('キーボードショートカット処理を実行中...');
      try {
        setShowModals(prev => ({...prev, shortcuts: true}));
        console.log('キーボードショートカットモーダルを表示しました');
      } catch (error) {
        console.error('ショートカットモーダル表示エラー:', error);
        updateStatusMessage('ショートカット一覧の表示に失敗しました', 3000);
      }
      break;
      
    default:
      console.log('未処理のメニュー項目:', itemId);
      updateStatusMessage(`未実装の機能: ${itemId}`, 3000);
      break;
  }
};

  // Handsontableの設定
const hotSettings = {
  data: currentSheetData || Array(50).fill().map(() => Array(26).fill('')),
  rowHeaders: true,
  colHeaders: (index) => numToLetter(index), // アルファベットの列ヘッダー
  licenseKey: 'non-commercial-and-evaluation',
  contextMenu: true,
  manualColumnResize: true,
  manualRowResize: true,
  comments: true,
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
  afterSelectionEnd: handleAfterSelectionEnd,
  afterChange: handleAfterChange,
  cells: function(row, col, prop) {
    return {};
  },
  className: 'htCustomStyles',
  outsideClickDeselects: false,
  renderAllRows: true,
  viewportColumnRenderingOffset: 100,
  viewportRowRenderingOffset: 100
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
<MenuBar 
  onMenuItemClick={handleMenuItemClick} 
  // menuItemsプロパティは削除
/>
      
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
    {showModals.openFile && (
      <OpenFileModal 
        onClose={() => setShowModals(prev => ({...prev, openFile: false}))}
        onFileOpen={loadSavedFile}
        savedFiles={getSavedFilesList()}
      />
    )}

    {showModals.saveAs && (
      <SaveAsModal 
        onClose={() => setShowModals(prev => ({...prev, saveAs: false}))}
        onSave={saveAs}
        currentFilename={currentFilename}
      />
    )}

    {showModals.csvImport && (
      <CSVImportModal 
        onClose={() => setShowModals(prev => ({...prev, csvImport: false}))}
        onImport={importCSV}
      />
    )}

    {showModals.about && (
      <Modal title="バージョン情報" onClose={() => setShowModals(prev => ({...prev, about: false}))}>
        <div className="modal-body">
          <p>拡張スプレッドシート バージョン 0.1.0</p>
          <p>このアプリケーションは高度なスプレッドシート機能を提供します。</p>
          <p>© 2025 拡張スプレッドシート開発チーム</p>
        </div>
        <div className="modal-footer">
          <button className="primary" onClick={() => setShowModals(prev => ({...prev, about: false}))}>閉じる</button>
        </div>
      </Modal>
    )}

    {showModals.shortcuts && (
      <Modal title="キーボードショートカット" onClose={() => setShowModals(prev => ({...prev, shortcuts: false}))}>
        <div className="modal-body">
          <table className="shortcuts-table">
            <thead>
              <tr>
                <th>ショートカット</th>
                <th>機能</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Ctrl+N</td>
                <td>新規作成</td>
              </tr>
              <tr>
                <td>Ctrl+S</td>
                <td>保存</td>
              </tr>
              <tr>
                <td>Ctrl+Z</td>
                <td>元に戻す</td>
              </tr>
              <tr>
                <td>Ctrl+Y</td>
                <td>やり直し</td>
              </tr>
              <tr>
                <td>Ctrl+B</td>
                <td>太字</td>
              </tr>
              <tr>
                <td>Ctrl+I</td>
                <td>斜体</td>
              </tr>
              <tr>
                <td>Ctrl+U</td>
                <td>下線</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="modal-footer">
          <button className="primary" onClick={() => setShowModals(prev => ({...prev, shortcuts: false}))}>閉じる</button>
        </div>
      </Modal>
    )}

// Handsontableのデバッグ
useEffect(() => {
  console.log('Handsontableインスタンスの確認');
  if (hotRef.current) {
    console.log('hotRef.current:', hotRef.current);
    if (hotRef.current.hotInstance) {
      console.log('hotInstance が存在します');
      console.log('現在のデータ:', hotRef.current.hotInstance.getData());
    } else {
      console.warn('hotInstance が存在しません');
    }
  } else {
    console.warn('hotRef.current が存在しません');
  }
}, []);

// コンポーネントマウント時に一度だけ実行
useEffect(() => {
  console.log('コンポーネントマウント時の初期化チェック');
  if (hotRef.current && hotRef.current.hotInstance) {
    console.log('Handsontableインスタンスが存在します');
    const hot = hotRef.current.hotInstance;
    
    // データが空の場合、空のグリッドを生成
    const data = hot.getData();
    if (!data || data.length === 0) {
      const emptyData = Array(50).fill().map(() => Array(26).fill(''));
      hot.loadData(emptyData);
      console.log('空のデータグリッドを生成しました');
    }
    
    // 明示的に再描画
    hot.render();
  } else {
    console.warn('Handsontableインスタンスがまだ存在しません');
  }
}, []); // 空の依存配列で一度だけ実行

    {/* 必要に応じて他のモーダルも追加 */}
  </div>
);
};

export default SpreadsheetEditor;