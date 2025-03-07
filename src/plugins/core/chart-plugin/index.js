import ChartMenu from './ChartMenu';
import ChartDialog from './ChartDialog';
import ChartRenderer from './ChartRenderer';
import './styles.css';

const chartPlugin = {
  name: 'Chart Plugin',
  version: '1.0.0',
  author: 'Your Name',
  
  // プラグイン初期化
  initialize(registry) {
    console.log('Chart plugin initialized');
    this.registry = registry;
    this.charts = [];
    
    // コンポーネントを初期化
    this.chartMenu = new ChartMenu(this);
    this.chartDialog = new ChartDialog(this);
    this.chartRenderer = new ChartRenderer(this);
    
    // イベントリスナーを設定
    this.setupEventListeners();
  },
  
  // プラグイン後処理
  cleanup() {
    console.log('Chart plugin cleanup');
    // リソースの解放などの処理
    this.chartRenderer.cleanup();
    this.removeEventListeners();
  },
  
  setupEventListeners() {
    // チャートダイアログ表示イベント
    this.handleShowChartDialog = () => {
      const hotInstance = this.registry.hotInstance;
      this.chartDialog.show(hotInstance);
    };
    
    document.addEventListener('show-chart-dialog', this.handleShowChartDialog);
  },
  
  removeEventListeners() {
    document.removeEventListener('show-chart-dialog', this.handleShowChartDialog);
  },
  
  // フック定義
  hooks: {
    // メニュー拡張
    'menu:extend': (menuConfig) => {
      // 挿入メニューを探す
      const insertMenuIndex = menuConfig.items.findIndex(item => item.id === 'insert');
      
      if (insertMenuIndex >= 0) {
        // 既存の挿入メニューを拡張
        const chartMenuItem = {
          id: 'insert-chart',
          label: 'グラフ',
          action: () => {
            document.dispatchEvent(new CustomEvent('show-chart-dialog'));
          }
        };
        
        // 既存のサブメニューに追加
        if (menuConfig.items[insertMenuIndex].submenu) {
          menuConfig.items[insertMenuIndex].submenu.push(chartMenuItem);
        } else {
          menuConfig.items[insertMenuIndex].submenu = [chartMenuItem];
        }
      } else {
        // 挿入メニューが存在しない場合、新たに追加
        menuConfig.items.push({
          id: 'insert',
          label: '挿入',
          submenu: [{
            id: 'insert-chart',
            label: 'グラフ',
            action: () => {
              document.dispatchEvent(new CustomEvent('show-chart-dialog'));
            }
          }]
        });
      }
      
      return menuConfig;
    },
    
    // ツールバー拡張
    'toolbar:extend': (toolbarConfig) => {
      toolbarConfig.items.push({
        id: 'chart-button',
        tooltip: 'グラフを挿入',
        icon: '📊',
        action: () => {
          document.dispatchEvent(new CustomEvent('show-chart-dialog'));
        }
      });
      return toolbarConfig;
    },
    
    // セルレンダリングをカスタマイズ
    'cell:render': (cellData, cellElement, rowIndex, colIndex, hotInstance) => {
      // チャートがこのセルに存在するか確認
      const chart = this.charts.find(c => 
        c.position.row === rowIndex && c.position.col === colIndex
      );
      
      if (chart) {
        // セルにチャートを描画
        cellElement.innerHTML = '';
        cellElement.classList.add('chart-cell');
        
        const chartContainer = document.createElement('div');
        chartContainer.className = 'chart-container';
        cellElement.appendChild(chartContainer);
        
        this.chartRenderer.renderChart(chart, chartContainer);
        return true; // セルの標準レンダリングをオーバーライド
      }
      
      return false; // 標準レンダリングを継続
    }
  },
  
  // プラグイン固有のAPI
  createChart(type, dataRange, position) {
    const chartId = `chart-${Date.now()}`;
    
    // Handsontableインスタンスを取得
    const hotInstance = this.registry.hotInstance;
    if (!hotInstance) {
      console.warn('チャート作成エラー: Handsontableインスタンスが見つかりません');
      return null;
    }
    
    // チャートデータを準備
    const chartData = this.chartRenderer.prepareChartData(hotInstance, dataRange, {
      hasHeaders: true,
      headerAxis: 'both',
      dataOrientation: 'columns'
    });
    
    if (!chartData) {
      console.warn('チャート作成エラー: データを準備できませんでした');
      return null;
    }
    
    const chart = {
      id: chartId,
      type,
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Chart`,
      dataRange,
      data: chartData,
      position,
      size: { width: 400, height: 300 },
      options: {}
    };
    
    this.charts.push(chart);
    console.log(`チャート作成: ${chartId}`, chart);
    return chartId;
  },
  
  updateChart(chartId, options) {
    const chartIndex = this.charts.findIndex(c => c.id === chartId);
    if (chartIndex >= 0) {
      this.charts[chartIndex] = {
        ...this.charts[chartIndex],
        ...options
      };
      return true;
    }
    return false;
  },
  
  deleteChart(chartId) {
    const chartIndex = this.charts.findIndex(c => c.id === chartId);
    if (chartIndex >= 0) {
      this.charts.splice(chartIndex, 1);
      return true;
    }
    return false;
  }
};

export default chartPlugin;