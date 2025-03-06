import React, { Component } from 'react';
import pluginRegistry from '../../plugins';

// プラグインシステムをコンポーネントに接続するHOC
const withPlugins = (WrappedComponent) => {
  return class WithPlugins extends Component {
    constructor(props) {
      super(props);
      
      // ラップされたコンポーネントへの参照
      this.wrappedComponentRef = React.createRef();
      
      // イベントリスナーを追跡するための配列
      this.eventListeners = [];
      
      // Handsontableインスタンスの参照
      this.hotInstance = null;
    }
    
    componentDidMount() {
      // システムイベントリスナーを登録
      this.registerSystemEvents();
      
      // プラグインイベントリスナーを登録
      this.registerPluginEvents();
    }
    
    componentWillUnmount() {
      // 登録したすべてのイベントリスナーを解除
      this.eventListeners.forEach(({ event, handler }) => {
        document.removeEventListener(event, handler);
      });
    }
    
    // イベントリスナーを登録するヘルパーメソッド
    registerEventListener = (event, handler) => {
      document.addEventListener(event, handler);
      this.eventListeners.push({ event, handler });
    }
    
    // Handsontableインスタンスを設定
    setHotInstance = (hotInstance) => {
      this.hotInstance = hotInstance;
      console.log('Handsontable instance set in withPlugins');
    }
    
    // システム全体のイベントを登録
    registerSystemEvents = () => {
      // 新規ファイル作成
      this.registerEventListener('file-new', () => {
        console.log('Create new file event received');
        if (this.wrappedComponentRef.current) {
          this.wrappedComponentRef.current.resetSpreadsheet();
        }
      });
      
      // ファイル保存
      this.registerEventListener('file-save', () => {
        console.log('Save file event received');
        if (this.wrappedComponentRef.current) {
          // 現在のデータを取得
          const spreadsheetData = this.wrappedComponentRef.current.getCurrentData();
          
          // プラグインにデータを渡す
          pluginRegistry.runHook('file:save', spreadsheetData);
        }
      });
      
      // ファイルを開く
      this.registerEventListener('file-open', () => {
        console.log('Open file event received');
        pluginRegistry.runHook('file:open');
      });
      
      // 名前を付けて保存
      this.registerEventListener('file-save-as', () => {
        console.log('Save as event received');
        pluginRegistry.runHook('file:saveAs');
      });
      
      // CSVインポート
      this.registerEventListener('file-import-csv', () => {
        console.log('Import CSV event received');
        pluginRegistry.runHook('file:importCSV');
      });
      
      // CSVエクスポート
      this.registerEventListener('file-export-csv', () => {
        console.log('Export CSV event received');
        if (this.hotInstance) {
          pluginRegistry.runHook('file:exportCSV', this.hotInstance);
        }
      });
      
      // 書式設定関連イベント
      this.registerEventListener('format-bold', () => {
        this.applyFormatting('bold');
      });
      
      this.registerEventListener('format-italic', () => {
        this.applyFormatting('italic');
      });
      
      this.registerEventListener('format-underline', () => {
        this.applyFormatting('underline');
      });
      
      this.registerEventListener('format-align-left', () => {
        this.applyFormatting('align', 'left');
      });
      
      this.registerEventListener('format-align-center', () => {
        this.applyFormatting('align', 'center');
      });
      
      this.registerEventListener('format-align-right', () => {
        this.applyFormatting('align', 'right');
      });
      
      // スプレッドシートデータの読み込み
      this.registerEventListener('spreadsheet-load-data', (e) => {
        const { data } = e.detail;
        console.log('Load data event received', data);
        
        if (this.wrappedComponentRef.current && data) {
          this.wrappedComponentRef.current.setSpreadsheetData(data);
        }
      });
    }
    
    // プラグイン特有のイベントを登録
    registerPluginEvents = () => {
      // プラグインリストをループ
      Object.values(pluginRegistry.plugins)
        .filter(plugin => plugin.enabled)
        .forEach(plugin => {
          // プラグイン定義からイベントリスナーを登録
          if (plugin.definition.events) {
            Object.entries(plugin.definition.events).forEach(([event, handler]) => {
              this.registerEventListener(event, handler);
            });
          }
        });
    }
    
    // 書式設定を適用
    applyFormatting = (format, value) => {
      console.log(`Applying formatting: ${format}`, value);
      
      if (!this.hotInstance) return;
      
      const selection = this.hotInstance.getSelected();
      if (!selection || selection.length === 0) return;
      
      // 選択範囲を取得
      const [startRow, startCol, endRow, endCol] = selection[0];
      
      // プラグインに処理を委譲
      pluginRegistry.runHook('format:apply', {
        format,
        value,
        range: {
          startRow,
          startCol,
          endRow,
          endCol
        },
        hotInstance: this.hotInstance
      });
    }
    
    // メニュー構成を拡張
    getExtendedMenuConfig = (baseConfig) => {
      const results = pluginRegistry.runHook('menu:extend', baseConfig);
      return results && results.length > 0 ? results[results.length - 1] : baseConfig;
    }
    
    // ツールバー構成を拡張
    getExtendedToolbarConfig = (baseConfig) => {
      const results = pluginRegistry.runHook('toolbar:extend', baseConfig);
      return results && results.length > 0 ? results[results.length - 1] : baseConfig;
    }
    
    // セルプロパティをカスタマイズ
    getCustomCellProperties = (row, col, prop) => {
      const results = pluginRegistry.runHook('cell:properties', row, col, prop);
      return results && results.length > 0 ? results[results.length - 1] : {};
    }
    
    // セルレンダリングをカスタマイズ
    customizeCellRendering = (cellData, cellElement, rowIndex, colIndex) => {
      const results = pluginRegistry.runHook('cell:render', cellData, cellElement, rowIndex, colIndex, this.hotInstance);
      return results && results.some(result => result === true);
    }
    
    // メニューアイテムクリックのハンドラ
    handleMenuItemClick = (menuId) => {
      console.log(`Menu item clicked: ${menuId}`);
      
      // プラグインに処理を委譲
      const results = pluginRegistry.runHook('menu:click', menuId);
      const handled = results && results.some(result => result === true);
      
      // プラグインで処理されなかった場合のデフォルト処理
      if (!handled) {
        switch (menuId) {
          case 'new':
            document.dispatchEvent(new CustomEvent('file-new'));
            break;
          case 'open':
            document.dispatchEvent(new CustomEvent('file-open'));
            break;
          case 'save':
            document.dispatchEvent(new CustomEvent('file-save'));
            break;
          case 'saveAs':
            document.dispatchEvent(new CustomEvent('file-save-as'));
            break;
          case 'importCSV':
            document.dispatchEvent(new CustomEvent('file-import-csv'));
            break;
          case 'exportCSV':
            document.dispatchEvent(new CustomEvent('file-export-csv'));
            break;
          case 'bold':
            document.dispatchEvent(new CustomEvent('format-bold'));
            break;
          case 'italic':
            document.dispatchEvent(new CustomEvent('format-italic'));
            break;
          case 'underline':
            document.dispatchEvent(new CustomEvent('format-underline'));
            break;
          case 'alignLeft':
            document.dispatchEvent(new CustomEvent('format-align-left'));
            break;
          case 'alignCenter':
            document.dispatchEvent(new CustomEvent('format-align-center'));
            break;
          case 'alignRight':
            document.dispatchEvent(new CustomEvent('format-align-right'));
            break;
          default:
            console.log(`No default handler for menu item: ${menuId}`);
        }
      }
    }
    
    // ツールバー項目クリックのハンドラ
    handleToolbarClick = (toolbarId) => {
      console.log(`Toolbar item clicked: ${toolbarId}`);
      
      // プラグインに処理を委譲
      const results = pluginRegistry.runHook('toolbar:click', toolbarId);
      const handled = results && results.some(result => result === true);
      
      // プラグインで処理されなかった場合のデフォルト処理
      if (!handled) {
        this.handleMenuItemClick(toolbarId);
      }
    }
    
    render() {
      // プラグインシステムの機能を追加のpropsとして渡す
      const pluginProps = {
        pluginRegistry,
        setHotInstance: this.setHotInstance,
        getExtendedMenuConfig: this.getExtendedMenuConfig,
        getExtendedToolbarConfig: this.getExtendedToolbarConfig,
        customizeCellRendering: this.customizeCellRendering,
        getCustomCellProperties: this.getCustomCellProperties,
        onMenuItemClick: this.handleMenuItemClick,
        onToolbarClick: this.handleToolbarClick
      };
      
      return (
        <WrappedComponent 
          ref={this.wrappedComponentRef} 
          {...this.props} 
          {...pluginProps} 
        />
      );
    }
  };
};

export default withPlugins;