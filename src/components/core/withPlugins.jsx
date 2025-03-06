import React from 'react';
import pluginRegistry from '../../plugins';

// プラグインシステムをコンポーネントに接続するHOC
const withPlugins = (WrappedComponent) => {
  return class WithPlugins extends React.Component {
    constructor(props) {
      super(props);
      
      // プラグインからのイベントリスナー登録
      this.eventListeners = [];
    }
    
    componentDidMount() {
      // プラグインからのカスタムイベントリスナーを登録
      this.registerPluginEventListeners();
    }
    
    componentWillUnmount() {
      // イベントリスナーを解除
      this.eventListeners.forEach(({ event, handler }) => {
        document.removeEventListener(event, handler);
      });
    }
    
    registerPluginEventListeners() {
      // チャートダイアログ表示イベント
      const showChartDialogHandler = () => {
        console.log('Show chart dialog');
        // 実装: チャートダイアログを表示する処理
      };
      
      document.addEventListener('show-chart-dialog', showChartDialogHandler);
      
      this.eventListeners.push({
        event: 'show-chart-dialog',
        handler: showChartDialogHandler
      });
      
      // 他のイベントリスナーも同様に登録
    }
    
    // プラグインの機能をラップしたコンポーネントに渡す
    render() {
      // プラグインシステムの機能を追加のpropsとして渡す
      const pluginProps = {
        pluginRegistry,
        // プラグインフックの実行ヘルパー関数
        runPluginHook: (hookName, ...args) => {
          return pluginRegistry.runHook(hookName, ...args);
        },
        // メニュー構成を拡張
        getExtendedMenuConfig: (baseConfig) => {
          const results = pluginRegistry.runHook('menu:extend', baseConfig);
          return results ? results[results.length - 1] : baseConfig;
        },
        // ツールバー構成を拡張
        getExtendedToolbarConfig: (baseConfig) => {
          const results = pluginRegistry.runHook('toolbar:extend', baseConfig);
          return results ? results[results.length - 1] : baseConfig;
        }
      };
      
      return <WrappedComponent {...this.props} {...pluginProps} />;
    }
  };
};

export default withPlugins;