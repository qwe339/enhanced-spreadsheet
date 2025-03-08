// src/plugins/core/chart-plugin/index.js
import ChartMenu from './ChartMenu';
import ChartDialog from './ChartDialog';
import ChartRenderer from './ChartRenderer';
import { v4 as uuidv4 } from 'uuid';
import './styles.css';

const chartPlugin = {
  name: 'チャートプラグイン',
  version: '1.0.0',
  author: 'Your Name',
  
  // プラグイン初期化
  initialize(registry) {
    console.log('Chart plugin initialized');
    this.registry = registry;
    this.charts = [];
    this.activeChart = null;
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
    
    // コンポーネントを初期化
    this.chartMenu = new ChartMenu(this);
    this.chartDialog = new ChartDialog(this);
    this.chartRenderer = new ChartRenderer(this);
    
    // チャートコンテナを作成
    this.createChartContainer();
    
    // イベントリスナーを設定
    this.setupEventListeners();
  },
  
  // プラグイン後処理
  cleanup() {
    console.log('Chart plugin cleanup');
    // リソースの解放などの処理
    this.chartRenderer.cleanup();
    this.removeEventListeners();
    this.removeChartContainer();
  },
  
  // チャートコンテナを作成
  createChartContainer() {
    // 既存のコンテナを確認
    if (document.getElementById('chart-container')) return;
    
    // コンテナ作成
    const container = document.createElement('div');
    container.id = 'chart-container';
    container.className = 'chart-container';
    document.body.appendChild(container);
  },
  
  // チャートコンテナを削除
  removeChartContainer() {
    const container = document.getElementById('chart-container');
    if (container) {
      document.body.removeChild(container);
    }
  },
  
  setupEventListeners() {
    // チャートダイアログ表示イベント
    this.handleShowChartDialog = () => {
      const hotInstance = this.registry.hotInstance;
      this.chartDialog.show(hotInstance);
    };
    
    // チャート選択イベント
    this.handleChartClick = (event) => {
      const chartEl = event.target.closest('.sheet-chart');
      if (!chartEl) return;
      
      const chartId = chartEl.getAttribute('data-chart-id');
      if (chartId) {
        event.stopPropagation();
        this.selectChart(chartId);
      }
    };
    
    // チャートドラッグ開始
    this.handleChartDragStart = (event) => {
      if (!this.activeChart) return;
      
      const chartEl = event.target.closest('.sheet-chart');
      if (!chartEl) return;
      
      // ドラッグ開始位置を記録
      this.isDragging = true;
      const chartRect = chartEl.getBoundingClientRect();
      this.dragOffset = {
        x: event.clientX - chartRect.left,
        y: event.clientY - chartRect.top
      };
      
      // ドラッグ中のスタイル適用
      chartEl.classList.add('chart-dragging');
      
      event.preventDefault();
    };
    
    // チャートドラッグ中
    this.handleChartDragMove = (event) => {
      if (!this.isDragging || !this.activeChart) return;
      
      const chartEl = document.querySelector(`.sheet-chart[data-chart-id="${this.activeChart}"]`);
      if (!chartEl) return;
      
      // 新しい位置を計算
      const containerRect = document.querySelector('.spreadsheet-grid-container').getBoundingClientRect();
      const newLeft = event.clientX - containerRect.left - this.dragOffset.x;
      const newTop = event.clientY - containerRect.top - this.dragOffset.y;
      
      // 位置を更新
      chartEl.style.left = `${newLeft}px`;
      chartEl.style.top = `${newTop}px`;
      
      event.preventDefault();
    };
    
    // チャートドラッグ終了
    this.handleChartDragEnd = (event) => {
      if (!this.isDragging || !this.activeChart) return;
      
      const chartEl = document.querySelector(`.sheet-chart[data-chart-id="${this.activeChart}"]`);
      if (!chartEl) return;
      
      // ドラッグフラグをリセット
      this.isDragging = false;
      
      // スタイルを元に戻す
      chartEl.classList.remove('chart-dragging');
      
      // チャート位置を更新
      const containerRect = document.querySelector('.spreadsheet-grid-container').getBoundingClientRect();
      const newLeft = event.clientX - containerRect.left - this.dragOffset.x;
      const newTop = event.clientY - containerRect.top - this.dragOffset.y;
      
      // チャートオブジェクトを更新
      this.updateChartPosition(this.activeChart, { left: newLeft, top: newTop });
      
      event.preventDefault();
    };
    
    // チャート削除イベント
    this.handleChartDelete = (event) => {
      const deleteBtn = event.target.closest('.chart-delete-btn');
      if (!deleteBtn) return;
      
      const chartEl = deleteBtn.closest('.sheet-chart');
      if (!chartEl) return;
      
      const chartId = chartEl.getAttribute('data-chart-id');
      if (chartId) {
        event.stopPropagation();
        
        if (window.confirm('このチャートを削除してもよろしいですか？')) {
          this.deleteChart(chartId);
        }
      }
    };
    
    // チャートリサイズイベント
    this.handleChartResize = (event) => {
      const resizeHandle = event.target.closest('.chart-resize-handle');
      if (!resizeHandle) return;
      
      const chartEl = resizeHandle.closest('.sheet-chart');
      if (!chartEl) return;
      
      const chartId = chartEl.getAttribute('data-chart-id');
      if (!chartId) return;
      
      // リサイズ開始
      event.stopPropagation();
      event.preventDefault();
      
      const startX = event.clientX;
      const startY = event.clientY;
      const startWidth = chartEl.offsetWidth;
      const startHeight = chartEl.offsetHeight;
      
      // マウスムーブハンドラー（リサイズ中）
      const handleMouseMove = (moveEvent) => {
        moveEvent.preventDefault();
        
        // 新しいサイズを計算
        const newWidth = startWidth + (moveEvent.clientX - startX);
        const newHeight = startHeight + (moveEvent.clientY - startY);
        
        // 最小サイズを確保
        const width = Math.max(200, newWidth);
        const height = Math.max(150, newHeight);
        
        // サイズを適用
        chartEl.style.width = `${width}px`;
        chartEl.style.height = `${height}px`;
        
        // チャートを再描画
        const chartContainer = chartEl.querySelector('.sheet-chart-container');
        if (chartContainer) {
          const chart = this.charts.find(c => c.id === chartId);
          if (chart) {
            // チャートキャンバスのサイズを更新
            setTimeout(() => {
              this.chartRenderer.renderChart(chart, chartContainer);
            }, 0);
          }
        }
      };
      
      // マウスアップハンドラー（リサイズ終了）
      const handleMouseUp = (upEvent) => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        
        // チャートサイズを更新
        this.updateChartSize(chartId, {
          width: chartEl.offsetWidth,
          height: chartEl.offsetHeight
        });
      };
      
      // イベントリスナーを追加
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };
    
    // チャート編集イベント
    this.handleChartEdit = (event) => {
      const editBtn = event.target.closest('.chart-edit-btn');
      if (!editBtn) return;
      
      const chartEl = editBtn.closest('.sheet-chart');
      if (!chartEl) return;
      
      const chartId = chartEl.getAttribute('data-chart-id');
      if (chartId) {
        event.stopPropagation();
        this.editChart(chartId);
      }
    };
    
    // グローバルクリックイベント（チャート選択解除）
    this.handleDocumentClick = (event) => {
      if (!event.target.closest('.sheet-chart') && !event.target.closest('.chart-dialog')) {
        this.deselectAllCharts();
      }
    };
    
    // ウィンドウリサイズイベント
    this.handleWindowResize = () => {
      // すべてのチャートを再描画
      this.redrawAllCharts();
    };
    
    // スプレッドシート再描画イベント
    this.handleSpreadsheetRender = () => {
      // チャートの再描画
      this.redrawAllCharts();
    };
    
    // イベントリスナーを登録
    document.addEventListener('show-chart-dialog', this.handleShowChartDialog);
    document.addEventListener('click', this.handleDocumentClick);
    document.addEventListener('click', this.handleChartClick);
    document.addEventListener('mousedown', this.handleChartDragStart);
    document.addEventListener('mousemove', this.handleChartDragMove);
    document.addEventListener('mouseup', this.handleChartDragEnd);
    document.addEventListener('click', this.handleChartDelete);
    document.addEventListener('mousedown', this.handleChartResize);
    document.addEventListener('click', this.handleChartEdit);
    window.addEventListener('resize', this.handleWindowResize);
    document.addEventListener('spreadsheet-render', this.handleSpreadsheetRender);
  },
  
  removeEventListeners() {
    document.removeEventListener('show-chart-dialog', this.handleShowChartDialog);
    document.removeEventListener('click', this.handleDocumentClick);
    document.removeEventListener('click', this.handleChartClick);
    document.removeEventListener('mousedown', this.handleChartDragStart);
    document.removeEventListener('mousemove', this.handleChartDragMove);
    document.removeEventListener('mouseup', this.handleChartDragEnd);
    document.removeEventListener('click', this.handleChartDelete);
    document.removeEventListener('mousedown', this.handleChartResize);
    document.removeEventListener('click', this.handleChartEdit);
    window.removeEventListener('resize', this.handleWindowResize);
    document.removeEventListener('spreadsheet-render', this.handleSpreadsheetRender);
  },
  
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
    }
  },
  
  // チャートを作成
  createChart(type, dataRange, position = {}, options = {}) {
    const chartId = `chart-${uuidv4()}`;
    
    // Handsontableインスタンスを取得
    const hotInstance = this.registry.hotInstance;
    if (!hotInstance) {
      console.warn('チャート作成エラー: Handsontableインスタンスが見つかりません');
      return null;
    }
    
    // チャートデータを準備
    const chartData = this.chartRenderer.prepareChartData(hotInstance, dataRange, {
      hasHeaders: options.hasHeaders !== undefined ? options.hasHeaders : true,
      headerAxis: options.headerAxis || 'both',
      dataOrientation: options.dataOrientation || 'columns'
    });
    
    if (!chartData) {
      console.warn('チャート作成エラー: データを準備できませんでした');
      return null;
    }
    
    // 位置設定
    const containerRect = document.querySelector('.spreadsheet-grid-container').getBoundingClientRect();
    const left = position.left !== undefined ? position.left : containerRect.width / 2 - 200;
    const top = position.top !== undefined ? position.top : containerRect.height / 2 - 150;
    
    const chart = {
      id: chartId,
      type,
      title: options.title || `${type.charAt(0).toUpperCase() + type.slice(1)} Chart`,
      dataRange,
      data: chartData,
      position: { left, top },
      size: options.size || { width: 400, height: 300 },
      options: {
        plugins: {
          title: {
            display: true,
            text: options.title || `${type.charAt(0).toUpperCase() + type.slice(1)} Chart`
          },
          legend: {
            display: options.showLegend !== undefined ? options.showLegend : true,
            position: options.legendPosition || 'top'
          }
        },
        ...options
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.charts.push(chart);
    console.log(`チャート作成: ${chartId}`, chart);
    
    // チャート要素を作成して表示
    this.renderChartElement(chart);
    
    return chartId;
  },
  
  // チャート要素をレンダリング
  renderChartElement(chart) {
    const container = document.querySelector('.spreadsheet-grid-container');
    
    // 既存のチャート要素をチェック
    let chartEl = document.querySelector(`.sheet-chart[data-chart-id="${chart.id}"]`);
    
    if (!chartEl) {
      // 新しいチャート要素を作成
      chartEl = document.createElement('div');
      chartEl.className = 'sheet-chart';
      chartEl.setAttribute('data-chart-id', chart.id);
      container.appendChild(chartEl);
    }
    
    // チャート位置とサイズを設定
    chartEl.style.left = `${chart.position.left}px`;
    chartEl.style.top = `${chart.position.top}px`;
    chartEl.style.width = `${chart.size.width}px`;
    chartEl.style.height = `${chart.size.height}px`;
    
    // チャート内部のHTMLを設定
    chartEl.innerHTML = `
      <div class="sheet-chart-header">
        <h3 class="sheet-chart-title">${chart.title}</h3>
        <div class="sheet-chart-actions">
          <button class="sheet-chart-button chart-edit-btn" title="編集">✏️</button>
          <button class="sheet-chart-button chart-delete-btn" title="削除">🗑️</button>
        </div>
      </div>
      <div class="sheet-chart-container"></div>
      <div class="chart-resize-handle"></div>
    `;
    
    // チャートを描画
    const chartContainer = chartEl.querySelector('.sheet-chart-container');
    this.chartRenderer.renderChart(chart, chartContainer);
    
    return chartEl;
  },
  
  // チャートを更新
  updateChart(chartId, updates) {
    const chartIndex = this.charts.findIndex(c => c.id === chartId);
    if (chartIndex < 0) return false;
    
    // 更新前のチャート
    const oldChart = this.charts[chartIndex];
    
    // データの更新が必要かチェック
    const needsDataUpdate = 
      updates.dataRange || 
      updates.type || 
      (updates.options && (
        updates.options.hasHeaders !== undefined ||
        updates.options.headerAxis !== undefined ||
        updates.options.dataOrientation !== undefined
      ));
    
    // 更新後のチャート
    const updatedChart = {
      ...oldChart,
      ...updates,
      options: { ...oldChart.options, ...(updates.options || {}) },
      updatedAt: new Date().toISOString()
    };
    
    // データレンジが変更された場合はデータを再生成
    if (needsDataUpdate) {
      const hotInstance = this.registry.hotInstance;
      if (hotInstance) {
        const dataRange = updatedChart.dataRange;
        const chartData = this.chartRenderer.prepareChartData(
          hotInstance, 
          dataRange,
          {
            hasHeaders: updatedChart.options.hasHeaders !== undefined 
              ? updatedChart.options.hasHeaders 
              : true,
            headerAxis: updatedChart.options.headerAxis || 'both',
            dataOrientation: updatedChart.options.dataOrientation || 'columns'
          }
        );
        
        if (chartData) {
          updatedChart.data = chartData;
        }
      }
    }
    
    // チャートを更新
    this.charts[chartIndex] = updatedChart;
    
    // チャート要素を再レンダリング
    this.renderChartElement(updatedChart);
    
    return true;
  },
  
  // チャート位置を更新
  updateChartPosition(chartId, position) {
    return this.updateChart(chartId, { position });
  },
  
  // チャートサイズを更新
  updateChartSize(chartId, size) {
    return this.updateChart(chartId, { size });
  },
  
  // チャートを削除
  deleteChart(chartId) {
    const chartIndex = this.charts.findIndex(c => c.id === chartId);
    if (chartIndex < 0) return false;
    
    // チャートリストから削除
    this.charts.splice(chartIndex, 1);
    
    // DOM要素を削除
    const chartEl = document.querySelector(`.sheet-chart[data-chart-id="${chartId}"]`);
    if (chartEl) {
      chartEl.remove();
    }
    
    // アクティブチャートをリセット
    if (this.activeChart === chartId) {
      this.activeChart = null;
    }
    
    return true;
  },
  
  // チャートを選択
  selectChart(chartId) {
    // 以前の選択を解除
    this.deselectAllCharts();
    
    // 新しいチャートを選択
    const chartEl = document.querySelector(`.sheet-chart[data-chart-id="${chartId}"]`);
    if (chartEl) {
      chartEl.classList.add('chart-selected');
      this.activeChart = chartId;
    }
  },
  
  // すべてのチャート選択を解除
  deselectAllCharts() {
    document.querySelectorAll('.sheet-chart').forEach(el => {
      el.classList.remove('chart-selected');
    });
    this.activeChart = null;
  },
  
  // チャートを編集
  editChart(chartId) {
    const chart = this.charts.find(c => c.id === chartId);
    if (!chart) return;
    
    // チャート編集ダイアログを表示
    this.chartDialog.showEditDialog(chart);
  },
  
  // すべてのチャートを再描画
  redrawAllCharts() {
    this.charts.forEach(chart => {
      this.renderChartElement(chart);
    });
  },
  
  // セル参照をA1形式に変換
  getCellReference(row, col) {
    // 列のアルファベット部分を計算
    let colStr = '';
    let tempCol = col;
    
    do {
      const remainder = tempCol % 26;
      colStr = String.fromCharCode(65 + remainder) + colStr;
      tempCol = Math.floor(tempCol / 26) - 1;
    } while (tempCol >= 0);
    
    // 行番号は1から始まる
    return `${colStr}${row + 1}`;
  }
};

export default chartPlugin;