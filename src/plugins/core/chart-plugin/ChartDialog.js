import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import Chart from 'chart.js/auto';

class ChartDialog {
  constructor(plugin) {
    this.plugin = plugin;
    this.dialog = null;
    console.log('ChartDialog initialized');
  }
  
  show(hotInstance) {
    this.removeDialog();
    
    // ダイアログのルート要素を作成
    const dialogRoot = document.createElement('div');
    dialogRoot.className = 'chart-dialog-overlay';
    document.body.appendChild(dialogRoot);
    
    // 選択範囲を取得
    const selectedRange = hotInstance ? hotInstance.getSelected() : null;
    let defaultRange = { startRow: 0, startCol: 0, endRow: 5, endCol: 5 };
    
    if (selectedRange && selectedRange.length > 0) {
      defaultRange = {
        startRow: Math.min(selectedRange[0][0], selectedRange[0][2]),
        startCol: Math.min(selectedRange[0][1], selectedRange[0][3]),
        endRow: Math.max(selectedRange[0][0], selectedRange[0][2]),
        endCol: Math.max(selectedRange[0][1], selectedRange[0][3])
      };
    }
    
    // Reactコンポーネントをレンダリング
    const DialogContent = () => {
      const [chartType, setChartType] = useState('bar');
      const [title, setTitle] = useState('新しいチャート');
      const [dataRange, setDataRange] = useState(defaultRange);
      const [hasHeaders, setHasHeaders] = useState(true);
      const [headerAxis, setHeaderAxis] = useState('both');
      const [dataOrientation, setDataOrientation] = useState('columns');
      const [previewReady, setPreviewReady] = useState(false);
      
      // プレビューキャンバスの参照
      const previewCanvasRef = React.useRef(null);
      const chartInstanceRef = React.useRef(null);
      
      // データ範囲を文字列で表示
      const rangeStr = `${dataRange.startCol}${dataRange.startRow + 1}:${dataRange.endCol}${dataRange.endRow + 1}`;
      
      // プレビュー更新
      React.useEffect(() => {
        if (previewCanvasRef.current && hotInstance) {
          try {
            // 古いチャートインスタンスを破棄
            if (chartInstanceRef.current) {
              chartInstanceRef.current.destroy();
            }
            
            // データを準備
            const chartData = this.plugin.chartRenderer.prepareChartData(
              hotInstance, 
              dataRange, 
              { hasHeaders, headerAxis, dataOrientation }
            );
            
            if (!chartData) {
              setPreviewReady(false);
              return;
            }
            
            // チャート設定
            const config = {
              type: chartType,
              data: chartData,
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  title: {
                    display: title !== '',
                    text: title
                  }
                }
              }
            };
            
            // チャート作成
            chartInstanceRef.current = new Chart(previewCanvasRef.current, config);
            setPreviewReady(true);
          } catch (e) {
            console.error('チャートプレビューエラー:', e);
            setPreviewReady(false);
          }
        }
      }, [chartType, title, dataRange, hasHeaders, headerAxis, dataOrientation]);
      
      const handleApply = () => {
        // チャートデータを作成
        const chartConfig = {
          title,
          type: chartType,
          dataRange,
          options: {
            hasHeaders,
            headerAxis,
            dataOrientation
          },
          position: { row: dataRange.startRow, col: dataRange.endCol + 1 },
          size: { width: 400, height: 300 }
        };
        
        // プラグインにチャートを追加
        this.plugin.createChart(chartType, dataRange, chartConfig.position);
        
        // ダイアログを閉じる
        this.removeDialog();
        
        // チャートを描画するためのイベントを発火
        document.dispatchEvent(new CustomEvent('spreadsheet-render'));
      };
      
      const handleClose = () => {
        this.removeDialog();
      };
      
      return (
        <div className="chart-dialog">
          <div className="chart-dialog-header">
            <h2>チャートの挿入</h2>
            <button className="chart-dialog-close" onClick={handleClose}>×</button>
          </div>
          
          <div className="chart-dialog-body">
            <div className="chart-config-section">
              <div className="chart-form-group">
                <label>チャートタイプ：</label>
                <select 
                  value={chartType} 
                  onChange={(e) => setChartType(e.target.value)}
                  className="chart-select"
                >
                  <option value="bar">棒グラフ</option>
                  <option value="line">線グラフ</option>
                  <option value="pie">円グラフ</option>
                  <option value="radar">レーダーチャート</option>
                  <option value="polarArea">極座標チャート</option>
                  <option value="doughnut">ドーナツチャート</option>
                  <option value="scatter">散布図</option>
                </select>
              </div>
              
              <div className="chart-form-group">
                <label>タイトル：</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)}
                  className="chart-input"
                />
              </div>
              
              <div className="chart-form-group">
                <label>データ範囲：</label>
                <span className="chart-range-display">{rangeStr}</span>
              </div>
              
              <div className="chart-form-group">
                <label>
                  <input 
                    type="checkbox" 
                    checked={hasHeaders} 
                    onChange={(e) => setHasHeaders(e.target.checked)}
                  />
                  ヘッダーを含む
                </label>
              </div>
              
              {hasHeaders && (
                <div className="chart-form-group">
                  <label>ヘッダー位置：</label>
                  <select 
                    value={headerAxis} 
                    onChange={(e) => setHeaderAxis(e.target.value)}
                    className="chart-select"
                  >
                    <option value="row">行のみ</option>
                    <option value="column">列のみ</option>
                    <option value="both">両方</option>
                  </select>
                </div>
              )}
              
              <div className="chart-form-group">
                <label>データの向き：</label>
                <select 
                  value={dataOrientation} 
                  onChange={(e) => setDataOrientation(e.target.value)}
                  className="chart-select"
                >
                  <option value="columns">列</option>
                  <option value="rows">行</option>
                </select>
              </div>
            </div>
            
            <div className="chart-preview-section">
              <h3>プレビュー</h3>
              <div className="chart-preview-container">
                {previewReady ? (
                  <canvas ref={previewCanvasRef} className="chart-preview-canvas" />
                ) : (
                  <div className="chart-preview-placeholder">
                    データを選択してチャートをプレビュー
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="chart-dialog-footer">
            <button className="chart-button chart-button-secondary" onClick={handleClose}>キャンセル</button>
            <button className="chart-button chart-button-primary" onClick={handleApply}>挿入</button>
          </div>
        </div>
      );
    };
    
    const handleOverlayClick = (e) => {
      if (e.target.className === 'chart-dialog-overlay') {
        this.removeDialog();
      }
    };
    
    // クリックイベントを追加
    dialogRoot.addEventListener('click', handleOverlayClick);
    
    // ダイアログを保存
    this.dialog = {
      root: dialogRoot,
      render: () => {
        import('react-dom').then(ReactDOM => {
          ReactDOM.createRoot(dialogRoot).render(<DialogContent />);
        });
      }
    };
    
    // レンダリング
    this.dialog.render();
  }
  
  removeDialog() {
    if (this.dialog && this.dialog.root) {
      document.body.removeChild(this.dialog.root);
      this.dialog = null;
    }
  }
}

export default ChartDialog;