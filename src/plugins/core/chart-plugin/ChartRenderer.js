import Chart from 'chart.js/auto';
import { numToLetter } from '../../../utils/cellUtils';

class ChartRenderer {
  constructor(plugin) {
    this.plugin = plugin;
    this.chartInstances = {};
    console.log('ChartRenderer initialized');
  }

  // データ範囲からチャートデータを準備する
  prepareChartData(hotInstance, dataRange, options = {}) {
    if (!hotInstance || !dataRange) return null;
    
    const { startRow, startCol, endRow, endCol } = dataRange;
    const {
      hasHeaders = true,
      headerAxis = 'both',
      dataOrientation = 'columns'
    } = options;
    
    // データを取得
    const rawData = [];
    for (let row = startRow; row <= endRow; row++) {
      const rowData = [];
      for (let col = startCol; col <= endCol; col++) {
        const cellValue = hotInstance.getDataAtCell(row, col);
        // 数値に変換可能であれば変換
        const parsedValue = !isNaN(parseFloat(cellValue)) ? parseFloat(cellValue) : cellValue;
        rowData.push(parsedValue);
      }
      rawData.push(rowData);
    }
    
    // データがない場合
    if (!rawData.length) return null;
    
    // ヘッダーとデータを分離
    let labels = [];
    let datasets = [];
    let dataValues = [...rawData];
    
    if (hasHeaders) {
      if (headerAxis === 'row' || headerAxis === 'both') {
        // 最初の列をラベルとして使用
        labels = dataValues.map(row => row[0]);
        
        // データから最初の列を除外
        dataValues = dataValues.map(row => row.slice(1));
      }
      
      if (headerAxis === 'column' || headerAxis === 'both') {
        // 最初の行をデータセットラベルとして使用
        const headerRow = dataValues[0];
        
        // データから最初の行を除外
        dataValues = dataValues.slice(1);
        
        // 列の向きでデータセットを作成
        if (dataOrientation === 'columns') {
          datasets = [];
          for (let i = headerAxis === 'both' ? 1 : 0; i < headerRow.length; i++) {
            datasets.push({
              label: headerRow[i] || `Dataset ${i + 1}`,
              data: dataValues.map(row => row[i]),
              backgroundColor: this.getRandomColor()
            });
          }
        } else {
          // 行の向きの場合はラベルが列ヘッダー
          if (labels.length === 0) {
            labels = headerRow.slice(headerAxis === 'both' ? 1 : 0);
          }
        }
      }
    }
    
    // ヘッダーが指定されていない場合は自動生成
    if (labels.length === 0) {
      if (dataOrientation === 'columns') {
        // 行インデックスをラベルとして使用
        labels = dataValues.map((_, index) => `Row ${startRow + index + 1}`);
      } else {
        // 列インデックスをラベルとして使用
        labels = Array.from(
          { length: dataValues[0].length },
          (_, index) => numToLetter(startCol + index)
        );
      }
    }
    
    // データセットがまだ作成されていない場合（行向き、またはヘッダーなし）
    if (datasets.length === 0) {
      if (dataOrientation === 'columns') {
        // 列ごとにデータセットを作成
        for (let i = 0; i < dataValues[0].length; i++) {
          datasets.push({
            label: `Dataset ${i + 1}`,
            data: dataValues.map(row => row[i]),
            backgroundColor: this.getRandomColor()
          });
        }
      } else {
        // 行ごとにデータセットを作成
        datasets = dataValues.map((row, index) => ({
          label: `Dataset ${index + 1}`,
          data: row,
          backgroundColor: this.getRandomColor()
        }));
      }
    }
    
    return { labels, datasets };
  }

  // チャートを描画する
  renderChart(chart, element) {
    if (!element) return;
    
    try {
      // 既存のチャートを破棄
      if (this.chartInstances[chart.id]) {
        this.chartInstances[chart.id].destroy();
      }
      
      // コンテナを設定
      element.innerHTML = '';
      const canvas = document.createElement('canvas');
      canvas.width = chart.size?.width || 400;
      canvas.height = chart.size?.height || 300;
      element.appendChild(canvas);
      
      // チャートの設定
      const config = {
        type: chart.type,
        data: chart.data || {
          labels: ['データなし'],
          datasets: [{
            label: 'サンプル',
            data: [0],
            backgroundColor: this.getRandomColor()
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: !!chart.title,
              text: chart.title || ''
            }
          },
          ...chart.options
        }
      };
      
      // チャートを作成
      this.chartInstances[chart.id] = new Chart(canvas, config);
      
      console.log(`チャート描画: ${chart.id}`, chart);
    } catch (error) {
      console.error('チャート描画エラー:', error);
      element.innerHTML = '<div class="chart-error">チャート描画エラー</div>';
    }
  }

  // ランダムな色を生成
  getRandomColor() {
    const r = Math.floor(Math.random() * 255);
    const g = Math.floor(Math.random() * 255);
    const b = Math.floor(Math.random() * 255);
    return `rgba(${r}, ${g}, ${b}, 0.7)`;
  }
  
  // チャートインスタンスをクリーンアップ
  cleanup() {
    Object.values(this.chartInstances).forEach(instance => {
      if (instance) instance.destroy();
    });
    this.chartInstances = {};
  }
}

export default ChartRenderer;