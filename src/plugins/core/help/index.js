import HelpDialog from './HelpDialog';
import ShortcutsDialog from './ShortcutsDialog';
import './styles.css';

const helpPlugin = {
  name: 'ヘルプ',
  version: '1.0.0',
  author: 'Your Name',
  
  initialize(registry) {
    console.log('Help plugin initialized');
    this.registry = registry;
    
    // コンポーネントを初期化
    this.helpDialog = new HelpDialog();
    this.shortcutsDialog = new ShortcutsDialog();
    
    // イベントリスナーのセットアップ
    this.setupEventListeners();
  },
  
  cleanup() {
    // イベントリスナーのクリーンアップ
    this.removeEventListeners();
  },
  
  setupEventListeners() {
    // ヘルプ表示イベント
    this.handleShowHelp = () => {
      this.helpDialog.show();
    };
    
    // ショートカット表示イベント
    this.handleShowShortcuts = () => {
      this.shortcutsDialog.show();
    };
    
    // バージョン情報表示イベント
    this.handleShowAbout = () => {
      alert('拡張スプレッドシート Ver.0.1.0\nプラグインアーキテクチャによる機能拡張版');
    };
    
    // イベントリスナーを登録
    document.addEventListener('help-show', this.handleShowHelp);
    document.addEventListener('help-shortcuts', this.handleShowShortcuts);
    document.addEventListener('help-about', this.handleShowAbout);
  },
  
  removeEventListeners() {
    // イベントリスナーを削除
    document.removeEventListener('help-show', this.handleShowHelp);
    document.removeEventListener('help-shortcuts', this.handleShowShortcuts);
    document.removeEventListener('help-about', this.handleShowAbout);
  },
  
  hooks: {
    // メニュー拡張
    'menu:extend': (menuConfig) => {
      // ヘルプメニューを追加/拡張
      const helpMenuIndex = menuConfig.items.findIndex(item => item.id === 'help');
      
      const helpMenuItems = [
        { id: 'help', label: 'ヘルプを表示', action: () => document.dispatchEvent(new CustomEvent('help-show')) },
        { id: 'shortcuts', label: 'キーボードショートカット', action: () => document.dispatchEvent(new CustomEvent('help-shortcuts')) },
        { type: 'separator' },
        { id: 'about', label: 'バージョン情報', action: () => document.dispatchEvent(new CustomEvent('help-about')) }
      ];
      
      if (helpMenuIndex >= 0) {
        // 既存のヘルプメニューを拡張
        menuConfig.items[helpMenuIndex].submenu = [
          ...menuConfig.items[helpMenuIndex].submenu || [],
          ...helpMenuItems
        ];
      } else {
        // 新しくヘルプメニューを追加
        menuConfig.items.push({
          id: 'help',
          label: 'ヘルプ',
          submenu: helpMenuItems
        });
      }
      
      return menuConfig;
    },
    
    // ツールバー拡張
    'toolbar:extend': (toolbarConfig) => {
      // ヘルプ関連のツールバーボタンを追加
      toolbarConfig.items.push(
        {
          id: 'help',
          tooltip: 'ヘルプ',
          icon: '❓',
          action: () => document.dispatchEvent(new CustomEvent('help-show'))
        }
      );
      
      return toolbarConfig;
    }
  }
};

export default helpPlugin;