// src/plugins/core/chart-plugin/ChartDialog.js
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import Chart from 'chart.js/auto';

class ChartDialog {
  constructor(plugin) {
    this.plugin = plugin;
    this.dialog = null;
    this.editingChartId = null;
    console.log('ChartDialog initialized');
  }
  
  // 新規チャート作成ダイアログを表示
  show(hotInstance) {
    this.removeDialog();
    this.editingChartId = null;
    
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
    this.renderDialogContent(dialogRoot, {
      title: 'チャートの挿入',
      defaultChartType: 'bar',
      defaultTitle: 'グラフのタイトル',
      dataRange: defaultRange,
      hotInstance
    });
  }
  
  // チャート編集ダイアログを表示
  showEditDialog(chart) {
    this.removeDialog();
    this.editingChartId = chart.id;
    
    // ダイアログのルート要素を作成
    const dialogRoot = document.createElement('div');
    dialogRoot.className = 'chart-dialog-overlay';
    document.body.appendChild(dialogRoot);
    
    // Reactコンポーネントをレンダリング
    this.renderDialogContent(dialogRoot, {
      title: 'チャートの編集',
      defaultChartType: chart.type,
      defaultTitle: chart.title,
      dataRange: chart.dataRange,
      chartOptions: chart.options,
      hotInstance: this.plugin.registry.hotInstance,
      isEditing: true
    });
  }
  
