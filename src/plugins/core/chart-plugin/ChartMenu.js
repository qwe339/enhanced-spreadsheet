class ChartMenu {
  constructor(plugin) {
    this.plugin = plugin;
    
    // チャートタイプのメニュー項目
    this.chartTypes = [
      { id: 'bar', label: '棒グラフ' },
      { id: 'line', label: '線グラフ' },
      { id: 'pie', label: '円グラフ' },
      { id: 'radar', label: 'レーダーチャート' },
      { id: 'scatter', label: '散布図' }
    ];
    
    console.log('ChartMenu initialized');
  }
  
  // メニュー構成を取得
  getMenuConfig() {
    return {
      id: 'chart',
      label: 'グラフ',
      items: [
        {
          id: 'insert-chart',
          label: 'グラフの挿入',
          action: () => this.showChartDialog()
        },
        { type: 'separator' },
        ...this.chartTypes.map(type => ({
          id: `chart-type-${type.id}`,
          label: type.label,
          action: () => this.insertChartOfType(type.id)
        }))
      ]
    };
  }
  
  // グラフダイアログを表示
  showChartDialog() {
    const hotInstance = this.getHotInstance();
    if (hotInstance) {
      this.plugin.chartDialog.show(hotInstance);
    } else {
      console.warn('Handsontableインスタンスが見つかりません');
    }
  }
  
  // 指定タイプのグラフを挿入
  insertChartOfType(chartType) {
    const hotInstance = this.getHotInstance();
    if (!hotInstance) {
      console.warn('Handsontableインスタンスが見つかりません');
      return;
    }
    
    const selectedRange = hotInstance.getSelected();
    if (!selectedRange || selectedRange.length === 0) {
      alert('グラフを作成するデータ範囲を選択してください');
      return;
    }
    
    const [startRow, startCol, endRow, endCol] = selectedRange[0];
    const dataRange = {
      startRow: Math.min(startRow, endRow),
      startCol: Math.min(startCol, endCol),
      endRow: Math.max(startRow, endRow),
      endCol: Math.max(startCol, endCol)
    };
    
    // チャートを作成
    this.plugin.createChart(chartType, dataRange, {
      row: dataRange.startRow,
      col: dataRange.endCol + 1
    });
    
    // グリッドを再描画
    document.dispatchEvent(new CustomEvent('spreadsheet-render'));
  }
  
  // Handsontableインスタンスを取得
  getHotInstance() {
    // プラグインを通じてHOTインスタンスを取得
    return this.plugin.registry?.hotInstance || null;
  }
}

export default ChartMenu;