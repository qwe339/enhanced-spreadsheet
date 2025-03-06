import './styles.css';

const formattingPlugin = {
  name: '書式設定',
  version: '1.0.0',
  author: 'Your Name',
  
  initialize(registry) {
    console.log('Formatting plugin initialized');
    this.registry = registry;
    
    // イベントリスナーのセットアップ
    this.setupEventListeners();
  },
  
  cleanup() {
    // イベントリスナーのクリーンアップ
    this.removeEventListeners();
  },
  
  setupEventListeners() {
    // 太字設定イベント
    this.handleBold = () => {
      document.dispatchEvent(new CustomEvent('format-apply', { 
        detail: { format: 'bold' } 
      }));
    };
    
    // 斜体設定イベント
    this.handleItalic = () => {
      document.dispatchEvent(new CustomEvent('format-apply', { 
        detail: { format: 'italic' } 
      }));
    };
    
    // 下線設定イベント
    this.handleUnderline = () => {
      document.dispatchEvent(new CustomEvent('format-apply', { 
        detail: { format: 'underline' } 
      }));
    };
    
    // 左揃えイベント
    this.handleAlignLeft = () => {
      document.dispatchEvent(new CustomEvent('format-apply', { 
        detail: { format: 'align', value: 'left' } 
      }));
    };
    
    // 中央揃えイベント
    this.handleAlignCenter = () => {
      document.dispatchEvent(new CustomEvent('format-apply', { 
        detail: { format: 'align', value: 'center' } 
      }));
    };
    
    // 右揃えイベント
    this.handleAlignRight = () => {
      document.dispatchEvent(new CustomEvent('format-apply', { 
        detail: { format: 'align', value: 'right' } 
      }));
    };
    
    // イベントリスナーを登録
    document.addEventListener('format-bold', this.handleBold);
    document.addEventListener('format-italic', this.handleItalic);
    document.addEventListener('format-underline', this.handleUnderline);
    document.addEventListener('format-align-left', this.handleAlignLeft);
    document.addEventListener('format-align-center', this.handleAlignCenter);
    document.addEventListener('format-align-right', this.handleAlignRight);
  },
  
  removeEventListeners() {
    // イベントリスナーを削除
    document.removeEventListener('format-bold', this.handleBold);
    document.removeEventListener('format-italic', this.handleItalic);
    document.removeEventListener('format-underline', this.handleUnderline);
    document.removeEventListener('format-align-left', this.handleAlignLeft);
    document.removeEventListener('format-align-center', this.handleAlignCenter);
    document.removeEventListener('format-align-right', this.handleAlignRight);
  },
  
  hooks: {
    // メニュー拡張
    'menu:extend': (menuConfig) => {
      // 書式メニューを追加/拡張
      const formatMenuIndex = menuConfig.items.findIndex(item => item.id === 'format');
      
      const formatMenuItems = [
        { id: 'bold', label: '太字', action: () => document.dispatchEvent(new CustomEvent('format-bold')) },
        { id: 'italic', label: '斜体', action: () => document.dispatchEvent(new CustomEvent('format-italic')) },
        { id: 'underline', label: '下線', action: () => document.dispatchEvent(new CustomEvent('format-underline')) },
        { type: 'separator' },
        { id: 'alignLeft', label: '左揃え', action: () => document.dispatchEvent(new CustomEvent('format-align-left')) },
        { id: 'alignCenter', label: '中央揃え', action: () => document.dispatchEvent(new CustomEvent('format-align-center')) },
        { id: 'alignRight', label: '右揃え', action: () => document.dispatchEvent(new CustomEvent('format-align-right')) }
      ];
      
      if (formatMenuIndex >= 0) {
        // 既存の書式メニューを拡張
        menuConfig.items[formatMenuIndex].submenu = [
          ...menuConfig.items[formatMenuIndex].submenu || [],
          ...formatMenuItems
        ];
      } else {
        // 新しく書式メニューを追加
        menuConfig.items.push({
          id: 'format',
          label: '書式',
          submenu: formatMenuItems
        });
      }
      
      return menuConfig;
    },
    
    // ツールバー拡張
    'toolbar:extend': (toolbarConfig) => {
      // 書式設定関連のツールバーボタンを追加
      toolbarConfig.items.push(
        {
          id: 'bold',
          tooltip: '太字',
          icon: 'B',
          action: () => document.dispatchEvent(new CustomEvent('format-bold'))
        },
        {
          id: 'italic',
          tooltip: '斜体',
          icon: 'I',
          action: () => document.dispatchEvent(new CustomEvent('format-italic'))
        },
        {
          id: 'underline',
          tooltip: '下線',
          icon: 'U',
          action: () => document.dispatchEvent(new CustomEvent('format-underline'))
        },
        { type: 'separator' },
        {
          id: 'align-left',
          tooltip: '左揃え',
          icon: '⬅️',
          action: () => document.dispatchEvent(new CustomEvent('format-align-left'))
        },
        {
          id: 'align-center',
          tooltip: '中央揃え',
          icon: '⬅️➡️',
          action: () => document.dispatchEvent(new CustomEvent('format-align-center'))
        },
        {
          id: 'align-right',
          tooltip: '右揃え',
          icon: '➡️',
          action: () => document.dispatchEvent(new CustomEvent('format-align-right'))
        }
      );
      
      return toolbarConfig;
    },
    
    // セルレンダリングをカスタマイズ
    'cell:render': (cellData, cellElement, rowIndex, colIndex, hotInstance) => {
      // セルのフォーマットを適用
      const format = this.getCellFormat(rowIndex, colIndex);
      
      if (format) {
        if (format.bold) {
          cellElement.style.fontWeight = 'bold';
        }
        
        if (format.italic) {
          cellElement.style.fontStyle = 'italic';
        }
        
        if (format.underline) {
          cellElement.style.textDecoration = 'underline';
        }
        
        if (format.align) {
          cellElement.style.textAlign = format.align;
        }
      }
      
      return false; // 標準レンダリングを継続
    }
  },
  
  // プラグイン固有のAPI
  formatStorage: {}, // 簡易的なフォーマット情報のストレージ
  
  // セルの書式を取得
  getCellFormat(row, col) {
    return this.formatStorage[`${row},${col}`] || null;
  },
  
  // セルに書式を適用
  applyFormat(row, col, formatType, value) {
    const cellKey = `${row},${col}`;
    const currentFormat = this.formatStorage[cellKey] || {};
    
    if (formatType === 'align') {
      currentFormat.align = value;
    } else {
      // 太字、斜体、下線などの切り替え
      currentFormat[formatType] = !currentFormat[formatType];
    }
    
    this.formatStorage[cellKey] = currentFormat;
    
    // Handsontableの再描画をトリガー
    document.dispatchEvent(new CustomEvent('spreadsheet-render'));
  }
};

export default formattingPlugin;