  // ダイアログコンテンツをレンダリング
  renderDialogContent(dialogRoot, props) {
    const DialogContent = () => {
      // 状態管理
      const [activeTab, setActiveTab] = useState('data');
      const [chartType, setChartType] = useState(props.defaultChartType || 'bar');
      const [title, setTitle] = useState(props.defaultTitle || '新しいチャート');
      const [dataRange, setDataRange] = useState(props.dataRange || { startRow: 0, startCol: 0, endRow: 5, endCol: 5 });
      const [hasHeaders, setHasHeaders] = useState(props.chartOptions?.hasHeaders !== undefined ? props.chartOptions.hasHeaders : true);
      const [headerAxis, setHeaderAxis] = useState(props.chartOptions?.headerAxis || 'both');
      const [dataOrientation, setDataOrientation] = useState(props.chartOptions?.dataOrientation || 'columns');
      const [showLegend, setShowLegend] = useState(props.chartOptions?.plugins?.legend?.display !== false);
      const [legendPosition, setLegendPosition] = useState(props.chartOptions?.plugins?.legend?.position || 'top');
      const [previewReady, setPreviewReady] = useState(false);
      const [error, setError] = useState('');
      
      // プレビューキャンバスの参照
      const previewCanvasRef = useRef(null);
      const chartInstanceRef = useRef(null);
      
      // データ範囲を文字列で表示
      const rangeStr = `${this.plugin.getCellReference(dataRange.startRow, dataRange.startCol)}:${this.plugin.getCellReference(dataRange.endRow, dataRange.endCol)}`;
      
      // プレビュー更新
      useEffect(() => {
        if (previewCanvasRef.current && props.hotInstance) {
          try {
            // 古いチャートインスタンスを破棄
            if (chartInstanceRef.current) {
              chartInstanceRef.current.destroy();
            }
            
            // データを準備
            const chartData = this.plugin.chartRenderer.prepareChartData(
              props.hotInstance, 
              dataRange, 
              { hasHeaders, headerAxis, dataOrientation }
            );
            
            if (!chartData) {
              setPreviewReady(false);
              setError('選択範囲からチャートデータを生成できませんでした');
              return;
            }
            
            // エラーをクリア
            setError('');
            
            // チャート設定
            const chartOptions = this.plugin.chartRenderer.getChartTypeOptions(chartType);
            
            const config = {
              type: chartType,
              data: chartData,
              options: {
                ...chartOptions,
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  title: {
                    display: title !== '',
                    text: title,
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
                    display: showLegend,
                    position: legendPosition
                  }
                }
              }
            };
            
            // チャート作成
            chartInstanceRef.current = new Chart(previewCanvasRef.current, config);
            setPreviewReady(true);
          } catch (e) {
            console.error('チャートプレビューエラー:', e);
            setError('チャートプレビューの生成中にエラーが発生しました');
            setPreviewReady(false);
          }
        }
      }, [chartType, title, dataRange, hasHeaders, headerAxis, dataOrientation, showLegend, legendPosition]);
      
      // 適用ボタンのハンドラ
      const handleApply = () => {
        // チャートを作成または更新
        if (props.isEditing && this.editingChartId) {
          // 既存のチャートを更新
          this.plugin.updateChart(this.editingChartId, {
            type: chartType,
            title,
            dataRange,
            options: {
              hasHeaders,
              headerAxis,
              dataOrientation,
              plugins: {
                title: {
                  display: title !== '',
                  text: title
                },
                legend: {
                  display: showLegend,
                  position: legendPosition
                }
              }
            }
          });
        } else {
          // 新規チャート作成
          this.plugin.createChart(chartType, dataRange, undefined, {
            title,
            hasHeaders,
            headerAxis,
            dataOrientation,
            showLegend,
            legendPosition
          });
        }
        
        // ダイアログを閉じる
        this.removeDialog();
      };
      
      // キャンセルボタンのハンドラ
      const handleClose = () => {
        this.removeDialog();
      };
      
      return (
        <div className="chart-dialog">
          <div className="chart-dialog-header">
            <h2>{props.title}</h2>
            <button className="chart-dialog-close" onClick={handleClose}>×</button>
          </div>
          
          <div className="chart-tabs">
            <div 
              className={`chart-tab ${activeTab === 'data' ? 'active' : ''}`} 
              onClick={() => setActiveTab('data')}
            >
              データ
            </div>
            <div 
              className={`chart-tab ${activeTab === 'style' ? 'active' : ''}`} 
              onClick={() => setActiveTab('style')}
            >
              スタイル
            </div>
            <div 
              className={`chart-tab ${activeTab === 'advanced' ? 'active' : ''}`} 
              onClick={() => setActiveTab('advanced')}
            >
              詳細設定
            </div>
          </div>
          
          <div className="chart-dialog-body">
            <div className="chart-config-section">
              <div className={`chart-tab-content ${activeTab === 'data' ? 'active' : ''}`}>
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
                    <option value="doughnut">ドーナツチャート</option>
                    <option value="radar">レーダーチャート</option>
                    <option value="polarArea">極座標チャート</option>
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
              
              <div className={`chart-tab-content ${activeTab === 'style' ? 'active' : ''}`}>
                <div className="chart-form-group">
                  <label>凡例を表示：</label>
                  <input 
                    type="checkbox" 
                    checked={showLegend} 
                    onChange={(e) => setShowLegend(e.target.checked)}
                  />
                </div>
                
                {showLegend && (
                  <div className="chart-form-group">
                    <label>凡例の位置：</label>
                    <select 
                      value={legendPosition} 
                      onChange={(e) => setLegendPosition(e.target.value)}
                      className="chart-select"
                    >
                      <option value="top">上</option>
                      <option value="right">右</option>
                      <option value="bottom">下</option>
                      <option value="left">左</option>
                    </select>
                  </div>
                )}
                
                {/* 将来的に追加できる他のスタイル設定 */}
              </div>
              
              <div className={`chart-tab-content ${activeTab === 'advanced' ? 'active' : ''}`}>
                <p>詳細設定は今後のバージョンで追加される予定です。</p>
              </div>
            </div>
            
            <div className="chart-preview-section">
              <h3>プレビュー</h3>
              {error && (
                <div className="chart-error">{error}</div>
              )}
              <div className="chart-preview-container">
                {previewReady ? (
                  <canvas ref={previewCanvasRef} className="chart-preview-canvas" />
                ) : !error ? (
                  <div className="chart-preview-placeholder">
                    データを選択してチャートをプレビュー
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          
          <div className="chart-dialog-footer">
            <button className="chart-button chart-button-secondary" onClick={handleClose}>キャンセル</button>
            <button 
              className="chart-button chart-button-primary" 
              onClick={handleApply}
              disabled={!previewReady || !!error}
            >
              {props.isEditing ? '更新' : '挿入'}
            </button>
          </div>
        </div>
      );
    };
    
    // オーバーレイクリックとESCキーイベントの設定
    const handleOverlayClick = (e) => {
      if (e.target.className === 'chart-dialog-overlay') {
        this.removeDialog();
      }
    };
    
    // キーボードイベントリスナー
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        this.removeDialog();
      }
    };
    
    dialogRoot.addEventListener('click', handleOverlayClick);
    document.addEventListener('keydown', handleKeyDown);
    
    // ダイアログを保存
    this.dialog = {
      root: dialogRoot,
      cleanup: () => {
        dialogRoot.removeEventListener('click', handleOverlayClick);
        document.removeEventListener('keydown', handleKeyDown);
      }
    };
    
    // レンダリング
    createRoot(dialogRoot).render(<DialogContent />);
  }
  
  // ダイアログを削除
  removeDialog() {
    if (this.dialog) {
      this.dialog.cleanup();
      if (this.dialog.root && document.body.contains(this.dialog.root)) {
        document.body.removeChild(this.dialog.root);
      }
      this.dialog = null;
      this.editingChartId = null;
    }
  }
}

export default ChartDialog;