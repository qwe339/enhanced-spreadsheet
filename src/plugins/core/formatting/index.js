// src/plugins/core/formatting/index.js を更新
import './styles.css';

const formattingPlugin = {
  name: '書式設定',
  version: '1.0.0',
  author: 'Your Name',
  
  initialize(registry) {
    console.log('Formatting plugin initialized');
    this.registry = registry;
    
    // フォーマット設定を保存するストレージ
    this.formatStorage = {};
    
    // イベントリスナーのセットアップ
    this.setupEventListeners();
  },
  
  cleanup() {
    // イベントリスナーのクリーンアップ
    this.removeEventListeners();
  },
  
  setupEventListeners() {
    // フォーマット適用イベント
    this.handleFormatApply = (e) => {
      const { format, value } = e.detail || {};
      if (!format) return;
      
      // Handsontableインスタンスを取得
      const hotInstance = this.registry.hotInstance;
      if (!hotInstance) return;
      
      // 選択範囲を取得
      const selectedRanges = hotInstance.getSelected();
      if (!selectedRanges || selectedRanges.length === 0) {
        console.warn('選択範囲がありません');
        return;
      }
      
      // 各選択範囲に書式を適用
      selectedRanges.forEach(([startRow, startCol, endRow, endCol]) => {
        // 選択範囲の境界を確定
        const rowStart = Math.min(startRow, endRow);
        const rowEnd = Math.max(startRow, endRow);
        const colStart = Math.min(startCol, endCol);
        const colEnd = Math.max(startCol, endCol);
        
        // 範囲内の各セルに書式を適用
        for (let row = rowStart; row <= rowEnd; row++) {
          for (let col = colStart; col <= colEnd; col++) {
            this.applyCellFormat(row, col, format, value);
          }
        }
      });
      
      // グリッドを再描画
      hotInstance.render();
    };
    
    // フォントサイズ変更イベント
    this.handleFontSize = (e) => {
      const { size } = e.detail || {};
      if (!size) return;
      
      const formatEvent = new CustomEvent('format-apply', {
        detail: { format: 'fontSize', value: size }
      });
      document.dispatchEvent(formatEvent);
    };
    
    // 文字色変更イベント
    this.handleTextColor = (e) => {
      const { color } = e.detail || {};
      if (!color) return;
      
      const formatEvent = new CustomEvent('format-apply', {
        detail: { format: 'color', value: color }
      });
      document.dispatchEvent(formatEvent);
    };
    
    // 背景色変更イベント
    this.handleBgColor = (e) => {
      const { color } = e.detail || {};
      if (!color) return;
      
      const formatEvent = new CustomEvent('format-apply', {
        detail: { format: 'backgroundColor', value: color }
      });
      document.dispatchEvent(formatEvent);
    };
    
    // イベントリスナーを登録
    document.addEventListener('format-apply', this.handleFormatApply);
    document.addEventListener('format-font-size', this.handleFontSize);
    document.addEventListener('format-text-color', this.handleTextColor);
    document.addEventListener('format-bg-color', this.handleBgColor);
  },
  
  removeEventListeners() {
    // イベントリスナーを削除
    document.removeEventListener('format-apply', this.handleFormatApply);
    document.removeEventListener('format-font-size', this.handleFontSize);
    document.removeEventListener('format-text-color', this.handleTextColor);
    document.removeEventListener('format-bg-color', this.handleBgColor);
  },
  
  hooks: {
    // メニュー拡張
    'menu:extend': (menuConfig) => {
      // 書式メニューを追加/拡張
      const formatMenuIndex = menuConfig.items.findIndex(item => item.id === 'format');
      
      const formatMenuItems = [
        { id: 'bold', label: '太字', action: () => document.dispatchEvent(new CustomEvent('format-apply', { detail: { format: 'bold' } })) },
        { id: 'italic', label: '斜体', action: () => document.dispatchEvent(new CustomEvent('format-apply', { detail: { format: 'italic' } })) },
        { id: 'underline', label: '下線', action: () => document.dispatchEvent(new CustomEvent('format-apply', { detail: { format: 'underline' } })) },
        { type: 'separator' },
        { id: 'align-left', label: '左揃え', action: () => document.dispatchEvent(new CustomEvent('format-apply', { detail: { format: 'align', value: 'left' } })) },
        { id: 'align-center', label: '中央揃え', action: () => document.dispatchEvent(new CustomEvent('format-apply', { detail: { format: 'align', value: 'center' } })) },
        { id: 'align-right', label: '右揃え', action: () => document.dispatchEvent(new CustomEvent('format-apply', { detail: { format: 'align', value: 'right' } })) },
        { type: 'separator' },
        { 
          id: 'font-size', 
          label: 'フォントサイズ',
          submenu: [
            { id: 'font-size-small', label: '小', action: () => document.dispatchEvent(new CustomEvent('format-font-size', { detail: { size: 'small' } })) },
            { id: 'font-size-medium', label: '中', action: () => document.dispatchEvent(new CustomEvent('format-font-size', { detail: { size: 'medium' } })) },
            { id: 'font-size-large', label: '大', action: () => document.dispatchEvent(new CustomEvent('format-font-size', { detail: { size: 'large' } })) }
          ]
        },
        { 
          id: 'text-color', 
          label: '文字色',
          submenu: [
            { id: 'text-color-black', label: '黒', action: () => document.dispatchEvent(new CustomEvent('format-text-color', { detail: { color: '#000000' } })) },
            { id: 'text-color-red', label: '赤', action: () => document.dispatchEvent(new CustomEvent('format-text-color', { detail: { color: '#ff0000' } })) },
            { id: 'text-color-blue', label: '青', action: () => document.dispatchEvent(new CustomEvent('format-text-color', { detail: { color: '#0000ff' } })) },
            { id: 'text-color-green', label: '緑', action: () => document.dispatchEvent(new CustomEvent('format-text-color', { detail: { color: '#008000' } })) }
          ]
        },
        { 
          id: 'bg-color', 
          label: '背景色',
          submenu: [
            { id: 'bg-color-none', label: 'なし', action: () => document.dispatchEvent(new CustomEvent('format-bg-color', { detail: { color: 'transparent' } })) },
            { id: 'bg-color-yellow', label: '黄', action: () => document.dispatchEvent(new CustomEvent('format-bg-color', { detail: { color: '#ffff00' } })) },
            { id: 'bg-color-cyan', label: '水色', action: () => document.dispatchEvent(new CustomEvent('format-bg-color', { detail: { color: '#00ffff' } })) },
            { id: 'bg-color-pink', label: 'ピンク', action: () => document.dispatchEvent(new CustomEvent('format-bg-color', { detail: { color: '#ffcccc' } })) }
          ]
        }
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
          action: () => document.dispatchEvent(new CustomEvent('format-apply', { detail: { format: 'bold' } }))
        },
        {
          id: 'italic',
          tooltip: '斜体',
          icon: 'I',
          action: () => document.dispatchEvent(new CustomEvent('format-apply', { detail: { format: 'italic' } }))
        },
        {
          id: 'underline',
          tooltip: '下線',
          icon: 'U',
          action: () => document.dispatchEvent(new CustomEvent('format-apply', { detail: { format: 'underline' } }))
        },
        { type: 'separator' },
        {
          id: 'align-left',
          tooltip: '左揃え',
          icon: '⬅️',
          action: () => document.dispatchEvent(new CustomEvent('format-apply', { detail: { format: 'align', value: 'left' } }))
        },
        {
          id: 'align-center',
          tooltip: '中央揃え',
          icon: '⬅️➡️',
          action: () => document.dispatchEvent(new CustomEvent('format-apply', { detail: { format: 'align', value: 'center' } }))
        },
        {
          id: 'align-right',
          tooltip: '右揃え',
          icon: '➡️',
          action: () => document.dispatchEvent(new CustomEvent('format-apply', { detail: { format: 'align', value: 'right' } }))
        },
        { type: 'separator' },
        {
          id: 'text-color',
          tooltip: '文字色',
          icon: 'A',
          action: () => document.dispatchEvent(new CustomEvent('format-text-color', { detail: { color: '#ff0000' } }))
        },
        {
          id: 'bg-color',
          tooltip: '背景色',
          icon: '🎨',
          action: () => document.dispatchEvent(new CustomEvent('format-bg-color', { detail: { color: '#ffff00' } }))
        }
      );
      
      return toolbarConfig;
    },
    
    // セルプロパティをカスタマイズ
    'cell:properties': (row, col, value) => {
      const cellKey = `${row},${col}`;
      const format = this.formatStorage[cellKey];
      
      if (!format) return null;
      
      // 書式の設定をセルプロパティに変換
      const cellProps = {};
      
      if (format.bold) cellProps.fontWeight = 'bold';
      if (format.italic) cellProps.fontStyle = 'italic';
      if (format.underline) cellProps.textDecoration = 'underline';
      if (format.align) cellProps.textAlign = format.align;
      if (format.fontSize) cellProps.fontSize = this.getFontSizeValue(format.fontSize);
      if (format.color) cellProps.color = format.color;
      if (format.backgroundColor) cellProps.backgroundColor = format.backgroundColor;
      
      // カスタムスタイルの生成
      if (Object.keys(cellProps).length > 0) {
        // className生成
        let className = '';
        
        if (format.bold) className += ' font-bold';
        if (format.italic) className += ' font-italic';
        if (format.underline) className += ' text-underline';
        if (format.align) className += ` text-${format.align}`;
        if (format.fontSize) className += ` text-${format.fontSize}`;
        
        cellProps.className = className.trim();
        
        // インラインスタイル生成
        let style = '';
        
        if (format.color) style += `color: ${format.color};`;
        if (format.backgroundColor && format.backgroundColor !== 'transparent') {
          style += `background-color: ${format.backgroundColor};`;
        }
        
        if (style) {
          cellProps.style = style;
        }
      }
      
      return cellProps;
    }
  },
  
  // セルに書式を適用
  applyCellFormat(row, col, formatType, value) {
    const cellKey = `${row},${col}`;
    
    // 現在の書式を取得または初期化
    if (!this.formatStorage[cellKey]) {
      this.formatStorage[cellKey] = {};
    }
    
    const currentFormat = this.formatStorage[cellKey];
    
    // 書式タイプに応じて処理
    switch (formatType) {
      case 'bold':
        currentFormat.bold = !currentFormat.bold;
        break;
      case 'italic':
        currentFormat.italic = !currentFormat.italic;
        break;
      case 'underline':
        currentFormat.underline = !currentFormat.underline;
        break;
      case 'align':
        currentFormat.align = value;
        break;
      case 'fontSize':
        currentFormat.fontSize = value;
        break;
      case 'color':
        currentFormat.color = value;
        break;
      case 'backgroundColor':
        currentFormat.backgroundColor = value;
        break;
      default:
        console.warn(`未対応の書式タイプ: ${formatType}`);
    }
    
    // 空のフォーマットオブジェクトなら削除
    if (Object.keys(currentFormat).length === 0) {
      delete this.formatStorage[cellKey];
    }
  },
  
  // フォントサイズの値を取得
  getFontSizeValue(size) {
    switch (size) {
      case 'small': return '11px';
      case 'medium': return '14px';
      case 'large': return '18px';
      default: return '14px';
    }
  }
};

export default formattingPlugin;