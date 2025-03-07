import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import '../../core/conditional-format/styles.css';

class ConditionalFormatDialog {
  constructor(plugin) {
    this.plugin = plugin;
    this.dialog = null;
    console.log('ConditionalFormatDialog initialized');
  }
  
  show(selectedRange) {
    this.removeDialog();
    
    // ダイアログのルート要素を作成
    const dialogRoot = document.createElement('div');
    dialogRoot.className = 'cf-dialog-overlay';
    document.body.appendChild(dialogRoot);
    
    // Reactコンポーネントをレンダリング
    const DialogContent = () => {
      const [ruleType, setRuleType] = useState('greaterThan');
      const [ruleValue, setRuleValue] = useState('');
      const [minValue, setMinValue] = useState('');
      const [maxValue, setMaxValue] = useState('');
      const [textValue, setTextValue] = useState('');
      const [customFormula, setCustomFormula] = useState('');
      const [bgColor, setBgColor] = useState('#ffeb3b');
      const [textColor, setTextColor] = useState('#000000');
      const [fontWeight, setFontWeight] = useState('normal');
      const [fontStyle, setFontStyle] = useState('normal');
      
      const handleApply = () => {
        let condition = { type: ruleType };
        
        // 条件値の設定
        switch(ruleType) {
          case 'greaterThan':
          case 'lessThan':
          case 'equal':
            condition.value = ruleValue;
            break;
          case 'between':
            condition.min = minValue;
            condition.max = maxValue;
            break;
          case 'textContains':
            condition.value = textValue;
            break;
          case 'custom':
            condition.formula = customFormula;
            break;
          default:
            break;
        }
        
        // スタイルの設定
        const style = {
          backgroundColor: bgColor,
          color: textColor,
          fontWeight,
          fontStyle
        };
        
        // プラグインにルールを追加
        this.plugin.addRule(selectedRange, condition, style);
        
        // ダイアログを閉じる
        this.removeDialog();
      };
      
      const handleClose = () => {
        this.removeDialog();
      };
      
      return (
        <div className="cf-dialog">
          <div className="cf-dialog-header">
            <h2>条件付き書式</h2>
            <button className="cf-dialog-close" onClick={handleClose}>×</button>
          </div>
          
          <div className="cf-dialog-body">
            <div className="cf-form-group">
              <label>適用範囲：</label>
              <span className="cf-range-display">
                {selectedRange 
                  ? `${selectedRange.startCol}${selectedRange.startRow + 1}:${selectedRange.endCol}${selectedRange.endRow + 1}`
                  : '選択範囲なし'}
              </span>
            </div>
            
            <div className="cf-form-group">
              <label>条件の種類：</label>
              <select 
                value={ruleType} 
                onChange={(e) => setRuleType(e.target.value)}
                className="cf-select"
              >
                <option value="greaterThan">指定値より大きい</option>
                <option value="lessThan">指定値より小さい</option>
                <option value="equal">指定値と等しい</option>
                <option value="between">指定範囲内</option>
                <option value="textContains">テキストを含む</option>
                <option value="custom">カスタム数式</option>
              </select>
            </div>
            
            {ruleType === 'greaterThan' || ruleType === 'lessThan' || ruleType === 'equal' ? (
              <div className="cf-form-group">
                <label>値：</label>
                <input 
                  type="text" 
                  value={ruleValue} 
                  onChange={(e) => setRuleValue(e.target.value)}
                  className="cf-input"
                />
              </div>
            ) : null}
            
            {ruleType === 'between' ? (
              <>
                <div className="cf-form-group">
                  <label>最小値：</label>
                  <input 
                    type="text" 
                    value={minValue} 
                    onChange={(e) => setMinValue(e.target.value)}
                    className="cf-input"
                  />
                </div>
                <div className="cf-form-group">
                  <label>最大値：</label>
                  <input 
                    type="text" 
                    value={maxValue} 
                    onChange={(e) => setMaxValue(e.target.value)}
                    className="cf-input"
                  />
                </div>
              </>
            ) : null}
            
            {ruleType === 'textContains' ? (
              <div className="cf-form-group">
                <label>テキスト：</label>
                <input 
                  type="text" 
                  value={textValue} 
                  onChange={(e) => setTextValue(e.target.value)}
                  className="cf-input"
                />
              </div>
            ) : null}
            
            {ruleType === 'custom' ? (
              <div className="cf-form-group">
                <label>数式：</label>
                <input 
                  type="text" 
                  value={customFormula} 
                  onChange={(e) => setCustomFormula(e.target.value)}
                  className="cf-input"
                  placeholder="例: value > 0 && value < 100"
                />
              </div>
            ) : null}
            
            <h3 className="cf-section-title">適用する書式</h3>
            
            <div className="cf-form-row">
              <div className="cf-form-group">
                <label>背景色：</label>
                <input 
                  type="color" 
                  value={bgColor} 
                  onChange={(e) => setBgColor(e.target.value)}
                  className="cf-color-picker"
                />
              </div>
              
              <div className="cf-form-group">
                <label>文字色：</label>
                <input 
                  type="color" 
                  value={textColor} 
                  onChange={(e) => setTextColor(e.target.value)}
                  className="cf-color-picker"
                />
              </div>
            </div>
            
            <div className="cf-form-row">
              <div className="cf-form-group">
                <label>
                  <input 
                    type="checkbox" 
                    checked={fontWeight === 'bold'} 
                    onChange={(e) => setFontWeight(e.target.checked ? 'bold' : 'normal')}
                  />
                  太字
                </label>
              </div>
              
              <div className="cf-form-group">
                <label>
                  <input 
                    type="checkbox" 
                    checked={fontStyle === 'italic'} 
                    onChange={(e) => setFontStyle(e.target.checked ? 'italic' : 'normal')}
                  />
                  斜体
                </label>
              </div>
            </div>
          </div>
          
          <div className="cf-dialog-footer">
            <button className="cf-button cf-button-secondary" onClick={handleClose}>キャンセル</button>
            <button className="cf-button cf-button-primary" onClick={handleApply}>適用</button>
          </div>
        </div>
      );
    };
    
    const handleOverlayClick = (e) => {
      if (e.target.className === 'cf-dialog-overlay') {
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

export default ConditionalFormatDialog;