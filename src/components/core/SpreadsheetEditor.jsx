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
  const [allSheets, setAllSheets] = useState({
    'Sheet1': createEmptyData()
  });
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
  const [cellStyles, setCellStyles] = useState({});
  const [cellFormulas, setCellFormulas] = useState({});
  
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
    
    // デバッグ用：グローバルにインスタンスを保存
    if (hotRef.current && hotRef.current.hotInstance) {
      window.__hotInstance = hotRef.current.hotInstance;
      console.log('Hot instance saved to global for debugging');
    }
    
    // 各シート用にHyperFormulaを初期化
    initializeHyperFormula();
    
    // クリーンアップ関数
    return () => {
      window.removeEventListener('resize', handleResize);
      
      // HyperFormula インスタンスをクリーンアップ
      if (hyperformulaInstance) {
        hyperformulaInstance.destroy();
      }
    };
  }, []);
  
  // HyperFormulaの初期化
  const initializeHyperFormula = () => {
    const hfInstance = createHyperFormula(allSheets[currentSheetName]);
    
    // 各シートを追加
    sheets.forEach(sheetName => {
      if (sheetName !== 'Sheet1') { // Sheet1は初期化時に作成済み
        hfInstance.addSheet(sheetName);
        hfInstance.setSheetContent(sheetName, allSheets[sheetName] || createEmptyData());
      }
    });
    
    setHyperformulaInstance(hfInstance);
  };
  
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
    // 現在のシートデータを取得
    getAllSheetData: () => allSheets,
    // シート一覧を取得
    getSheets: () => sheets,
    // 現在のシート名を取得
    getCurrentSheet: () => currentSheetName,
    // ファイル名を設定
    setFilename: (name) => setFileName(name),
    // シートを更新
    updateSheets: (newSheets) => {
      setSheets(newSheets);
      
      // 新しいシートのデータを初期化
      const newAllSheets = { ...allSheets };
      newSheets.forEach(sheet => {
        if (!newAllSheets[sheet]) {
          newAllSheets[sheet] = createEmptyData();
        }
      });
      
      setAllSheets(newAllSheets);
    },
    // 特定のシートに切り替え
    switchToSheet: (sheetName) => {
      if (sheets.includes(sheetName)) {
        handleSheetChange(sheetName);
      }
    },
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
      
      // セル内容が数式かどうかをチェック
      const cellKey = `${currentSheetName}:${row},${column}`;
      const formula = cellFormulas[cellKey];
      
      setCellValue(formula || (value !== null && value !== undefined ? String(value) : ''));
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
    const newFormulas = { ...cellFormulas };
    
    changes.forEach(([row, col, oldValue, newValue]) => {
      if (row >= 0 && col >= 0 && row < newData.length && col < newData[0].length) {
        const cellKey = `${currentSheetName}:${row},${col}`;
        
        // 数式処理
        if (typeof newValue === 'string' && newValue.startsWith('=')) {
          // 数式を保存
          newFormulas[cellKey] = newValue;
          
          if (hyperformulaInstance) {
            try {
              // 数式を評価
              const result = evaluateFormula(
                hyperformulaInstance,
                newValue,
                { sheet: currentSheetName, row, col }
              );
              
              // 表示用に結果を設定（内部では数式を保持）
              newData[row][col] = result;
              
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
            newData[row][col] = '#NO_ENGINE!';
          }
        } else {
          newData[row][col] = newValue;
          
          // 以前に数式があれば削除
          if (newFormulas[cellKey]) {
            delete newFormulas[cellKey];
          }
          
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
    
    // 現在のシートデータを更新
    setData(newData);
    setCellFormulas(newFormulas);
    
    // 全シートのデータを更新
    const updatedSheets = { ...allSheets };
    updatedSheets[currentSheetName] = newData;
    setAllSheets(updatedSheets);
    
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
  function createNewFile() {
    if (isModified) {
      const confirmed = window.confirm('保存されていない変更があります。新しいファイルを作成しますか？');
      if (!confirmed) return;
    }
    
    // 初期シートデータ
    const emptyData = createEmptyData();
    const initialSheets = { 'Sheet1': emptyData };
    
    setAllSheets(initialSheets);
    setData(emptyData);
    setFileName('新しいスプレッドシート');
    setCurrentSheetName('Sheet1');
    setSheets(['Sheet1']);
    setCellStyles({});
    setCellFormulas({});
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
  }
  
  // ファイル保存
  function saveFile() {
    setIsModified(false);
    setStatusMessage('ファイルを保存しました');
    return {
      fileName,
      currentSheet: currentSheetName,
      sheets,
      allSheets,
      cellStyles,
      cellFormulas
    };
  }
  
  // シート切り替え
  function handleSheetChange(sheetName) {
    if (!sheets.includes(sheetName) || sheetName === currentSheetName) return;
    
    // 現在のシートデータを保存
    const updatedSheets = { ...allSheets };
    updatedSheets[currentSheetName] = data;
    
    // 新しいシートに切り替え
    setCurrentSheetName(sheetName);
    setData(updatedSheets[sheetName] || createEmptyData());
    
    // ホットテーブルのデータを更新
    const hot = hotRef.current?.hotInstance;
    if (hot) {
      hot.loadData(updatedSheets[sheetName] || createEmptyData());
    }
    
    setStatusMessage(`シート "${sheetName}" に切り替えました`);
  }
  
  // シート追加
  function handleAddSheet() {
    const newSheetName = `Sheet${sheets.length + 1}`;
    const newSheets = [...sheets, newSheetName];
    setSheets(newSheets);
    
    // 新しいシートのデータを初期化
    const updatedSheets = { ...allSheets };
    updatedSheets[newSheetName] = createEmptyData();
    setAllSheets(updatedSheets);
    
    // 新しいシートに切り替え
    setCurrentSheetName(newSheetName);
    setData(updatedSheets[newSheetName]);
    
    // ホットテーブルのデータを更新
    const hot = hotRef.current?.hotInstance;
    if (hot) {
      hot.loadData(updatedSheets[newSheetName]);
    }
    
    // HyperFormulaにシートを追加
    if (hyperformulaInstance) {
      hyperformulaInstance.addSheet(newSheetName);
    }
    
    setIsModified(true);
    setStatusMessage(`シート "${newSheetName}" を追加しました`);
  }
  
  // シート名変更
  function handleRenameSheet(oldName, newName) {
    if (!sheets.includes(oldName) || sheets.includes(newName)) return;
    
    const sheetIndex = sheets.indexOf(oldName);
    const newSheets = [...sheets];
    newSheets[sheetIndex] = newName;
    
    // シートデータをコピー
    const updatedSheets = { ...allSheets };
    updatedSheets[newName] = updatedSheets[oldName];
    delete updatedSheets[oldName];
    
    // セルスタイルとフォーミュラを更新
    const newStyles = {};
    const newFormulas = {};
    
    Object.keys(cellStyles).forEach(key => {
      if (key.startsWith(`${oldName}:`)) {
        const newKey = key.replace(`${oldName}:`, `${newName}:`);
        newStyles[newKey] = cellStyles[key];
      } else {
        newStyles[key] = cellStyles[key];
      }
    });
    
    Object.keys(cellFormulas).forEach(key => {
      if (key.startsWith(`${oldName}:`)) {
        const newKey = key.replace(`${oldName}:`, `${newName}:`);
        newFormulas[newKey] = cellFormulas[key];
      } else {
        newFormulas[key] = cellFormulas[key];
      }
    });
    
    // 状態を更新
    setSheets(newSheets);
    setAllSheets(updatedSheets);
    setCellStyles(newStyles);
    setCellFormulas(newFormulas);
    
    // 現在のシートが名前変更対象だった場合
    if (currentSheetName === oldName) {
      setCurrentSheetName(newName);
    }
    
    // HyperFormulaの更新（シート名変更はサポートされていないので再作成）
    if (hyperformulaInstance) {
      hyperformulaInstance.destroy();
      initializeHyperFormula();
    }
    
    setIsModified(true);
    setStatusMessage(`シート名を "${oldName}" から "${newName}" に変更しました`);
  }
  
  // シート削除
  function handleDeleteSheet(sheetName) {
    if (!sheets.includes(sheetName) || sheets.length <= 1) return;
    
    // 削除するシートが現在のシートかチェック
    if (currentSheetName === sheetName) {
      // 別のシートに切り替え
      const nextSheet = sheets.find(s => s !== sheetName) || 'Sheet1';
      handleSheetChange(nextSheet);
    }
    
    // シートリストから削除
    const newSheets = sheets.filter(s => s !== sheetName);
    setSheets(newSheets);
    
    // シートデータの削除
    const updatedSheets = { ...allSheets };
    delete updatedSheets[sheetName];
    setAllSheets(updatedSheets);
    
    // シートに関連するセルスタイルとフォーミュラを削除
    const newStyles = {};
    const newFormulas = {};
    
    Object.keys(cellStyles).forEach(key => {
      if (!key.startsWith(`${sheetName}:`)) {
        newStyles[key] = cellStyles[key];
      }
    });
    
    Object.keys(cellFormulas).forEach(key => {
      if (!key.startsWith(`${sheetName}:`)) {
        newFormulas[key] = cellFormulas[key];
      }
    });
    
    setCellStyles(newStyles);
    setCellFormulas(newFormulas);
    
    // HyperFormulaからシートを削除
    if (hyperformulaInstance) {
      try {
        hyperformulaInstance.removeSheet(sheetName);
      } catch (error) {
        console.error('シート削除エラー:', error);
      }
    }
    
    setIsModified(true);
    setStatusMessage(`シート "${sheetName}" を削除しました`);
  }
  
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
    
    // 全シートのデータを更新
    setData(hot.getData());
    const updatedSheets = { ...allSheets };
    updatedSheets[currentSheetName] = hot.getData();
    setAllSheets(updatedSheets);
    
    setIsModified(true);
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
    
    // 全シートのデータを更新
    setData(hot.getData());
    const updatedSheets = { ...allSheets };
    updatedSheets[currentSheetName] = hot.getData();
    setAllSheets(updatedSheets);
    
    setIsModified(true);
    setStatusMessage(`列${numToLetter(colIndex)}を挿入しました`);
  }
  
  // 行の削除
  function handleDeleteRow() {
    const hot = hotRef.current?.hotInstance;
    if (!hot) return;
    
    const selectedRanges = hot.getSelected();
    if (!selectedRanges || selectedRanges.length === 0) return;
    
    // 最初の選択範囲を使用
    const [startRow, startCol, endRow, endCol] = selectedRanges[0];
    const rowStart = Math.min(startRow, endRow);
    const rowEnd = Math.max(startRow, endRow);
    const rowCount = rowEnd - rowStart + 1;
    
    hot.alter('remove_row', rowStart, rowCount);
    
    // 全シートのデータを更新
    setData(hot.getData());
    const updatedSheets = { ...allSheets };
    updatedSheets[currentSheetName] = hot.getData();
    setAllSheets(updatedSheets);
    
    setIsModified(true);
    setStatusMessage(`${rowCount}行を削除しました`);
  }
  
  // 列の削除
  function handleDeleteColumn() {
    const hot = hotRef.current?.hotInstance;
    if (!hot) return;
    
    const selectedRanges = hot.getSelected();
    if (!selectedRanges || selectedRanges.length === 0) return;
    
    // 最初の選択範囲を使用
    const [startRow, startCol, endRow, endCol] = selectedRanges[0];
    const colStart = Math.min(startCol, endCol);
    const colEnd = Math.max(startCol, endCol);
    const colCount = colEnd - colStart + 1;
    
    hot.alter('remove_col', colStart, colCount);
    
    // 全シートのデータを更新
    setData(hot.getData());
    const updatedSheets = { ...allSheets };
    updatedSheets[currentSheetName] = hot.getData();
    setAllSheets(updatedSheets);
    
    setIsModified(true);
    setStatusMessage(`${colCount}列を削除しました`);
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
        .handsontable th, .handsontable td {
          border: 1px solid #000 !important;
        }
        .handsontable .htCore th.htNoFrame, .handsontable .htCore td.htNoFrame {
          border: none !important;
        }
        .handsontable .htCore th.currentRow, .handsontable .htCore td.currentRow {
          background-color: transparent !important;
        }
        .handsontable .htCore th.currentCol, .handsontable .htCore td.currentCol {
          background-color: transparent !important;
        }
        /* シート名とファイル名を印刷用に追加 */
        .spreadsheet-grid-container::before {
          content: "${fileName} - ${currentSheetName}";
          visibility: visible;
          display: block;
          text-align: center;
          font-size: 14pt;
          margin-bottom: 10px;
        }
        /* ページ設定 */
        @page {
          size: landscape;
          margin: 1cm;
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
    const hot = hotRef.current?.hotInstance;
    if (!hot) return;
    
    const selectedRanges = hot.getSelected();
    if (!selectedRanges || selectedRanges.length === 0) {
      setStatusMessage('適用するセルを選択してください');
      return;
    }
    
    // 新しいスタイル情報
    const newStyles = { ...cellStyles };
    
    // 各選択範囲に書式を適用
    for (const range of selectedRanges) {
      const [startRow, startCol, endRow, endCol] = range;
      const rowStart = Math.min(startRow, endRow);
      const rowEnd = Math.max(startRow, endRow);
      const colStart = Math.min(startCol, endCol);
      const colEnd = Math.max(startCol, endCol);
      
      // 範囲内の各セルに書式を適用
      for (let row = rowStart; row <= rowEnd; row++) {
        for (let col = colStart; col <= colEnd; col++) {
          const cellKey = `${currentSheetName}:${row},${col}`;
          const currentStyle = newStyles[cellKey] || {};
          
          // 書式タイプに応じて更新
          switch (format) {
            case 'bold':
              currentStyle.fontWeight = currentStyle.fontWeight === 'bold' ? 'normal' : 'bold';
              break;
            case 'italic':
              currentStyle.fontStyle = currentStyle.fontStyle === 'italic' ? 'normal' : 'italic';
              break;
            case 'underline':
              currentStyle.textDecoration = currentStyle.textDecoration === 'underline' ? 'none' : 'underline';
              break;
            case 'align':
              currentStyle.textAlign = value;
              break;
            case 'fontSize':
              currentStyle.fontSize = value;
              break;
            case 'color':
              currentStyle.color = value;
              break;
            case 'backgroundColor':
              currentStyle.backgroundColor = value;
              break;
            default:
              console.warn(`未対応の書式: ${format}`);
              break;
          }
          
          // 空のスタイルは削除、そうでなければ更新
          if (Object.keys(currentStyle).length === 0) {
            delete newStyles[cellKey];
          } else {
            newStyles[cellKey] = currentStyle;
          }
        }
      }
    }
    
    // スタイルを更新
    setCellStyles(newStyles);
    
    // セルをレンダリングし直す
    hot.render();
    
    setIsModified(true);
    setStatusMessage('書式を適用しました');
    
    // プラグインフックを実行（オプション）
    if (props.onPluginHook) {
      props.onPluginHook('format:apply', { format, value });
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
      case 'deleteRow':
        handleDeleteRow();
        break;
      case 'deleteColumn':
        handleDeleteColumn();
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
  
  // セルのスタイルを適用
  const getCellProperties = (row, col) => {
    // セルキー
    const cellKey = `${currentSheetName}:${row},${col}`;
    const style = cellStyles[cellKey];
    
    if (!style) return null;
    
    // Handsontableに適用するプロパティ
    const properties = {};
    
    // スタイルプロパティの変換
    if (style.fontWeight) properties.fontWeight = style.fontWeight;
    if (style.fontStyle) properties.fontStyle = style.fontStyle;
    if (style.textDecoration) properties.textDecoration = style.textDecoration;
    if (style.textAlign) properties.textAlign = style.textAlign;
    if (style.fontSize) properties.fontSize = style.fontSize;
    if (style.color) properties.color = style.color;
    if (style.backgroundColor) properties.backgroundColor = style.backgroundColor;
    
    // クラス名の生成
    let className = '';
    if (style.fontWeight === 'bold') className += ' font-bold';
    if (style.fontStyle === 'italic') className += ' font-italic';
    if (style.textDecoration === 'underline') className += ' text-underline';
    if (style.textAlign) className += ` text-${style.textAlign}`;
    if (style.fontSize) className += ` text-${style.fontSize}`;
    
    if (className) properties.className = className.trim();
    
    return properties;
  };
  
  // プラグインによるセルプロパティのカスタマイズを追加
  const getCustomizedCellProperties = (row, col) => {
    // 基本スタイル
    const baseProps = getCellProperties(row, col) || {};
    
    // プラグインによるカスタマイズ
    if (props.onPluginHook) {
      const customProps = props.onPluginHook('cell:properties', row, col, data[row]?.[col]);
      if (customProps) {
        // クラス名の結合
        if (customProps.className && baseProps.className) {
          customProps.className = `${baseProps.className} ${customProps.className}`;
        }
        return { ...baseProps, ...customProps };
      }
    }
    
    return baseProps;
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
          cells={(row, col, prop) => getCustomizedCellProperties(row, col)}
        />
      </div>
      
      <SheetTabs 
        sheets={sheets}
        currentSheet={currentSheetName}
        onSheetChange={handleSheetChange}
        onAddSheet={handleAddSheet}
        onRenameSheet={handleRenameSheet}
        onDeleteSheet={handleDeleteSheet}
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