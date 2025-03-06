import React, { useState, useRef, useEffect } from 'react';
import { HotTable } from '@handsontable/react';
import { registerAllModules } from 'handsontable/registry';
import 'handsontable/dist/handsontable.full.min.css';

// コンポーネント
import MenuBar from './MenuBar';
import Toolbar from './Toolbar';
import FormulaBar from './FormulaBar';
import SheetTabs from './SheetTabs';
import StatusBar from './StatusBar';

// スタイル
import '../../styles/SpreadsheetEditor.css';

// Handsontableの全モジュールを登録
registerAllModules();

// 列インデックスをアルファベットに変換する関数
const numToLetter = (num) => {
  let result = '';
  let temp = num;
  
  while (temp >= 0) {
    result = String.fromCharCode(65 + (temp % 26)) + result;
    temp = Math.floor(temp / 26) - 1;
  }
  
  return result;
};

const SpreadsheetEditor = () => {
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
    
    // クリーンアップ関数
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // ページタイトルの更新
  useEffect(() => {
    document.title = `${isModified ? '*' : ''}${fileName} - 拡張スプレッドシート`;
  }, [fileName, isModified]);
  
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
        newData[row][col] = newValue;
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
  };
  
  // ファイル保存（ダミー実装）
  const saveFile = () => {
    setIsModified(false);
    setStatusMessage('ファイルを保存しました');
  };
  
  // シート切り替え
  const handleSheetChange = (sheetName) => {
    setCurrentSheetName(sheetName);
    setStatusMessage(`シート "${sheetName}" に切り替えました`);
  };
  
  // シート追加
  const handleAddSheet = () => {
    const newSheetName = `Sheet${sheets.length + 1}`;
    setSheets([...sheets, newSheetName]);
    setCurrentSheetName(newSheetName);
    setStatusMessage(`シート "${newSheetName}" を追加しました`);
  };
  
  // メニュー項目クリック
  const handleMenuItemClick = (menuId) => {
    switch (menuId) {
      case 'new':
        createNewFile();
        break;
      case 'save':
        saveFile();
        break;
      case 'about':
        setStatusMessage('機能 "about" は実装中です');
        break;
      default:
        setStatusMessage(`機能 "${menuId}" は実装中です`);
        break;
    }
  };
  
  // ツールバーのボタンクリック
  const handleToolbarClick = (action) => {
    setStatusMessage(`ツールバー操作 "${action}" は実装中です`);
  };
  
  return (
    <div className="spreadsheet-editor">
      <div className="spreadsheet-header">
        <h1>拡張スプレッドシート</h1>
        <div className="file-info">
          {fileName} {isModified && '*'}
        </div>
      </div>
      
      <MenuBar onMenuItemClick={handleMenuItemClick} />
      
      <Toolbar 
        onNew={createNewFile}
        onSave={saveFile}
        onUndo={() => handleToolbarClick('undo')}
        onRedo={() => handleToolbarClick('redo')}
        onApplyBold={() => handleToolbarClick('bold')}
        onApplyItalic={() => handleToolbarClick('italic')}
        onApplyUnderline={() => handleToolbarClick('underline')}
        onAlignLeft={() => handleToolbarClick('alignLeft')}
        onAlignCenter={() => handleToolbarClick('alignCenter')}
        onAlignRight={() => handleToolbarClick('alignRight')}
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
      />
    </div>
  );
};

export default SpreadsheetEditor;