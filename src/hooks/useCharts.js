import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useSpreadsheet } from '../context/SpreadsheetContext';
import useSpreadsheetData from './useSpreadsheetData';

/**
 * チャート機能を管理するためのカスタムフック
 */
const useCharts = () => {
  const { state, dispatch, actionTypes } = useSpreadsheet();
  const { updateStatusMessage } = useSpreadsheetData();
  
  /**
   * チャートを追加する
   * @param {Object} chartConfig チャート設定
   * @returns {string} 追加されたチャートのID
   */
  const addChart = useCallback((chartConfig) => {
    if (!chartConfig) return null;
    
    const chartId = uuidv4();
    const newChart = {
      id: chartId,
      title: chartConfig.title || '新しいチャート',
      type: chartConfig.type || 'bar',
      dataRange: chartConfig.dataRange,
      sheetId: chartConfig.sheetId || state.currentSheet,
      options: chartConfig.options || {},
      position: chartConfig.position || { x: 0, y: 0 },
      size: chartConfig.size || { width: 400, height: 300 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    dispatch({
      type: actionTypes.ADD_CHART,
      payload: newChart
    });
    
    updateStatusMessage('チャートを追加しました', 3000);
    return chartId;
  }, [state.currentSheet, dispatch, actionTypes, updateStatusMessage]);
  
  /**
   * チャートを更新する
   * @param {string} chartId チャートID
   * @param {Object} chartConfig 更新するチャート設定
   */
  const updateChart = useCallback((chartId, chartConfig) => {
    if (!chartId || !chartConfig) return;
    
    // 既存のチャートを検索
    const existingChart = state.charts.find(chart => chart.id === chartId);
    if (!existingChart) {
      updateStatusMessage('更新するチャートが見つかりません', 3000);
      return;
    }
    
    const updatedChart = {
      ...existingChart,
      ...chartConfig,
      updatedAt: new Date().toISOString()
    };
    
    dispatch({
      type: actionTypes.UPDATE_CHART,
      payload: {
        id: chartId,
        chartData: updatedChart
      }
    });
    
    updateStatusMessage('チャートを更新しました', 3000);
  }, [state.charts, dispatch, actionTypes, updateStatusMessage]);
  
  /**
   * チャートを削除する
   * @param {string} chartId チャートID
   */
  const removeChart = useCallback((chartId) => {
    if (!chartId) return;
    
    // 既存のチャートを検索
    const existingChart = state.charts.find(chart => chart.id === chartId);
    if (!existingChart) {
      updateStatusMessage('削除するチャートが見つかりません', 3000);
      return;
    }
    
    dispatch({
      type: actionTypes.REMOVE_CHART,
      payload: chartId
    });
    
    updateStatusMessage('チャートを削除しました', 3000);
  }, [state.charts, dispatch, actionTypes, updateStatusMessage]);
  
  /**
   * 現在のシートに関連するすべてのチャートを取得する
   * @returns {Array} チャートの配列
   */
  const getCurrentSheetCharts = useCallback(() => {
    return state.charts.filter(chart => chart.sheetId === state.currentSheet);
  }, [state.currentSheet, state.charts]);
  
  /**
   * チャートデータを準備する
   * @param {Object} hotInstance Handsontableインスタンス
   * @param {Object} dataRange {startRow, startCol, endRow, endCol}
   * @param {Object} options オプション
   * @returns {Object} チャートデータ
   */
  const prepareChartData = useCallback((hotInstance, dataRange, options = {}) => {
    if (!hotInstance || !dataRange) return null;
    
    const { startRow, startCol, endRow, endCol } = dataRange;
    const {
      hasHeaders = true,
      headerAxis = 'both',
      dataOrientation = 'columns'
    } = options;
    
    // データを取得
    const data = [];
    for (let row = startRow; row <= endRow; row++) {
      const rowData = [];
      for (let col = startCol; col <= endCol; col++) {
        const cellValue = hotInstance.getDataAtCell(row, col);
        rowData.push(cellValue);
      }
      data.push(rowData);
    }
    
    // ヘッダー行/列を処理
    let rowHeaders = [];
    let columnHeaders = [];
    
    if (hasHeaders) {
      if (headerAxis === 'row' || headerAxis === 'both') {
        // 最初の列をヘッダーとして使用
        rowHeaders = data.map(row => row[0]);
        
        // ヘッダー列を除去
        data.forEach(row => row.shift());
      }
      
      if (headerAxis === 'column' || headerAxis === 'both') {
        // 最初の行をヘッダーとして使用
        columnHeaders = data[0];
        
        // ヘッダー行を除去
        data.shift();
      }
    }
    
    // データの向きを処理
    let chartData;
    if (dataOrientation === 'columns') {
      // 列ごとのデータ（デフォルト）
      chartData = {
        labels: rowHeaders,
        datasets: columnHeaders.map((header, index) => ({
          label: header,
          data: data.map(row => row[index])
        }))
      };
    } else {
      // 行ごとのデータ
      chartData = {
        labels: columnHeaders,
        datasets: data.map((row, index) => ({
          label: rowHeaders[index] || `データセット ${index + 1}`,
          data: row
        }))
      };
    }
    
    return chartData;
  }, []);
  
  /**
   * チャート設定を作成する
   * @param {string} type チャートタイプ
   * @param {Object} data チャートデータ
   * @param {Object} options カスタムオプション
   * @returns {Object} Chart.js設定オブジェクト
   */
  const createChartConfig = useCallback((type, data, options = {}) => {
    // Chart.jsの設定を返す
    return {
      type,
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        ...options
      }
    };
  }, []);
  
  return {
    charts: state.charts,
    currentSheetCharts: getCurrentSheetCharts(),
    addChart,
    updateChart,
    removeChart,
    prepareChartData,
    createChartConfig
  };
};

export default useCharts;