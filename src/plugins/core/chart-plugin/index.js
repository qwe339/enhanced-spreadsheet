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
  },
  
  // プラグイン後処理
  cleanup() {
    console.log('Chart plugin cleanup');
    // リソースの解放などの処理
  },
  
  // フック定義
  hooks: {
    // メニュー拡張
    'menu:extend': (menuConfig) => {
      menuConfig.items.push({
        id: 'insert',
        label: '挿入',
        submenu: [
          {
            id: 'insert-chart',
            label: 'グラフ',
            action: () => {
              // チャート挿入ダイアログを表示
              document.dispatchEvent(new CustomEvent('show-chart-dialog'));
            }
          }
        ]
      });
      return menuConfig;
    },
    
    // ツールバー拡張
    'toolbar:extend': (toolbarConfig) => {
      toolbarConfig.items.push({
        id: 'chart-button',
        tooltip: 'グラフを挿入',
        icon: '<svg>...</svg>', // チャートアイコン
        action: () => {
          document.dispatchEvent(new CustomEvent('show-chart-dialog'));
        }
      });
      return toolbarConfig;
    },
    
    // セルレンダリングをカスタマイズ
    'cell:render': (cellData, cellElement, rowIndex, colIndex) => {
      // チャートがこのセルに存在するか確認
      const chart = this.charts.find(c => 
        c.position.row === rowIndex && c.position.col === colIndex
      );
      
      if (chart) {
        // セルにチャートを描画
        this.chartRenderer.renderChart(chart, cellElement);
        return true; // セルの標準レンダリングをオーバーライド
      }
      
      return false; // 標準レンダリングを継続
    }
  },
  
  // プラグイン固有のAPI
  createChart(type, dataRange, position) {
    const chartId = `chart-${Date.now()}`;
    const chart = {
      id: chartId,
      type,
      dataRange,
      position,
      options: {}
    };
    
    this.charts.push(chart);
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