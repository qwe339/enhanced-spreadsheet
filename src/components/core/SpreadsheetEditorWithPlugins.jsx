import React, { useState, useRef, useEffect } from 'react';
import SpreadsheetEditor from './SpreadsheetEditor';
import withPlugins from './withPlugins';

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
  
  // プラグインフックハンドラ
  const handlePluginHook = (hookName, ...args) => {
    switch (hookName) {
      case 'menu:click':
        // メニュークリックイベントをプラグインに通知
        const menuId = args[0];
        const results = pluginRegistry.runHook('menu:click', menuId);
        return results && results.some(result => result === true);
      
      case 'toolbar:click':
        // ツールバークリックイベントをプラグインに通知
        const toolbarId = args[0];
        const toolbarResults = pluginRegistry.runHook('toolbar:click', toolbarId);
        return toolbarResults && toolbarResults.some(result => result === true);
      
      case 'cell:properties':
        // セルプロパティをカスタマイズ
        const [row, col, value] = args;
        const cellResults = pluginRegistry.runHook('cell:properties', row, col, value);
        return cellResults ? cellResults[cellResults.length - 1] : null;
      
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
    if (editorRef.current) {
      editorRef.current.createNewFile();
    }
  };
  
  // ファイル保存
  const handleSave = () => {
    if (editorRef.current) {
      editorRef.current.saveFile();
    }
  };
  
  // CSVエクスポート
  const handleExportCSV = (hotInstance) => {
    console.log('CSV Export triggered');
    pluginRegistry.runHook('exportCSV', hotInstance);
  };
  
  return (
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
  );
};

export default withPlugins(SpreadsheetEditorWithPlugins);