// src/plugins/core/filtering/FilterDialog.js
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

class FilterDialog {
  constructor(plugin) {
    this.plugin = plugin;
    this.dialog = null;
  }
  
  show(column, columnData, columnHeader, existingFilter = null) {
    this.removeDialog();
    
    // ダイアログのルート要素を作成
    const dialogRoot = document.createElement('div');
    dialogRoot.className = 'filter-dialog-overlay';
    document.body.appendChild(dialogRoot);
    
    // Reactコンポーネントをレンダリング
    const DialogContent = () => {
      // 状態管理
      const [filterType, setFilterType] = useState(existingFilter ? existingFilter.type : 'equals');
      const [filterValue, setFilterValue] = useState(existingFilter ? existingFilter.value : '');
      const [minValue, setMinValue] = useState(existingFilter && existingFilter.type === 'between' ? existingFilter.value.min : '');
      const [maxValue, setMaxValue] = useState(existingFilter && existingFilter.type === 'between' ? existingFilter.value.max : '');
      const [selectedValues, setSelectedValues] = useState(existingFilter && existingFilter.type === 'values' ? existingFilter.value : []);
      const [uniqueValues, setUniqueValues] = useState([]);
      const [errorMessage, setErrorMessage] = useState('');
      
      // 一意の値を取得
      useEffect(() => {
        const uniqueSet = new Set(columnData.map(String));
        setUniqueValues(Array.from(uniqueSet).sort());
      }, [columnData]);
      
      // フィルター適用
      const handleApply = () => {
        if (validateFilter()) {
          let value = filterValue;
          
          // 特殊なフィルタータイプの処理
          if (filterType === 'between') {
            value = { min: minValue, max: maxValue };
          } else if (filterType === 'values') {
            value = selectedValues;
          }
          
          // カスタムイベントを発行
          document.dispatchEvent(new CustomEvent('apply-filter', {
            detail: {
              col: column,
              filterType,
              filterValue: value
            }
          }));
          
          this.removeDialog();
        }
      };
      
      // フィルター検証
      const validateFilter = () => {
        setErrorMessage('');
        
        switch (filterType) {
          case 'equals':
          case 'notEquals':
          case 'contains':
          case 'notContains':
          case 'startsWith':
          case 'endsWith':
            if (!filterValue && filterValue !== 0) {
              setErrorMessage('検索値を入力してください');
              return false;
            }
            break;
            
          case 'greaterThan':
          case 'lessThan':
            if (filterValue === '' || isNaN(Number(filterValue))) {
              setErrorMessage('有効な数値を入力してください');
              return false;
            }
            break;
            
          case 'between':
            if (minValue === '' || maxValue === '' || 
                isNaN(Number(minValue)) || isNaN(Number(maxValue))) {
              setErrorMessage('最小値と最大値に有効な数値を入力してください');
              return false;
            }
            if (Number(minValue) > Number(maxValue)) {
              setErrorMessage('最小値は最大値以下にしてください');
              return false;
            }
            break;
            
          case 'values':
            if (selectedValues.length === 0) {
              setErrorMessage('少なくとも1つの値を選択してください');
              return false;
            }
            break;
            
          default:
            break;
        }
        
        return true;
      };
      
      // フィルタークリア
      const handleClear = () => {
        document.dispatchEvent(new CustomEvent('clear-filter', {
          detail: { col: column }
        }));
        
        this.removeDialog();
      };
      
      // キャンセル
      const handleCancel = () => {
        this.removeDialog();
      };
      
      // 値リストの選択を切り替え
      const toggleValueSelection = (value) => {
        if (selectedValues.includes(value)) {
          setSelectedValues(selectedValues.filter(v => v !== value));
        } else {
          setSelectedValues([...selectedValues, value]);
        }
      };
      
      // すべて選択/選択解除
      const toggleAllValues = (select) => {
        if (select) {
          setSelectedValues([...uniqueValues]);
        } else {
          setSelectedValues([]);
        }
      };
      
      return (
        <div className="filter-dialog">
          <div className="filter-dialog-header">
            <h2>「{columnHeader}」列をフィルター</h2>
            <button className="filter-dialog-close" onClick={handleCancel}>×</button>
          </div>
          
          <div className="filter-dialog-body">
            {errorMessage && (
              <div className="filter-error-message">{errorMessage}</div>
            )}
            
            <div className="filter-form-group">
              <label>フィルター条件:</label>
              <select 
                value={filterType} 
                onChange={(e) => setFilterType(e.target.value)}
                className="filter-select"
              >
                <option value="equals">次の値に等しい</option>
                <option value="notEquals">次の値に等しくない</option>
                <option value="contains">次の値を含む</option>
                <option value="notContains">次の値を含まない</option>
                <option value="greaterThan">次の値より大きい</option>
                <option value="lessThan">次の値より小さい</option>
                <option value="between">次の範囲内</option>
                <option value="startsWith">次の値で始まる</option>
                <option value="endsWith">次の値で終わる</option>
                <option value="empty">空白</option>
                <option value="notEmpty">空白でない</option>
                <option value="values">リストから選択</option>
              </select>
            </div>
            
            {/* フィルタータイプに応じた入力フィールド */}
            {filterType === 'equals' || 
             filterType === 'notEquals' || 
             filterType === 'contains' || 
             filterType === 'notContains' ||
             filterType === 'startsWith' ||
             filterType === 'endsWith' ? (
              <div className="filter-form-group">
                <label>検索値:</label>
                <input 
                  type="text" 
                  value={filterValue} 
                  onChange={(e) => setFilterValue(e.target.value)}
                  className="filter-input"
                  placeholder="フィルター値を入力"
                />
              </div>
            ) : null}
            
            {filterType === 'greaterThan' || filterType === 'lessThan' ? (
              <div className="filter-form-group">
                <label>数値:</label>
                <input 
                  type="number" 
                  value={filterValue} 
                  onChange={(e) => setFilterValue(e.target.value)}
                  className="filter-input"
                  placeholder="数値を入力"
                />
              </div>
            ) : null}
            
            {filterType === 'between' && (
              <div className="filter-form-group">
                <div className="filter-range-inputs">
                  <div>
                    <label>最小値:</label>
                    <input 
                      type="number" 
                      value={minValue} 
                      onChange={(e) => setMinValue(e.target.value)}
                      className="filter-input"
                      placeholder="最小値"
                    />
                  </div>
                  <div>
                    <label>最大値:</label>
                    <input 
                      type="number" 
                      value={maxValue} 
                      onChange={(e) => setMaxValue(e.target.value)}
                      className="filter-input"
                      placeholder="最大値"
                    />
                  </div>
                </div>
              </div>
            )}
            
            {filterType === 'values' && (
              <div className="filter-form-group">
                <div className="filter-values-header">
                  <label>値を選択:</label>
                  <div className="filter-values-actions">
                    <button 
                      className="filter-button-small" 
                      onClick={() => toggleAllValues(true)}
                    >
                      すべて選択
                    </button>
                    <button 
                      className="filter-button-small" 
                      onClick={() => toggleAllValues(false)}
                    >
                      すべて解除
                    </button>
                  </div>
                </div>
                
                <div className="filter-values-list">
                  {uniqueValues.map((value, index) => (
                    <div key={index} className="filter-value-item">
                      <label>
                        <input 
                          type="checkbox" 
                          checked={selectedValues.includes(value)}
                          onChange={() => toggleValueSelection(value)}
                        />
                        {value}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="filter-dialog-footer">
            <button 
              className="filter-button filter-button-secondary" 
              onClick={handleClear}
            >
              フィルターをクリア
            </button>
            <div className="filter-footer-right">
              <button 
                className="filter-button filter-button-secondary" 
                onClick={handleCancel}
              >
                キャンセル
              </button>
              <button 
                className="filter-button filter-button-primary" 
                onClick={handleApply}
              >
                適用
              </button>
            </div>
          </div>
        </div>
      );
    };
    
    // オーバーレイクリック
    const handleOverlayClick = (e) => {
      if (e.target.className === 'filter-dialog-overlay') {
        this.removeDialog();
      }
    };
    
    // キーボードイベント
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        this.removeDialog();
      }
    };
    
    // イベントリスナーの登録
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
    ReactDOM.render(<DialogContent />, dialogRoot);
  }
  
  removeDialog() {
    if (this.dialog) {
      this.dialog.cleanup();
      if (document.body.contains(this.dialog.root)) {
        ReactDOM.unmountComponentAtNode(this.dialog.root);
        document.body.removeChild(this.dialog.root);
      }
      this.dialog = null;
    }
  }
}

export default FilterDialog;