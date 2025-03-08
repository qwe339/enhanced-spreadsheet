// src/plugins/core/filtering/index.js
import FilterDialog from './FilterDialog';
import './styles.css';

const filteringPlugin = {
  name: 'データフィルタリング',
  version: '1.0.0',
  author: '開発者名',
  
  initialize(registry) {
    console.log('フィルタリングプラグインが初期化されました');
    this.registry = registry;
    this.filters = {};
    this.dialogInstance = new FilterDialog(this);
    this.filteredData = null;
    this.hiddenRows = [];
    
    // イベントリスナーのセットアップ
    this.setupEventListeners();
  },
  
  cleanup() {
    console.log('フィルタリングプラグインがクリーンアップされました');
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
          alert('フィルターを適用するカラムを選択してください');
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
      const dataMenuIndex = menuConfig.items.findIndex(item => 
        item.id === 'data' || item.id === 'データ');
      
      const filterMenuItem = {
        id: 'filter',
        label: 'フィルター',
        action: () => document.dispatchEvent(new CustomEvent('show-filter-dialog'))
      };
      
      const clearFilterMenuItem = {
        id: 'clearFilters',
        label: 'フィルターをクリア',
        action: () => document.dispatchEvent(new CustomEvent('clear-filter'))
      };
      
      const filterMenuItems = [
        filterMenuItem,
        clearFilterMenuItem
      ];
      
      if (dataMenuIndex >= 0) {
        // 既存のデータメニューに追加
        if (!menuConfig.items[dataMenuIndex].submenu) {
          menuConfig.items[dataMenuIndex].submenu = [];
        }
        
        // セパレーターを追加
        if (menuConfig.items[dataMenuIndex].submenu.length > 0) {
          menuConfig.items[dataMenuIndex].submenu.push({ type: 'separator' });
        }
        
        // フィルターメニュー項目を追加
        menuConfig.items[dataMenuIndex].submenu.push(...filterMenuItems);
      } else {
        // データメニューを新規作成
        menuConfig.items.push({
          id: 'data',
          label: 'データ',
          submenu: filterMenuItems
        });
      }
      
      return menuConfig;
    },
    
    // ツールバー拡張
    'toolbar:extend': (toolbarConfig) => {
      // フィルターボタンを追加
      toolbarConfig.items.push(
        { type: 'separator' },
        {
          id: 'filter',
          tooltip: 'フィルター',
          icon: '🔍',
          action: () => document.dispatchEvent(new CustomEvent('show-filter-dialog'))
        }
      );
      
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
            name: 'この列のフィルターをクリア',
            callback: () => {
              document.dispatchEvent(new CustomEvent('clear-filter', {
                detail: { col }
              }));
            }
          });
        }
      }
      
      // すべてのセルで、フィルターがある場合はクリアオプションを追加
      if (this && Object.keys(this.filters).length > 0) {
        items.push({
          key: 'clear_all_filters',
          name: 'すべてのフィルターをクリア',
          callback: () => {
            document.dispatchEvent(new CustomEvent('clear-filter'));
          }
        });
      }
      
      return items;
    },
    
    // セルレンダリングをカスタマイズ
    'cell:render': (cellData, cellElement, rowIndex, colIndex) => {
      // フィルター適用済みカラムのヘッダースタイル
      if (rowIndex === -1 && this && this.hasFilterForColumn(colIndex)) {
        cellElement.classList.add('filtered-column');
        
        // フィルターアイコンを追加
        if (!cellElement.querySelector('.filter-indicator')) {
          const indicator = document.createElement('span');
          indicator.className = 'filter-indicator';
          indicator.innerHTML = '🔍';
          indicator.title = 'フィルターが適用されています';
          cellElement.appendChild(indicator);
        }
      }
      
      return false; // 標準レンダリングを続行
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
    
    // フィルターが適用されたことを示す視覚的フィードバック
    this.updateFilterIndicators();
    
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
      this.hiddenRows = [];
      this.updateHiddenRows();
      return;
    }
    
    // 非表示にする行を特定
    this.hiddenRows = [];
    for (let rowIndex = 0; rowIndex < originalData.length; rowIndex++) {
      const row = originalData[rowIndex];
      // すべてのフィルター条件を満たすか確認
      const matchesAllFilters = Object.entries(this.filters).every(([col, filter]) => {
        const colIndex = parseInt(col, 10);
        const cellValue = row[colIndex];
        
        return this.matchesFilter(cellValue, filter.type, filter.value);
      });
      
      if (!matchesAllFilters) {
        this.hiddenRows.push(rowIndex);
      }
    }
    
    // 非表示行を設定
    this.updateHiddenRows();
  },
  
  // 非表示行の設定を更新
  updateHiddenRows() {
    const hotInstance = this.getHotInstance();
    if (!hotInstance) return;
    
    // 行の表示/非表示を設定
    hotInstance.updateSettings({
      hiddenRows: {
        rows: this.hiddenRows,
        indicators: true
      }
    });
    
    // グリッドを再描画
    hotInstance.render();
  },
  
  // フィルターインジケーターを更新
  updateFilterIndicators() {
    const hotInstance = this.getHotInstance();
    if (!hotInstance) return;
    
    // すべての列ヘッダーのフィルターインジケーターをリセット
    const colCount = hotInstance.countCols();
    for (let col = 0; col < colCount; col++) {
      const th = hotInstance.getColHeader(col, true);
      if (th) {
        th.classList.remove('filtered-column');
        const indicator = th.querySelector('.filter-indicator');
        if (indicator) {
          th.removeChild(indicator);
        }
      }
    }
    
    // フィルターが適用されている列にインジケーターを追加
    Object.keys(this.filters).forEach(col => {
      const colIndex = parseInt(col, 10);
      const th = hotInstance.getColHeader(colIndex, true);
      if (th) {
        th.classList.add('filtered-column');
        
        if (!th.querySelector('.filter-indicator')) {
          const indicator = document.createElement('span');
          indicator.className = 'filter-indicator';
          indicator.innerHTML = '🔍';
          indicator.title = 'フィルターが適用されています';
          th.appendChild(indicator);
        }
      }
    });
  },
  
  // フィルター条件にマッチするか確認
  matchesFilter(value, filterType, filterValue) {
    if (value === null || value === undefined) {
      // 空の値の特別処理
      return filterType === 'empty' ||
             (filterType === 'values' && filterValue.includes('')) ||
             (filterType === 'notEquals' && String(filterValue) !== '');
    }
    
    const stringValue = String(value);
    
    switch (filterType) {
      case 'equals':
        return stringValue === String(filterValue);
      
      case 'notEquals':
        return stringValue !== String(filterValue);
      
      case 'contains':
        return stringValue.includes(String(filterValue));
      
      case 'notContains':
        return !stringValue.includes(String(filterValue));
      
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
        return stringValue.startsWith(String(filterValue));
      
      case 'endsWith':
        return stringValue.endsWith(String(filterValue));
      
      case 'values':
        // 複数の選択肢から一致するものを検索
        return Array.isArray(filterValue) && 
              (filterValue.includes(stringValue) || 
               (value === '' && filterValue.includes(null)));
      
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
    
    // フィルターインジケーターを更新
    this.updateFilterIndicators();
    
    // ステータスメッセージ更新
    const hotInstance = this.getHotInstance();
    if (hotInstance) {
      this.updateStatusMessage(`列 ${hotInstance.getColHeader(col)} のフィルターをクリアしました`);
    }
  },
  
  // すべてのフィルターをクリア
  clearAllFilters() {
    if (Object.keys(this.filters).length === 0) return;
    
    // フィルターをリセット
    this.filters = {};
    this.hiddenRows = [];
    
    // グリッドを更新
    this.updateHiddenRows();
    
    // フィルターインジケーターを更新
    this.updateFilterIndicators();
    
    // ステータスメッセージ更新
    this.updateStatusMessage('すべてのフィルターをクリアしました');
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
    
    const spreadsheetGridContainer = document.querySelector('.spreadsheet-grid-container');
    if (spreadsheetGridContainer) {
      const hotElement = spreadsheetGridContainer.querySelector('.handsontable');
      if (hotElement && hotElement.hotInstance) {
        return hotElement.hotInstance;
      }
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