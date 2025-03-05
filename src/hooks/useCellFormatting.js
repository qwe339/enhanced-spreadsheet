import { useCallback } from 'react';
import { useSpreadsheet } from '../context/SpreadsheetContext';
import useSpreadsheetData from './useSpreadsheetData';
import useUndoRedo from './useUndoRedo';

/**
 * セルの書式設定を管理するためのカスタムフック
 */
const useCellFormatting = () => {
  const { state, dispatch, actionTypes } = useSpreadsheet();
  const { updateStatusMessage } = useSpreadsheetData();
  const { pushToUndoStack } = useUndoRedo();
  
  /**
   * セルのスタイルを取得する
   * @param {string} sheetId シートID
   * @param {number} row 行インデックス
   * @param {number} col 列インデックス
   * @returns {Object} スタイル情報
   */
  const getCellStyle = useCallback((sheetId, row, col) => {
    const cellKey = `${row},${col}`;
    const cellStyles = state.cellStyles[sheetId] || {};
    const className = cellStyles[cellKey] || '';
    
    // クラス名からスタイル情報を抽出
    const styles = {
      fontWeight: className.includes('font-bold') ? 'bold' : 'normal',
      fontStyle: className.includes('font-italic') ? 'italic' : 'normal',
      textDecoration: className.includes('text-underline') ? 'underline' : 'none',
      textAlign: className.includes('text-center') ? 'center' : 
                className.includes('text-right') ? 'right' : 'left',
      fontSize: className.includes('text-sm') ? 'small' : 
               className.includes('text-lg') ? 'large' : 'medium',
      color: '',  // CSSのクラスからは抽出できないため、空文字列をデフォルトとする
      backgroundColor: ''
    };
    
    return styles;
  }, [state.cellStyles]);
  
  /**
   * 選択範囲にスタイルを適用する
   * @param {Object} hotInstance Handsontableインスタンス
   * @param {Object} style スタイルオブジェクト
   */
  const applyStyleToSelection = useCallback((hotInstance, style) => {
    if (!hotInstance || hotInstance.isDestroyed) {
      console.warn('Handsontableインスタンスが無効です');
      return;
    }
    
    try {
      const selection = hotInstance.getSelected();
      if (!selection || selection.length === 0) {
        updateStatusMessage('適用するセルが選択されていません', 3000);
        return;
      }
      
      // 変更前の状態をアンドゥスタックに保存
      pushToUndoStack(hotInstance);
      
      // 選択範囲内のすべてのセルにスタイルを適用
      const currentSheet = state.currentSheet;
      const updatedStyles = { ...state.cellStyles[currentSheet] || {} };
      
      selection.forEach(coords => {
        const [row1, col1, row2, col2] = coords;
        
        for (let row = Math.min(row1, row2); row <= Math.max(row1, row2); row++) {
          for (let col = Math.min(col1, col2); col <= Math.max(col1, col2); col++) {
            // セルのキー
            const cellKey = `${row},${col}`;
            
            // 現在のスタイルを取得
            const currentStyle = updatedStyles[cellKey] || '';
            let newClassName = currentStyle;
            
            // スタイルに応じてクラス名を更新
            if (style.fontWeight) {
              if (style.fontWeight === 'bold' && !newClassName.includes('font-bold')) {
                newClassName += ' font-bold';
              } else if (style.fontWeight === 'normal') {
                newClassName = newClassName.replace(/font-bold/g, '');
              }
            }
            
            if (style.fontStyle) {
              if (style.fontStyle === 'italic' && !newClassName.includes('font-italic')) {
                newClassName += ' font-italic';
              } else if (style.fontStyle === 'normal') {
                newClassName = newClassName.replace(/font-italic/g, '');
              }
            }
            
            if (style.textDecoration) {
              if (style.textDecoration === 'underline' && !newClassName.includes('text-underline')) {
                newClassName += ' text-underline';
              } else if (style.textDecoration === 'none') {
                newClassName = newClassName.replace(/text-underline/g, '');
              }
            }
            
            // テキスト配置の設定
            if (style.textAlign) {
              // 既存の配置クラスを削除
              newClassName = newClassName
                .replace(/text-left|text-center|text-right/g, '')
                .trim();
              
              // 新しい配置クラスを追加
              newClassName += ` text-${style.textAlign}`;
            }
            
            // フォントサイズの設定
            if (style.fontSize) {
              // 既存のサイズクラスを削除
              newClassName = newClassName
                .replace(/text-sm|text-md|text-lg/g, '')
                .trim();
              
              // 新しいサイズクラスを追加
              const sizeClass = style.fontSize === 'small' ? 'text-sm' : 
                               style.fontSize === 'large' ? 'text-lg' : 'text-md';
              newClassName += ` ${sizeClass}`;
            }
            
            // クラス名の重複を防ぐためのクリーンアップ
            newClassName = newClassName
              .split(' ')
              .filter(Boolean)
              .filter((value, index, self) => self.indexOf(value) === index)
              .join(' ')
              .trim();
            
            // 更新したスタイルを保存
            if (newClassName) {
              updatedStyles[cellKey] = newClassName;
            } else {
              delete updatedStyles[cellKey];
            }
          }
        }
      });
      
      // スタイルの状態を更新
      dispatch({
        type: actionTypes.UPDATE_CELL_STYLES,
        payload: {
          sheetId: currentSheet,
          styles: updatedStyles
        }
      });
      
      // Handsontableの設定を更新してスタイルを適用
      if (!hotInstance.isDestroyed) {
        applyStylesToHandsontable(hotInstance, updatedStyles);
      }
      
      updateStatusMessage('書式を適用しました', 3000);
    } catch (error) {
      console.error('書式適用エラー:', error);
      updateStatusMessage('書式の適用中にエラーが発生しました', 3000);
    }
  }, [state.currentSheet, state.cellStyles, dispatch, actionTypes, pushToUndoStack, updateStatusMessage]);
  
  /**
   * Handsontableインスタンスにスタイルを適用する
   * @param {Object} hotInstance Handsontableインスタンス
   * @param {Object} styles スタイル情報
   */
  const applyStylesToHandsontable = useCallback((hotInstance, styles) => {
    if (!hotInstance || hotInstance.isDestroyed) {
      console.warn('Handsontableインスタンスが無効です');
      return;
    }
    
    try {
      // セルの設定を生成
      const cellConfig = Object.entries(styles).map(([cellKey, className]) => {
        const [rowStr, colStr] = cellKey.split(',');
        const row = parseInt(rowStr, 10);
        const col = parseInt(colStr, 10);
        
        return {
          row,
          col,
          className: className.trim()
        };
      });
      
      // 一括でスタイルを適用
      hotInstance.updateSettings({
        cell: cellConfig
      });
      
      // 明示的に再描画を強制
      hotInstance.render();
    } catch (error) {
      console.error('スタイル適用エラー:', error);
    }
  }, []);
  
  /**
   * 現在のシートのセルスタイルをHandsontableに適用する
   * @param {Object} hotInstance Handsontableインスタンス
   */
  const applyCurrentSheetStyles = useCallback((hotInstance) => {
    if (!hotInstance || hotInstance.isDestroyed) {
      console.warn('Handsontableインスタンスが無効です');
      return;
    }
    
    try {
      const currentStyles = state.cellStyles[state.currentSheet] || {};
      applyStylesToHandsontable(hotInstance, currentStyles);
    } catch (error) {
      console.error('現在のシートスタイル適用エラー:', error);
    }
  }, [state.currentSheet, state.cellStyles, applyStylesToHandsontable]);
  
  /**
   * 条件付き書式を追加する
   * @param {Object} format 条件付き書式の設定
   */
  const addConditionalFormat = useCallback((format) => {
    dispatch({
      type: actionTypes.ADD_CONDITIONAL_FORMAT,
      payload: {
        sheetId: state.currentSheet,
        format: {
          id: Date.now().toString(),
          ...format
        }
      }
    });
    
    updateStatusMessage('条件付き書式を追加しました', 3000);
  }, [state.currentSheet, dispatch, actionTypes, updateStatusMessage]);
  
  /**
   * 条件付き書式を削除する
   * @param {string} formatId 条件付き書式のID
   */
  const removeConditionalFormat = useCallback((formatId) => {
    dispatch({
      type: actionTypes.REMOVE_CONDITIONAL_FORMAT,
      payload: {
        sheetId: state.currentSheet,
        formatId
      }
    });
    
    updateStatusMessage('条件付き書式を削除しました', 3000);
  }, [state.currentSheet, dispatch, actionTypes, updateStatusMessage]);
  
  /**
   * 条件付き書式を適用する
   * @param {Object} hotInstance Handsontableインスタンス
   */
  const applyConditionalFormatting = useCallback((hotInstance) => {
    if (!hotInstance || hotInstance.isDestroyed) {
      console.warn('Handsontableインスタンスが無効です');
      return;
    }
    
    try {
      const currentFormats = state.conditionalFormats[state.currentSheet] || [];
      if (currentFormats.length === 0) return;
      
      const data = hotInstance.getData();
      const cellClassMapping = {};
      
      // 各条件付き書式のルールを適用
      currentFormats.forEach(format => {
        const { range, rule, style } = format;
        
        // 範囲内のセルをループ
        for (let row = range.startRow; row <= range.endRow; row++) {
          for (let col = range.startCol; col <= range.endCol; col++) {
            const cellValue = data[row] && data[row][col];
            
            // 条件を評価
            let conditionMet = false;
            
            switch (rule.type) {
              case 'greaterThan':
                conditionMet = cellValue > rule.value;
                break;
              case 'lessThan':
                conditionMet = cellValue < rule.value;
                break;
              case 'equalTo':
                conditionMet = cellValue === rule.value;
                break;
              case 'between':
                conditionMet = cellValue >= rule.min && cellValue <= rule.max;
                break;
              case 'containsText':
                conditionMet = typeof cellValue === 'string' && cellValue.includes(rule.text);
                break;
              case 'custom':
                try {
                  // 注意: evalの使用は慎重に行う必要がある（セキュリティリスク）
                  // 実際のアプリケーションでは、安全な方法で式を評価するべき
                  conditionMet = new Function('value', `return ${rule.expression}`)(cellValue);
                } catch (e) {
                  console.error('条件式の評価エラー:', e);
                }
                break;
              default:
                break;
            }
            
            // 条件が満たされた場合、スタイルを適用
            if (conditionMet) {
              const cellKey = `${row},${col}`;
              
              // 既存のスタイルを取得
              const existingClass = cellClassMapping[cellKey] || '';
              
              // スタイルに対応するクラスを生成
              let styleClass = '';
              if (style.fontWeight === 'bold') styleClass += ' font-bold';
              if (style.fontStyle === 'italic') styleClass += ' font-italic';
              if (style.textDecoration === 'underline') styleClass += ' text-underline';
              if (style.textAlign) styleClass += ` text-${style.textAlign}`;
              if (style.fontSize) {
                styleClass += style.fontSize === 'small' ? ' text-sm' : 
                           style.fontSize === 'large' ? ' text-lg' : ' text-md';
              }
              
              // スタイルクラスを結合
              cellClassMapping[cellKey] = (existingClass + styleClass).trim();
            }
          }
        }
      });
      
      // セルの設定を生成
      const cellConfig = Object.entries(cellClassMapping).map(([cellKey, className]) => {
        if (!className) return null;
        
        const [rowStr, colStr] = cellKey.split(',');
        const row = parseInt(rowStr, 10);
        const col = parseInt(colStr, 10);
        
        return {
          row,
          col,
          className
        };
      }).filter(Boolean);
      
      // 既存のセルクラスと統合する必要がある
      // ここでは簡略化のため単純に上書き
      const currentStyles = state.cellStyles[state.currentSheet] || {};
      const updatedCellConfig = [...cellConfig];
      
      Object.entries(currentStyles).forEach(([cellKey, className]) => {
        const [rowStr, colStr] = cellKey.split(',');
        const row = parseInt(rowStr, 10);
        const col = parseInt(colStr, 10);
        
        // 条件付き書式ですでに設定されていないか確認
        const existingIndex = updatedCellConfig.findIndex(
          config => config.row === row && config.col === col
        );
        
        if (existingIndex === -1) {
          // 新規追加
          updatedCellConfig.push({
            row,
            col,
            className
          });
        } else {
          // クラスを結合
          updatedCellConfig[existingIndex].className = 
            `${updatedCellConfig[existingIndex].className} ${className}`.trim();
        }
      });
      
      if (!hotInstance.isDestroyed) {
        hotInstance.updateSettings({
          cell: updatedCellConfig
        });
        
        hotInstance.render();
      }
    } catch (error) {
      console.error('条件付き書式適用エラー:', error);
    }
  }, [state.currentSheet, state.cellStyles, state.conditionalFormats]);
  
  return {
    cellStyles: state.cellStyles,
    conditionalFormats: state.conditionalFormats,
    currentSheetStyles: state.cellStyles[state.currentSheet] || {},
    currentSheetConditionalFormats: state.conditionalFormats[state.currentSheet] || [],
    getCellStyle,
    applyStyleToSelection,
    applyStylesToHandsontable,
    applyCurrentSheetStyles,
    addConditionalFormat,
    removeConditionalFormat,
    applyConditionalFormatting
  };
};

export default useCellFormatting;