// src/plugins/core/chart-plugin/ChartRenderer.js
import Chart from 'chart.js/auto';
import { numToLetter } from '../../../utils/cellUtils';

class ChartRenderer {
  constructor(plugin) {
    this.plugin = plugin;
    this.chartInstances = {};
    this.defaultColors = [
      'rgba(75, 192, 192, 0.7)',
      'rgba(255, 99, 132, 0.7)',
      'rgba(54, 162, 235, 0.7)',
      'rgba(255, 206, 86, 0.7)',
      'rgba(153, 102, 255, 0.7)',
      'rgba(255, 159, 64, 0.7)',
      'rgba(76, 175, 80, 0.7)',
      'rgba(121, 85, 72, 0.7)',
      'rgba(33, 150, 243, 0.7)',
      'rgba(156, 39, 176, 0.7)'
    ];
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
        const headerData = dataValues[0] || [];
        
        // データから最初の行を除外
        dataValues = dataValues.slice(1);
        
        // 列の向きでデータセットを作成
        if (dataOrientation === 'columns') {
          datasets = [];
          for (let i = headerAxis === 'both' ? 1 : 0; i < headerData.length; i++) {
            datasets.push({
              label: headerData[i] || `Dataset ${i + 1}`,
              data: dataValues.map(row => row[i]),
              backgroundColor: this.getColorForIndex(i),
              borderColor: this.getColorForIndex(i, 1.0),
              borderWidth: 1
            });
          }
        } else {
          // 行の向きの場合はラベルが列ヘッダー
          if (labels.length === 0) {
            labels = headerData.slice(headerAxis === 'both' ? 1 : 0);
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
          { length: dataValues[0] ? dataValues[0].length : 0 },
          (_, index) => numToLetter(startCol + index)
        );
      }
    }
    
    // データセットがまだ作成されていない場合（行向き、またはヘッダーなし）
    if (datasets.length === 0) {
      if (dataOrientation === 'columns') {
        // 列ごとにデータセットを作成
        const columnCount = dataValues[0] ? dataValues[0].length : 0;
        for (let i = 0; i < columnCount; i++) {
          datasets.push({
            label: `Dataset ${i + 1}`,
            data: dataValues.map(row => row[i]),
            backgroundColor: this.getColorForIndex(i),
            borderColor: this.getColorForIndex(i, 1.0),
            borderWidth: 1
          });
        }
      } else {
        // 行ごとにデータセットを作成
        datasets = dataValues.map((row, index) => ({
          label: hasHeaders && headerAxis === 'row' ? `${labels[index]}` : `Dataset ${index + 1}`,
          data: row,
          backgroundColor: this.getColorForIndex(index),
          borderColor: this.getColorForIndex(index, 1.0),
          borderWidth: 1
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
        delete this.chartInstances[chart.id];
      }
      
      // コンテナを設定
      element.innerHTML = '';
      const canvas = document.createElement('canvas');
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      element.appendChild(canvas);
      
      // チャートタイプに基づいてカスタム設定を適用
      const chartOptions = this.getChartTypeOptions(chart.type, chart.options);
      
      // チャートの設定
      const config = {
        type: chart.type,
        data: {
          labels: chart.data.labels,
          datasets: chart.data.datasets
        },
        options: {
          ...chartOptions,
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            duration: 500
          },
          plugins: {
            title: {
              display: !!chart.title,
              text: chart.title || '',
              font: {
                size: 16,
                weight: 'bold'
              },
              padding: {
                top: 10,
                bottom: 10
              }
            },
            legend: {
              display: chart.options?.plugins?.legend?.display !== false,
              position: chart.options?.plugins?.legend?.position || 'top'
            },
            tooltip: {
              enabled: true,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              titleFont: {
                size: 14
              },
              bodyFont: {
                size: 13
              },
              padding: 10,
              cornerRadius: 4,
              displayColors: true
            }
          }
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

  // チャートタイプに合わせたオプションを取得
  getChartTypeOptions(type, userOptions = {}) {
    const baseOptions = {};
    
    switch (type) {
      case 'bar':
        return {
          ...baseOptions,
          scales: {
            y: {
              beginAtZero: true
            }
          },
          ...userOptions
        };
        
      case 'line':
        return {
          ...baseOptions,
          elements: {
            line: {
              tension: 0.2 // 滑らかさ調整
            },
            point: {
              radius: 3,
              hoverRadius: 5
            }
          },
          scales: {
            y: {
              beginAtZero: true
            }
          },
          ...userOptions
        };
        
      case 'pie':
      case 'doughnut':
        return {
          ...baseOptions,
          cutout: type === 'doughnut' ? '50%' : undefined,
          ...userOptions
        };
        
      case 'radar':
        return {
          ...baseOptions,
          elements: {
            line: {
              tension: 0.2
            }
          },
          ...userOptions
        };
        
      case 'polarArea':
        return {
          ...baseOptions,
          startAngle: -0.5 * Math.PI,
          ...userOptions
        };
        
      case 'scatter':
        return {
          ...baseOptions,
          scales: {
            x: {
              type: 'linear',
              position: 'bottom'
            }
          },
          ...userOptions
        };
        
      case 'bubble':
        return {
          ...baseOptions,
          scales: {
            x: {
              type: 'linear',
              position: 'bottom'
            }
          },
          ...userOptions
        };
        
      default:
        return {
          ...baseOptions,
          ...userOptions
        };
    }
  }

  // インデックスに対応する色を取得
  getColorForIndex(index, alpha = 0.7) {
    if (index < this.defaultColors.length) {
      if (alpha !== 0.7) {
        return this.defaultColors[index].replace(/[\d.]+\)$/, `${alpha})`);
      }
      return this.defaultColors[index];
    }
    
    // 色が足りない場合はランダムに生成
    return this.getRandomColor(alpha);
  }

  // ランダムな色を生成
  getRandomColor(alpha = 0.7) {
    const r = Math.floor(Math.random() * 255);
    const g = Math.floor(Math.random() * 255);
    const b = Math.floor(Math.random() * 255);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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