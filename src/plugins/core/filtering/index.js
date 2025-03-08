// src/plugins/core/filtering/index.js
import FilterDialog from './FilterDialog';
import './styles.css';

const filteringPlugin = {
  name: 'データフィルタリング',
  version: '1.0.0',
  author: 'Your Name',
  
  initialize(registry) {
    console.log('Filtering plugin initialized');
    this.registry = registry;
    this.filters = {};
    this.dialogInstance = new FilterDialog(this);
    this.filteredData = null;
    
    // イベントリスナーのセットアップ
    this.setupEventListeners();
  },
  
  cleanup() {
    console.log('Filtering plugin cleanup');
    this.removeEventListeners();
    this.clearAllFilters();
  },
  
  setupEventListeners() {
    // フィルターダイアログ表示イベント
    this.handleShowFilterDialog = (e) => {
      const { col } = e.detail || {};
      if (col !== undefined) {
        this.showFilterDialog(col);
      } else {
        // 選択されたセルのカラムを取得
        const selectedRange = this.getSelectedRange();
        if (selectedRange) {
          this.showFilterDialog(selectedRange.startCol);
        } else {
          console.warn('フィルタリングするカラムが選択されていません');
        }
      }
    };
    
    // フィルター適用イベント
    this.handleApplyFilter = (e) => {
      const { col, filterType, filterValue } = e.detail || {};
      if (col !== undefined && filterType) {
        this.applyFilter(col, filterType, filterValue);
      }
    };
    
    // フィルタークリアイベント
    this.handleClearFilter = (e) => {
      const { col } = e.detail || {};
      if (col !== undefined) {
        this.clearFilter(col);
      } else {
        this.clearAllFilters();
      }
    };
    
    // イベントリスナーを登録
    document.addEventListener('show-filter-dialog', this.handleShowFilterDialog);
    document.addEventListener('apply-filter', this.handleApplyFilter);
    document.addEventListener('clear-filter', this.handleClearFilter);
  },
  
  removeEventListeners() {
    document.removeEventListener('show-filter-dialog', this.handleShowFilterDialog);
    document.removeEventListener('apply-filter', this.handleApplyFilter);
    document.removeEventListener('clear-filter', this.handleClearFilter);
  },
  
  hooks: {
    // メニュー拡張
    'menu:extend': (menuConfig) => {
      // データメニューを探す
      const dataMenuIndex = menuConfig.items.findIndex(item => item.id === 'data');
      
      const filterMenuItem = {
        id: 'filter',
        label: 'フィルター',
        action: () => document.dispatchEvent(new CustomEvent('show-filter-dialog'))
      };
      
      if (dataMenuIndex >= 0) {
        // 既存のデータメニューに追加
        if (!menuConfig.items[dataMenuIndex].submenu) {
          menuConfig.items[dataMenuIndex].submenu = [];
        }
        
        // フィルターメニューがあるか確認
        const filterIndex = menuConfig.items[dataMenuIndex].submenu.findIndex(item => item.id === 'filter');
        
        if (filterIndex === -1) {
          menuConfig.items[dataMenuIndex].submenu.push(filterMenuItem);
        }
      } else {
        // データメニューを新規作成
        menuConfig.items.push({
          id: 'data',
          label: 'データ',
          submenu: [filterMenuItem]
        });
      }
      
      return menuConfig;
    },
    
    // ツールバー拡張
    'toolbar:extend': (toolbarConfig) => {
      // フィルターボタンを追加
      toolbarConfig.items.push({
        id: 'filter',
        tooltip: 'フィルター',
        icon: '🔍',
        action: () => document.dispatchEvent(new CustomEvent('show-filter-dialog'))
      });
      
      return toolbarConfig;
    },
    
    // コンテキストメニュー拡張
    'contextmenu:extend': (items, { row, col }) => {
      // ヘッダーセルでのコンテキストメニュー
      if (row === -1 && col >= 0) {
        items.push(
          { name: '---------' },
          {
            key: 'filter_column',
            name: 'この列をフィルター',
            callback: () => {
              document.dispatchEvent(new CustomEvent('show-filter-dialog', {
                detail: { col }
              }));
            }
          }
        );
        
        // 既存のフィルターがある場合、クリアオプションを追加
        if (this && this.hasFilterForColumn(col)) {
          items.push({
            key: 'clear_filter',
            name: 'フィルターをクリア',
            callback: () => {
              document.dispatchEvent(new CustomEvent('clear-filter', {
                detail: { col }
              }));
            }
          });
        }
      }
      
      return items;
    },
    
    // データを取得する前のフック
    'data:beforeGetData': (originalCallback) => {
      return (row, column, prop) => {
        const value = originalCallback(row, column, prop);
        
        // フィルタリングが適用されている場合は、そのデータを使用
        if (this.filteredData) {
          return this.filteredData[row] ? this.filteredData[row][column] : value;
        }
        
        return value;
      };
    }
  },
  
  // フィルターダイアログを表示
  showFilterDialog(col) {
    const hotInstance = this.getHotInstance();
    if (!hotInstance) return;
    
    // カラムのデータを取得
    const columnData = this.getColumnData(col);
    const columnHeader = hotInstance.getColHeader(col);
    
    // 既存のフィルターを取得
    const existingFilter = this.filters[col];
    
    // ダイアログを表示
    this.dialogInstance.show(col, columnData, columnHeader, existingFilter);
  },
  
  // 列のデータを取得
  getColumnData(col) {
    const hotInstance = this.getHotInstance();
    if (!hotInstance) return [];
    
    const data = hotInstance.getData();
    if (!data || !data.length) return [];
    
    return data.map(row => row[col]).filter(value => value !== null && value !== undefined);
  },
  
  // フィルターを適用
  applyFilter(col, filterType, filterValue) {
    const hotInstance = this.getHotInstance();
    if (!hotInstance) return;
    
    // フィルターを保存
    this.filters[col] = { type: filterType, value: filterValue };
    
    // データをフィルタリング
    this.applyFilters();
    
    // ステータスメッセージ更新
    this.updateStatusMessage(`列 ${hotInstance.getColHeader(col)} にフィルターを適用しました`);
  },
  
  // すべてのフィルターを適用
  applyFilters() {
    const hotInstance = this.getHotInstance();
    if (!hotInstance) return;
    
    const originalData = hotInstance.getData();
    if (!originalData || !originalData.length) return;
    
    // フィルターがない場合
    if (Object.keys(this.filters).length === 0) {
      this.filteredData = null;
      hotInstance.render();
      return;
    }
    
    // データのフィルタリング
    this.filteredData = originalData.filter(row => {
      // すべてのフィルター条件を満たすか確認
      return Object.entries(this.filters).every(([col, filter]) => {
        const colIndex = parseInt(col, 10);
        const cellValue = row[colIndex];
        
        return this.matchesFilter(cellValue, filter.type, filter.value);
      });
    });
    
    // 非表示行の設定
    const rowsToHide = [];
    originalData.forEach((row, index) => {
      if (!this.filteredData.includes(row)) {
        rowsToHide.push(index);
      }
    });
    
    // 行の表示/非表示を設定
    hotInstance.updateSettings({
      hiddenRows: {
        rows: rowsToHide,
        indicators: true
      }
    });
    
    // グリッドを再描画
    hotInstance.render();
  },
  
  // フィルター条件にマッチするか確認
  matchesFilter(value, filterType, filterValue) {
    if (value === null || value === undefined) return false;
    
    switch (filterType) {
      case 'equals':
        return String(value) === String(filterValue);
      
      case 'notEquals':
        return String(value) !== String(filterValue);
      
      case 'contains':
        return String(value).includes(String(filterValue));
      
      case 'notContains':
        return !String(value).includes(String(filterValue));
      
      case 'greaterThan':
        return Number(value) > Number(filterValue);
      
      case 'lessThan':
        return Number(value) < Number(filterValue);
      
      case 'between':
        return Number(value) >= Number(filterValue.min) && 
               Number(value) <= Number(filterValue.max);
      
      case 'empty':
        return value === '' || value === null || value === undefined;
      
      case 'notEmpty':
        return value !== '' && value !== null && value !== undefined;
      
      case 'startsWith':
        return String(value).startsWith(String(filterValue));
      
      case 'endsWith':
        return String(value).endsWith(String(filterValue));
      
      case 'values':
        return Array.isArray(filterValue) && filterValue.includes(String(value));
      
      default:
        return true;
    }
  },
  
  // 特定の列のフィルターをクリア
  clearFilter(col) {
    if (!this.filters[col]) return;
    
    // フィルターを削除
    delete this.filters[col];
    
    // 残りのフィルターを適用
    this.applyFilters();
    
    // ステータスメッセージ更新
    const hotInstance = this.getHotInstance();
    if (hotInstance) {
      this.updateStatusMessage(`列 ${hotInstance.getColHeader(col)} のフィルターをクリアしました`);
    }
  },
  
  // すべてのフィルターをクリア
  clearAllFilters() {
    // フィルターをリセット
    this.filters = {};
    this.filteredData = null;
    
    // グリッドを更新
    const hotInstance = this.getHotInstance();
    if (hotInstance) {
      hotInstance.updateSettings({
        hiddenRows: {
          rows: [],
          indicators: false
        }
      });
      
      hotInstance.render();
      this.updateStatusMessage('すべてのフィルターをクリアしました');
    }
  },
  
  // 特定の列にフィルターがあるか確認
  hasFilterForColumn(col) {
    return this.filters && this.filters[col] !== undefined;
  },
  
  // 選択された範囲を取得
  getSelectedRange() {
    const hotInstance = this.getHotInstance();
    if (!hotInstance) return null;
    
    const selected = hotInstance.getSelected();
    if (!selected || !selected.length) return null;
    
    const [startRow, startCol, endRow, endCol] = selected[0];
    
    return {
      startRow: Math.min(startRow, endRow),
      startCol: Math.min(startCol, endCol),
      endRow: Math.max(startRow, endRow),
      endCol: Math.max(startCol, endCol)
    };
  },
  
  // Handsontableインスタンスを取得
  getHotInstance() {
    // 登録済みインスタンスの取得を試行
    if (this.registry && this.registry.hotInstance) {
      return this.registry.hotInstance;
    }
    
    // グローバル変数から取得を試行
    if (window.__hotInstance) {
      return window.__hotInstance;
    }
    
    // DOM探索による取得を試行
    const hotContainer = document.querySelector('.handsontable');
    if (hotContainer && hotContainer.hotInstance) {
      return hotContainer.hotInstance;
    }
    
    return null;
  },
  
  // ステータスメッセージを更新
  updateStatusMessage(message) {
    document.dispatchEvent(new CustomEvent('spreadsheet-status-message', {
      detail: { message }
    }));
  }
};

export default filteringPlugin;