import React, { useState, useRef, useEffect } from 'react';
import SpreadsheetEditor from './SpreadsheetEditor';
import withPlugins from './withPlugins';
import OpenFileModal from '../modals/OpenFileModal';
import SaveAsModal from '../modals/SaveAsModal';
import ConfirmDialog from '../modals/ConfirmDialog';
import { useSpreadsheet } from '../../context/SpreadsheetContext';

// オリジナルのSpreadsheetEditorをラップしてプラグイン機能を追加
const SpreadsheetEditorWithPlugins = ({ 
  pluginRegistry, 
  getExtendedMenuConfig, 
  getExtendedToolbarConfig,
  customizeCellRendering,
  setHotInstance,
  ...props 
}) => {
  const editorRef = useRef(null);
  const { state, dispatch, actionTypes } = useSpreadsheet();
  
  // モーダル制御用の状態
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showSaveAsModal, setShowSaveAsModal] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState({
    title: '',
    message: '',
    onConfirm: () => {},
    confirmButtonText: '確認'
  });
  
// setupEventListeners 内に新しいイベントリスナーを追加
useEffect(() => {
    // CSV読み込みイベント
    const handleImportCSVData = (e) => {
      const { data } = e.detail || {};
      if (data && Array.isArray(data)) {
        // Handsontableインスタンスを取得
        const hotInstance = editorRef.current?.getHotInstance();
        
        if (hotInstance) {
          // データをロード
          hotInstance.loadData(data);
          
          // 変更フラグを設定
          dispatch({ type: actionTypes.SET_MODIFIED, payload: true });
          
          // ステータスメッセージを更新
          if (editorRef.current) {
            editorRef.current.updateStatusMessage('CSVデータをインポートしました', 3000);
          }
        }
      }
    };
    
    // イベントリスナーを登録
    document.addEventListener('spreadsheet-import-csv', handleImportCSVData);
    
    // クリーンアップ
    return () => {
      document.removeEventListener('spreadsheet-import-csv', handleImportCSVData);
    };
  }, [dispatch, actionTypes]);
  
  // プラグインフックハンドラ
  const handlePluginHook = (hookName, ...args) => {
    switch (hookName) {
      case 'menu:click':
        // メニュークリックイベントをプラグインに通知
        const menuId = args[0];
        
        // 特定のメニュー項目は直接処理
        if (menuId === 'open') {
          setShowOpenModal(true);
          return true;
        }
        
        if (menuId === 'saveAs') {
          setShowSaveAsModal(true);
          return true;
        }
        
        if (menuId === 'save') {
          handleSave();
          return true;
        }
        
        if (menuId === 'importCSV') {
          document.dispatchEvent(new CustomEvent('file-import-csv'));
          return true;
        }
        
        const results = pluginRegistry.runHook('menu:click', menuId);
        return results && results.some(result => result === true);
      
      // 他のcase...
      
      default:
        return null;
    }
  };

  // エディタが初期化されたらHotTableインスタンスを設定
  const handleEditorInit = (hotInstance) => {
    if (setHotInstance) {
      setHotInstance(hotInstance);
    }
  };
  
  // メニュー項目を取得
  const getMenuItems = () => {
    // 基本メニュー
    const defaultMenuItems = [
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
          { id: 'exportCSV', label: 'CSVエクスポート' }
        ]
      },
      {
        id: 'edit',
        label: '編集',
        items: [
          { id: 'undo', label: '元に戻す' },
          { id: 'redo', label: 'やり直し' },
          { type: 'separator' },
          { id: 'cut', label: '切り取り' },
          { id: 'copy', label: 'コピー' },
          { id: 'paste', label: '貼り付け' }
        ]
      },
      {
        id: 'help',
        label: 'ヘルプ',
        items: [
          { id: 'about', label: 'バージョン情報' }
        ]
      }
    ];
    
    // プラグインによる拡張
    const config = { items: defaultMenuItems };
    const extendedConfig = getExtendedMenuConfig(config);
    return extendedConfig.items;
  };
  
  // ツールバー項目を取得
  const getToolbarItems = () => {
    // 基本ツールバー
    const defaultToolbarItems = [
      { id: 'new', tooltip: '新規作成', icon: '📄' },
      { id: 'save', tooltip: '保存', icon: '💾' },
      { id: 'open', tooltip: '開く', icon: '📂' },
      { type: 'separator' },
      { id: 'undo', tooltip: '元に戻す', icon: '↩️' },
      { id: 'redo', tooltip: 'やり直し', icon: '↪️' }
    ];
    
    // プラグインによる拡張
    const config = { items: defaultToolbarItems };
    const extendedConfig = getExtendedToolbarConfig(config);
    return extendedConfig.items;
  };
  
  // 新規ファイル作成
  const handleReset = () => {
    if (state.isModified) {
      showConfirm(
        '確認',
        '未保存の変更があります。新しいファイルを作成すると変更内容が失われます。続行しますか？',
        () => {
          if (editorRef.current) {
            editorRef.current.createNewFile();
          }
        },
        '新規作成'
      );
    } else {
      if (editorRef.current) {
        editorRef.current.createNewFile();
      }
    }
  };
  
  // ファイル保存
  const handleSave = () => {
    const { currentFilename, isModified } = state;
    
    // 現在のファイル名がある場合はそのまま保存
    if (currentFilename && currentFilename !== '新しいスプレッドシート') {
      saveToLocalStorage(currentFilename);
    } else {
      // ファイル名がない場合は「名前を付けて保存」ダイアログを表示
      setShowSaveAsModal(true);
    }
  };
  
  // 名前を付けて保存
  const handleSaveAs = (filename) => {
    saveToLocalStorage(filename);
  };
  
  // ファイルを開く
  const handleOpenFile = (filename) => {
    if (state.isModified) {
      showConfirm(
        '確認',
        '未保存の変更があります。ファイルを開くと変更内容が失われます。続行しますか？',
        () => loadFromLocalStorage(filename),
        '開く'
      );
    } else {
      loadFromLocalStorage(filename);
    }
  };
  
