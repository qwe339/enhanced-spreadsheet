// src/components/core/SpreadsheetEditor.jsx
import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { HotTable } from '@handsontable/react';
import { registerAllModules } from 'handsontable/registry';
import 'handsontable/dist/handsontable.full.min.css';

// コンポーネント
import MenuBar from './MenuBar';
import Toolbar from './Toolbar';
import FormulaBar from './FormulaBar';
import SheetTabs from './SheetTabs';
import StatusBar from './StatusBar';
import SearchReplaceModal from '../modals/SearchReplaceModal';

// ユーティリティ
import { numToLetter, indicesToCellAddress, cellAddressToIndices } from '../../utils/cellUtils';
import { createHyperFormula, evaluateFormula, updateHyperFormula } from '../../utils/formulaUtils';
import { copyToClipboard, pasteFromClipboard } from '../../utils/clipboardUtils';

// スタイル
import '../../styles/SpreadsheetEditor.css';

// Handsontableの全モジュールを登録
registerAllModules();

const SpreadsheetEditor = forwardRef((props, ref) => {
  // 初期データ（空のグリッド）
  const createEmptyData = () => Array(50).fill().map(() => Array(26).fill(''));
  
  // 状態管理
  const [data, setData] = useState(createEmptyData());
  const [selectedCell, setSelectedCell] = useState({ row: 0, col: 0 });
  const [cellValue, setCellValue] = useState('');
  const [cellAddress, setCellAddress] = useState('A1');
  const [currentSheetName, setCurrentSheetName] = useState('Sheet1');
  const [sheets, setSheets] = useState(['Sheet1']);
  const [isModified, setIsModified] = useState(false);
  const [fileName, setFileName] = useState('新しいスプレッドシート');
  const [statusMessage, setStatusMessage] = useState('準備完了');
  const [selectionStats, setSelectionStats] = useState({
    sum: '0',
    average: '0',
    count: 0,
    selection: ''
  });
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [hyperformulaInstance, setHyperformulaInstance] = useState(null);
  
  // メニュー項目
  const menuItems = [
    {
      id: 'file',
      label: 'ファイル',
      items: [
        { id: 'new', label: '新規作成' },
        { id: 'open', label: '開く...' },
        { id: 'save', label: '保存' },
        { id: 'saveAs', label: '名前を付けて保存...' },
        { type: 'separator' },
        { id: 'importCSV', label: 'CSVインポート...' },
        { id: 'exportCSV', label: 'CSVエクスポート' },
        { type: 'separator' },
        { id: 'print', label: '印刷...', action: handlePrint },
      ]
    },
    {
      id: 'edit',
      label: '編集',
      items: [
        { id: 'undo', label: '元に戻す', action: handleUndo },
        { id: 'redo', label: 'やり直し', action: handleRedo },
        { type: 'separator' },
        { id: 'cut', label: '切り取り', action: handleCut },
        { id: 'copy', label: 'コピー', action: handleCopy },
        { id: 'paste', label: '貼り付け', action: handlePaste },
        { type: 'separator' },
        { id: 'search', label: '検索と置換...', action: () => setShowSearchModal(true) }
      ]
    },
    {
      id: 'insert',
      label: '挿入',
      items: [
        { id: 'insertRow', label: '行を挿入', action: handleInsertRow },
        { id: 'insertColumn', label: '列を挿入', action: handleInsertColumn },
        { type: 'separator' },
        { id: 'insertChart', label: 'グラフ...' },
        { id: 'insertImage', label: '画像...' }
      ]
    },
    {
      id: 'data',
      label: 'データ',
      items: [
        { id: 'sort', label: '並べ替え...' },
        { id: 'filter', label: 'フィルター' },
        { type: 'separator' },
        { id: 'dataValidation', label: 'データの入力規則...' }
      ]
    },
    {
      id: 'format',
      label: '書式',
      items: [
        { id: 'formatCell', label: 'セルの書式...' },
        { type: 'separator' },
        { id: 'bold', label: '太字', action: () => applyFormat('bold') },
        { id: 'italic', label: '斜体', action: () => applyFormat('italic') },
        { id: 'underline', label: '下線', action: () => applyFormat('underline') },
        { type: 'separator' },
        { id: 'alignLeft', label: '左揃え', action: () => applyFormat('align', 'left') },
        { id: 'alignCenter', label: '中央揃え', action: () => applyFormat('align', 'center') },
        { id: 'alignRight', label: '右揃え', action: () => applyFormat('align', 'right') },
        { type: 'separator' },
        { id: 'conditionalFormat', label: '条件付き書式...' }
      ]
    },
    {
      id: 'help',
      label: 'ヘルプ',
      items: [
        { id: 'about', label: 'バージョン情報' },
        { id: 'shortcuts', label: 'キーボードショートカット' }
      ]
    }
  ];
  
  // ツールバーアイテム
  const toolbarItems = [
    { id: 'new', tooltip: '新規作成', icon: '📄' },
    { id: 'save', tooltip: '保存', icon: '💾' },
    { id: 'open', tooltip: '開く', icon: '📂' },
    { type: 'separator' },
    { id: 'undo', tooltip: '元に戻す', icon: '↩️', action: handleUndo },
    { id: 'redo', tooltip: 'やり直し', icon: '↪️', action: handleRedo },
    { type: 'separator' },
    { id: 'cut', tooltip: '切り取り', icon: '✂️', action: handleCut },
    { id: 'copy', tooltip: 'コピー', icon: '📋', action: handleCopy },
    { id: 'paste', tooltip: '貼り付け', icon: '📌', action: handlePaste },
    { type: 'separator' },
    { id: 'bold', tooltip: '太字', icon: 'B', action: () => applyFormat('bold') },
    { id: 'italic', tooltip: '斜体', icon: 'I', action: () => applyFormat('italic') },
    { id: 'underline', tooltip: '下線', icon: 'U', action: () => applyFormat('underline') },
    { type: 'separator' },
    { id: 'alignLeft', tooltip: '左揃え', icon: '⬅️', action: () => applyFormat('align', 'left') },
    { id: 'alignCenter', tooltip: '中央揃え', icon: '⬅️➡️', action: () => applyFormat('align', 'center') },
    { id: 'alignRight', tooltip: '右揃え', icon: '➡️', action: () => applyFormat('align', 'right') },
    { type: 'separator' },
    { id: 'search', tooltip: '検索と置換', icon: '🔍', action: () => setShowSearchModal(true) }
  ];
  
  // ホットテーブルへの参照
  const hotRef = useRef(null);
  
  // コンポーネントマウント時の初期化
  useEffect(() => {
    // ウィンドウリサイズ時にグリッドを再描画
    const handleResize = () => {
      if (hotRef.current && hotRef.current.hotInstance) {
        hotRef.current.hotInstance.render();
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    // HyperFormulaの初期化
    const hfInstance = createHyperFormula(data);
    setHyperformulaInstance(hfInstance);
    
    // クリーンアップ関数
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // ページタイトルの更新
  useEffect(() => {
    document.title = `${isModified ? '*' : ''}${fileName} - 拡張スプレッドシート`;
  }, [fileName, isModified]);
  
  // キーボードショートカットの設定
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrlキー + 他のキーの組み合わせ
      if (e.ctrlKey) {
        switch (e.key) {
          case 'c':
            handleCopy();
            break;
          case 'x':
            handleCut();
            break;
          case 'v':
            handlePaste();
            break;
          case 'z':
            handleUndo();
            break;
          case 'y':
            handleRedo();
            break;
          case 'f':
            e.preventDefault();
            setShowSearchModal(true);
            break;
          case 's':
            e.preventDefault();
            saveFile();
            break;
          case 'b':
            e.preventDefault();
            applyFormat('bold');
            break;
          case 'i':
            e.preventDefault();
            applyFormat('italic');
            break;
          case 'u':
            e.preventDefault();
            applyFormat('underline');
            break;
          default:
            break;
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  
  // ref経由でメソッドを公開
  useImperativeHandle(ref, () => ({
    // 新規ファイル作成
    createNewFile: createNewFile,
    // データの保存
    saveFile: saveFile,
    // データの更新
    updateStatusMessage: updateStatusMessage,
    // Handsontableインスタンスの取得
    getHotInstance: () => hotRef.current?.hotInstance,
    // HyperFormulaインスタンスの取得
    getHyperFormulaInstance: () => hyperformulaInstance,
    // プラグイン用のフック
    applyPluginHook: (hookName, ...args) => {
      if (props.onPluginHook) {
        return props.onPluginHook(hookName, ...args);
      }
      return null;
    }
  }));
  
  // セル選択時の処理
  const handleSelection = (row, column, row2, column2) => {
    // 無効な値チェック
    if (row === null || column === null) return;
    
    // セルアドレスを更新
    const colLetter = numToLetter(column);
    const address = `${colLetter}${row + 1}`;
    setCellAddress(address);
    setSelectedCell({ row, col: column });
    
    // 選択セルの値を取得
    const hot = hotRef.current?.hotInstance;
    if (hot) {
      const value = hot.getDataAtCell(row, column);
      setCellValue(value !== null && value !== undefined ? String(value) : '');
    }
    
    // 選択範囲の統計を更新
    calculateSelectionStats(row, column, row2, column2);
    
    // ステータス更新
    setStatusMessage(`選択: ${colLetter}${row + 1}:${numToLetter(column2)}${row2 + 1}`);
  };
  
  // 選択範囲の統計計算
  const calculateSelectionStats = (row, col, row2, col2) => {
    const hot = hotRef.current?.hotInstance;
    if (!hot) return;
    
    const values = [];
    const startRow = Math.min(row, row2);
    const endRow = Math.max(row, row2);
    const startCol = Math.min(col, col2);
    const endCol = Math.max(col, col2);
    
    // 選択範囲内の数値を収集
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const value = hot.getDataAtCell(r, c);
        if (value !== null && value !== '' && !isNaN(parseFloat(value))) {
          values.push(parseFloat(value));
        }
      }
    }
    
    // 統計情報を計算
    if (values.length > 0) {
      const sum = values.reduce((a, b) => a + b, 0);
      const average = sum / values.length;
      
      setSelectionStats({
        sum: sum.toFixed(2),
        average: average.toFixed(2),
        count: values.length,
        selection: `${numToLetter(col)}${row + 1}:${numToLetter(col2)}${row2 + 1}`
      });
    } else {
      setSelectionStats({
        sum: '0',
        average: '0',
        count: 0,
        selection: `${numToLetter(col)}${row + 1}:${numToLetter(col2)}${row2 + 1}`
      });
    }
  };
  
  // データ変更時の処理
  const handleDataChange = (changes, source) => {
    if (!changes || source === 'loadData') return;
    
    // データ更新
    const newData = [...data];
    changes.forEach(([row, col, oldValue, newValue]) => {
      if (row >= 0 && col >= 0 && row < newData.length && col < newData[0].length) {
        // 数式処理
        if (typeof newValue === 'string' && newValue.startsWith('=')) {
          if (hyperformulaInstance) {
            try {
              const result = evaluateFormula(
                hyperformulaInstance,
                newValue,
                { sheet: currentSheetName, row, col }
              );
              newData[row][col] = newValue; // 元の数式を保存
              
              // HyperFormulaの更新
              updateHyperFormula(
                hyperformulaInstance,
                [[row, col, oldValue, newValue]],
                currentSheetName
              );
            } catch (error) {
              console.error('数式エラー:', error);
              newData[row][col] = '#ERROR!';
            }
          } else {
            newData[row][col] = newValue;
          }
        } else {
          newData[row][col] = newValue;
          
          // HyperFormulaの更新
          if (hyperformulaInstance) {
            updateHyperFormula(
              hyperformulaInstance,
              [[row, col, oldValue, newValue]],
              currentSheetName
            );
          }
        }
        
        // デバッグ用出力
        console.log(`セル変更: [${row},${col}] ${oldValue} -> ${newValue}`);
      }
    });
    
    setData(newData);
    setIsModified(true);
    setStatusMessage('変更あり');
  };
  
  // 数式バーでの値変更
  const handleFormulaChange = (value) => {
    setCellValue(value);
  };
  
  // 数式バーで確定
  const handleFormulaSubmit = () => {
    const hot = hotRef.current?.hotInstance;
    if (!hot || !selectedCell) return;
    
    const { row, col } = selectedCell;
    console.log(`数式バーから値を設定: [${row},${col}] = "${cellValue}"`);
    hot.setDataAtCell(row, col, cellValue);
  };
  
  // 新規ファイル作成
  const createNewFile = () => {
    if (isModified) {
      const confirmed = window.confirm('保存されていない変更があります。新しいファイルを作成しますか？');
      if (!confirmed) return;
    }
    
    const emptyData = createEmptyData();
    setData(emptyData);
    setFileName('新しいスプレッドシート');
    setCurrentSheetName('Sheet1');
    setSheets(['Sheet1']);
    setIsModified(false);
    setStatusMessage('新しいファイルを作成しました');
    
    // ホットテーブルのデータを更新
    const hot = hotRef.current?.hotInstance;
    if (hot) {
      hot.loadData(emptyData);
    }
    
    // HyperFormulaの再初期化
    if (hyperformulaInstance) {
      hyperformulaInstance.destroy();
    }
    const newHfInstance = createHyperFormula(emptyData);
    setHyperformulaInstance(newHfInstance);
  };
  
  // ファイル保存（ダミー実装）
  const saveFile = () => {
    setIsModified(false);
    setStatusMessage('ファイルを保存しました');
    return {
      fileName,
      currentSheet: currentSheetName,
      sheets,
      data
    };
  };
  
  // シート切り替え
  const handleSheetChange = (sheetName) => {
    setCurrentSheetName(sheetName);
    setStatusMessage(`シート "${sheetName}" に切り替えました`);
    
    // TODO: シートデータの切り替え処理を追加
  };
  
  // シート追加
  const handleAddSheet = () => {
    const newSheetName = `Sheet${sheets.length + 1}`;
    setSheets([...sheets, newSheetName]);
    setCurrentSheetName(newSheetName);
    setStatusMessage(`シート "${newSheetName}" を追加しました`);
    
    // HyperFormulaにシートを追加
    if (hyperformulaInstance) {
      hyperformulaInstance.addSheet(newSheetName);
    }
  };
  
  // コピー機能
  async function handleCopy() {
    const hot = hotRef.current?.hotInstance;
    if (!hot) return;
    
    const selectedRanges = hot.getSelected();
    if (!selectedRanges || selectedRanges.length === 0) return;
    
    // 最初の選択範囲を使用
    const [startRow, startCol, endRow, endCol] = selectedRanges[0];
    
    // 範囲内のデータを取得
    const copiedData = [];
    for (let row = Math.min(startRow, endRow); row <= Math.max(startRow, endRow); row++) {
      const rowData = [];
      for (let col = Math.min(startCol, endCol); col <= Math.max(startCol, endCol); col++) {
        rowData.push(hot.getDataAtCell(row, col));
      }
      copiedData.push(rowData);
    }
    
    // クリップボードにコピー
    const success = await copyToClipboard(copiedData);
    
    if (success) {
      setStatusMessage('コピーしました');
    } else {
      setStatusMessage('コピーに失敗しました');
    }
  }
  
  // 切り取り機能
  async function handleCut() {
    const hot = hotRef.current?.hotInstance;
    if (!hot) return;
    
    const selectedRanges = hot.getSelected();
    if (!selectedRanges || selectedRanges.length === 0) return;
    
    // コピー処理を実行
    await handleCopy();
    
    // 選択範囲をクリア
    for (const selection of selectedRanges) {
      const [startRow, startCol, endRow, endCol] = selection;
      
      // 範囲内のデータをクリア
      const changes = [];
      for (let row = Math.min(startRow, endRow); row <= Math.max(startRow, endRow); row++) {
        for (let col = Math.min(startCol, endCol); col <= Math.max(startCol, endCol); col++) {
          changes.push([row, col, hot.getDataAtCell(row, col), '']);
        }
      }
      
      hot.setDataAtCell(changes);
    }
    
    setStatusMessage('切り取りました');
  }
  
  // 貼り付け機能
  async function handlePaste() {
    const hot = hotRef.current?.hotInstance;
    if (!hot) return;
    
    const selectedCell = hot.getSelected();
    if (!selectedCell || selectedCell.length === 0) return;
    
    try {
      // クリップボードからデータを取得
      const pastedData = await pasteFromClipboard();
      
      if (!pastedData || pastedData.length === 0) {
        setStatusMessage('貼り付けるデータがありません');
        return;
      }
      
      // 開始位置
      const [startRow, startCol] = selectedCell[0];
      
      // 変更を適用
      const changes = [];
      for (let i = 0; i < pastedData.length; i++) {
        const row = pastedData[i];
        for (let j = 0; j < row.length; j++) {
          const targetRow = startRow + i;
          const targetCol = startCol + j;
          
          // データ範囲内かチェック
          if (targetRow < hot.countRows() && targetCol < hot.countCols()) {
            changes.push([targetRow, targetCol, hot.getDataAtCell(targetRow, targetCol), row[j]]);
          }
        }
      }
      
      hot.setDataAtCell(changes);
      setStatusMessage('貼り付けました');
    } catch (error) {
      console.error('貼り付けエラー:', error);
      setStatusMessage('貼り付けに失敗しました');
    }
  }
  
  // 元に戻す処理
  function handleUndo() {
    const hot = hotRef.current?.hotInstance;
    if (hot && hot.undoRedo.isUndoAvailable()) {
      hot.undo();
      setStatusMessage('元に戻しました');
    } else {
      setStatusMessage('これ以上元に戻せません');
    }
  }
  
  // やり直し処理
  function handleRedo() {
    const hot = hotRef.current?.hotInstance;
    if (hot && hot.undoRedo.isRedoAvailable()) {
      hot.redo();
      setStatusMessage('やり直しました');
    } else {
      setStatusMessage('これ以上やり直せません');
    }
  }
  
  // 行の挿入
  function handleInsertRow() {
    const hot = hotRef.current?.hotInstance;
    if (!hot) return;
    
    const selectedRanges = hot.getSelected();
    if (!selectedRanges || selectedRanges.length === 0) return;
    
    // 最初の選択範囲を使用
    const [startRow, startCol, endRow, endCol] = selectedRanges[0];
    const rowIndex = Math.min(startRow, endRow);
    
    hot.alter('insert_row', rowIndex);
    setStatusMessage(`行${rowIndex + 1}を挿入しました`);
  }
  
  // 列の挿入
  function handleInsertColumn() {
    const hot = hotRef.current?.hotInstance;
    if (!hot) return;
    
    const selectedRanges = hot.getSelected();
    if (!selectedRanges || selectedRanges.length === 0) return;
    
    // 最初の選択範囲を使用
    const [startRow, startCol, endRow, endCol] = selectedRanges[0];
    const colIndex = Math.min(startCol, endCol);
    
    hot.alter('insert_col', colIndex);
    setStatusMessage(`列${numToLetter(colIndex)}を挿入しました`);
  }
  
  // 印刷機能
  function handlePrint() {
    const hot = hotRef.current?.hotInstance;
    if (!hot) return;
    
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
      }
    `;
    document.head.appendChild(originalStyles);
    
    // 印刷
    window.print();
    
    // スタイルを削除
    document.head.removeChild(originalStyles);
  }
  
  // 書式適用
  function applyFormat(format, value) {
    // プラグインフックを実行
    const hookResult = props.onPluginHook && props.onPluginHook('format:apply', { format, value });
    
    if (!hookResult) {
      setStatusMessage(`書式 "${format}" の適用はプラグインで処理される必要があります`);
    }
  }
  
  // ステータスメッセージを更新
  const updateStatusMessage = (message, duration = 3000) => {
    setStatusMessage(message);
    
    if (duration > 0) {
      setTimeout(() => {
        setStatusMessage('準備完了');
      }, duration);
    }
  };
  
  // 検索機能
  const handleSearch = (searchTerm, options) => {
    const hot = hotRef.current?.hotInstance;
    if (!hot || !searchTerm) return [];
    
    const { matchCase = false, wholeCell = false, jumpTo = null } = options || {};
    
    // 検索結果を格納する配列
    const results = [];
    
    // データを検索
    const rowCount = hot.countRows();
    const colCount = hot.countCols();
    
    for (let row = 0; row < rowCount; row++) {
      for (let col = 0; col < colCount; col++) {
        const cellValue = hot.getDataAtCell(row, col);
        
        if (cellValue === null || cellValue === undefined) continue;
        
        // 文字列に変換
        const cellText = String(cellValue);
        const searchText = String(searchTerm);
        
        let isMatch = false;
        
        if (wholeCell) {
          // セル全体が一致
          isMatch = matchCase 
            ? cellText === searchText
            : cellText.toLowerCase() === searchText.toLowerCase();
        } else {
          // 部分一致
          isMatch = matchCase
            ? cellText.includes(searchText)
            : cellText.toLowerCase().includes(searchText.toLowerCase());
        }
        
        if (isMatch) {
          results.push({ row, col });
        }
      }
    }
    
    // 特定の結果にジャンプする
    if (jumpTo && jumpTo.row !== undefined && jumpTo.col !== undefined) {
      hot.selectCell(jumpTo.row, jumpTo.col);
    } else if (results.length > 0) {
      // 最初の結果にジャンプ
      hot.selectCell(results[0].row, results[0].col);
    }
    
    return results;
  };
  
  // 置換機能
  const handleReplace = (searchTerm, replaceTerm, target, options) => {
    const hot = hotRef.current?.hotInstance;
    if (!hot || !searchTerm || target === undefined) return false;
    
    const { row, col } = target;
    const cellValue = hot.getDataAtCell(row, col);
    
    if (cellValue === null || cellValue === undefined) return false;
    
    const cellText = String(cellValue);
    const searchText = String(searchTerm);
    const { matchCase = false, wholeCell = false } = options || {};
    
    let newValue;
    
    if (wholeCell) {
      // セル全体が一致する場合のみ置換
      const isMatch = matchCase 
        ? cellText === searchText
        : cellText.toLowerCase() === searchText.toLowerCase();
      
      if (isMatch) {
        newValue = replaceTerm;
      } else {
        return false;
      }
    } else {
      // 部分置換
      if (matchCase) {
        newValue = cellText.replace(new RegExp(escapeRegExp(searchText), 'g'), replaceTerm);
      } else {
        newValue = cellText.replace(new RegExp(escapeRegExp(searchText), 'gi'), replaceTerm);
      }
    }
    
    if (newValue !== cellText) {
      hot.setDataAtCell(row, col, newValue);
      return true;
    }
    
    return false;
  };
  
  // 全置換機能
  const handleReplaceAll = (searchTerm, replaceTerm, options) => {
    const results = handleSearch(searchTerm, options);
    
    if (results.length === 0) return 0;
    
    let replaceCount = 0;
    
    for (const result of results) {
      const replaced = handleReplace(searchTerm, replaceTerm, result, options);
      if (replaced) {
        replaceCount++;
      }
    }
    
    return replaceCount;
  };
  
  // 正規表現のエスケープ
  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  // メニュー項目クリック
  const handleMenuItemClick = (menuId) => {
    console.log(`メニュー項目クリック: ${menuId}`);
    
    // プラグインフックの実行
    if (props.onPluginHook) {
      const handled = props.onPluginHook('menu:click', menuId);
      if (handled) return;
    }
    
    // 標準処理
    switch (menuId) {
      case 'new':
        createNewFile();
        break;
      case 'save':
        saveFile();
        break;
      case 'cut':
        handleCut();
        break;
      case 'copy':
        handleCopy();
        break;
      case 'paste':
        handlePaste();
        break;
      case 'search':
        setShowSearchModal(true);
        break;
      case 'undo':
        handleUndo();
        break;
      case 'redo':
        handleRedo();
        break;
      case 'insertRow':
        handleInsertRow();
        break;
      case 'insertColumn':
        handleInsertColumn();
        break;
      case 'print':
        handlePrint();
        break;
      case 'about':
        alert('拡張スプレッドシート Version 0.1.0\nプラグインアーキテクチャ対応版');
        break;
      default:
        setStatusMessage(`機能 "${menuId}" は実装中です`);
        break;
    }
  };
  
  // ツールバーのボタンクリック
  const handleToolbarClick = (action) => {
    console.log(`ツールバーボタンクリック: ${action}`);
    
    // プラグインフックの実行
    if (props.onPluginHook) {
      const handled = props.onPluginHook('toolbar:click', action);
      if (handled) return;
    }
    
    // 標準処理
    switch (action) {
      case 'new':
        createNewFile();
        break;
      case 'save':
        saveFile();
        break;
      case 'search':
        setShowSearchModal(true);
        break;
      case 'cut':
        handleCut();
        break;
      case 'copy':
        handleCopy();
        break;
      case 'paste':
        handlePaste();
        break;
      case 'undo':
        handleUndo();
        break;
      case 'redo':
        handleRedo();
        break;
      default:
        handleMenuItemClick(action);
        break;
    }
  };
  
  return (
    <div className="spreadsheet-editor">
      <div className="spreadsheet-header">
        <h1>拡張スプレッドシート</h1>
        <div className="file-info">
          {fileName} {isModified && '*'}
        </div>
      </div>
      
      <MenuBar 
        items={menuItems} 
        onMenuItemClick={handleMenuItemClick} 
      />
      
      <Toolbar 
        items={toolbarItems}
        onClick={handleToolbarClick}
      />
      
      <FormulaBar 
        cellAddress={cellAddress}
        value={cellValue}
        onChange={handleFormulaChange}
        onSubmit={handleFormulaSubmit}
      />
      
      <div className="spreadsheet-grid-container">
        <HotTable
          ref={hotRef}
          data={data}
          rowHeaders={true}
          colHeaders={(index) => numToLetter(index)}
          width="100%"
          height="100%"
          licenseKey="non-commercial-and-evaluation"
          stretchH="all"
          autoRowSize={false}
          autoColumnSize={false}
          rowHeights={24}
          colWidths={80}
          fixedRowsTop={0}
          fixedColumnsLeft={0}
          manualColumnResize={true}
          manualRowResize={true}
          contextMenu={true}
          minSpareCols={5}
          minSpareRows={5}
          enterBeginsEditing={true}
          selectionMode="range"
          fragmentSelection={false}
          outsideClickDeselects={false}
          className="handsontable-grid"
          afterSelectionEnd={handleSelection}
          afterChange={handleDataChange}
          undo={true}
          cells={(row, col, prop) => {
            // カスタムセルプロパティを追加
            const cellProps = {};
            
            // プラグインによるセルプロパティのカスタマイズ
            if (props.onPluginHook) {
              const customProps = props.onPluginHook('cell:properties', row, col, data[row]?.[col]);
              if (customProps) {
                Object.assign(cellProps, customProps);
              }
            }
            
            return cellProps;
          }}
        />
      </div>
      
      <SheetTabs 
        sheets={sheets}
        currentSheet={currentSheetName}
        onSheetChange={handleSheetChange}
        onAddSheet={handleAddSheet}
      />
      
      <StatusBar
        message={statusMessage}
        stats={selectionStats}
        filename={fileName}
        lastSaved={null}
        isModified={isModified}
      />
      
      {/* 検索と置換モーダル */}
      {showSearchModal && (
        <SearchReplaceModal
          onClose={() => setShowSearchModal(false)}
          onSearch={handleSearch}
          onReplace={handleReplace}
          onReplaceAll={handleReplaceAll}
        />
      )}
    </div>
  );
});

SpreadsheetEditor.displayName = 'SpreadsheetEditor';

export default SpreadsheetEditor;