// CSVインポート処理
const handleImportCSV = (data) => {
  if (!data || !Array.isArray(data)) {
    alert('インポートするデータがありません');
    return;
  }
  
  // Handsontableインスタンスを取得
  const hotInstance = editorRef.current?.getHotInstance();
  
  if (hotInstance) {
    // データをロード
    hotInstance.loadData(data);
    
    // 変更フラグを設定
    dispatch({ type: actionTypes.SET_MODIFIED, payload: true });
    
    // ステータスメッセージを更新
    if (editorRef.current) {
      editorRef.current.updateStatusMessage('CSVデータをインポートしました', 3000);
    }
  }
};

// CSVエクスポート
const handleExportCSV = (hotInstance) => {
  console.log('CSV Export triggered');
  pluginRegistry.runHook('exportCSV', hotInstance);
};
  
  // ローカルストレージにデータを保存
  const saveToLocalStorage = (filename) => {
    if (!filename) return;
    
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
        dataValidations: state.dataValidations
      };
      
      // ローカルストレージに保存
      localStorage.setItem(
        `spreadsheet_${filename}`, 
        JSON.stringify(saveData)
      );
      
      // ファイル一覧を更新
      let savedFiles = [];
      try {
        savedFiles = JSON.parse(localStorage.getItem('spreadsheet_files') || '[]');
      } catch (error) {
        console.error('ファイルリスト読み込みエラー:', error);
        savedFiles = [];
      }
      
      if (!savedFiles.includes(filename)) {
        savedFiles.push(filename);
        localStorage.setItem('spreadsheet_files', JSON.stringify(savedFiles));
      }
      
      // ファイル名を更新
      dispatch({ type: actionTypes.SET_FILENAME, payload: filename });
      
      // 最終保存日時を更新
      dispatch({ 
        type: actionTypes.SET_LAST_SAVED, 
        payload: new Date().toISOString() 
      });
      
      // 変更フラグをクリア
      dispatch({ type: actionTypes.SET_MODIFIED, payload: false });
      
      console.log(`ファイル "${filename}" を保存しました`);
      
      // 成功メッセージを表示
      if (editorRef.current) {
        editorRef.current.updateStatusMessage(`ファイル "${filename}" を保存しました`, 3000);
      }
    } catch (error) {
      console.error('ファイル保存エラー:', error);
      alert('ファイルの保存中にエラーが発生しました');
    }
  };
  
  // ローカルストレージからデータを読み込む
  const loadFromLocalStorage = (filename) => {
    if (!filename) return;
    
    try {
      const savedData = localStorage.getItem(`spreadsheet_${filename}`);
      if (!savedData) {
        console.error(`ファイル "${filename}" が見つかりません`);
        alert(`ファイル "${filename}" が見つかりません`);
        return;
      }
      
      const parsedData = JSON.parse(savedData);
      
      // スプレッドシートの状態を更新
      dispatch({
        type: actionTypes.LOAD_SPREADSHEET,
        payload: {
          sheets: parsedData.sheets || ['sheet1'],
          sheetData: parsedData.sheetData || { sheet1: Array(50).fill().map(() => Array(26).fill('')) },
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
      
      // Handsontableを更新
      if (editorRef.current) {
        const hotInstance = editorRef.current.getHotInstance();
        if (hotInstance) {
          const currentSheet = parsedData.sheets ? parsedData.sheets[0] : 'sheet1';
          const sheetData = parsedData.sheetData[currentSheet] || Array(50).fill().map(() => Array(26).fill(''));
          hotInstance.loadData(sheetData);
        }
        
        editorRef.current.updateStatusMessage(`ファイル "${filename}" を読み込みました`, 3000);
      }
      
      console.log(`ファイル "${filename}" を読み込みました`);
    } catch (error) {
      console.error('ファイル読み込みエラー:', error);
      alert('ファイルの読み込み中にエラーが発生しました');
    }
  };
  
  return (
    <>
      <SpreadsheetEditor
        ref={editorRef}
        menuItems={getMenuItems()}
        toolbarItems={getToolbarItems()}
        onPluginHook={handlePluginHook}
        onHotInit={handleEditorInit}
        onReset={handleReset}
        onSave={handleSave}
        onExportCSV={handleExportCSV}
        {...props}
      />
      
      {/* ファイルを開くモーダル */}
      {showOpenModal && (
        <OpenFileModal 
          onClose={() => setShowOpenModal(false)}
          onFileOpen={handleOpenFile}
        />
      )}
      
      {/* 名前を付けて保存モーダル */}
      {showSaveAsModal && (
        <SaveAsModal 
          onClose={() => setShowSaveAsModal(false)}
          onSave={handleSaveAs}
          currentFilename={state.currentFilename}
        />
      )}
      
      {/* 確認ダイアログ */}
      {showConfirmDialog && (
        <ConfirmDialog 
          title={confirmDialogConfig.title}
          message={confirmDialogConfig.message}
          onConfirm={confirmDialogConfig.onConfirm}
          confirmButtonText={confirmDialogConfig.confirmButtonText}
          onClose={() => setShowConfirmDialog(false)}
        />
      )}
    </>
  );
};

export default withPlugins(SpreadsheetEditorWithPlugins);