// src/plugins/core/conditional-format/ConditionalFormatDialog.js
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

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
      // ステート
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
      const [textDecoration, setTextDecoration] = useState('none');
      const [textAlign, setTextAlign] = useState('');
      const [border, setBorder] = useState('');
      const [previewStyle, setPreviewStyle] = useState({});
      const [errorMessage, setErrorMessage] = useState('');
      
      // 範囲が選択されていることを確認
      if (!selectedRange) {
        setErrorMessage('範囲が選択されていません');
      }
      
      // スタイルのプレビューを更新
      useEffect(() => {
        setPreviewStyle({
          backgroundColor: bgColor,
          color: textColor,
          fontWeight,
          fontStyle,
          textDecoration,
          textAlign,
          border,
          padding: '10px',
          marginTop: '10px',
          borderRadius: '4px'
        });
      }, [bgColor, textColor, fontWeight, fontStyle, textDecoration, textAlign, border]);
      
      // ルールの検証
      const validateRule = () => {
        if (ruleType === 'greaterThan' || ruleType === 'lessThan' || ruleType === 'equal' || ruleType === 'notEqual') {
          if (!ruleValue) {
            setErrorMessage('値を入力してください');
            return false;
          }
        } else if (ruleType === 'between' || ruleType === 'notBetween') {
          if (!minValue || !maxValue) {
            setErrorMessage('最小値と最大値を入力してください');
            return false;
          }
        } else if (ruleType === 'textContains' || ruleType === 'textNotContains' || 
                  ruleType === 'textStartsWith' || ruleType === 'textEndsWith') {
          if (!textValue) {
            setErrorMessage('テキストを入力してください');
            return false;
          }
        } else if (ruleType === 'custom') {
          if (!customFormula) {
            setErrorMessage('数式を入力してください');
            return false;
          }
        }
        
        setErrorMessage('');
        return true;
      };
      
      // 適用ボタンのハンドラ
      const handleApply = () => {
        if (!validateRule()) return;
        
        let condition = { type: ruleType };
        
        // 条件値の設定
        switch(ruleType) {
          case 'greaterThan':
          case 'lessThan':
          case 'equal':
          case 'notEqual':
            condition.value = ruleValue;
            break;
          case 'between':
          case 'notBetween':
            condition.min = minValue;
            condition.max = maxValue;
            break;
          case 'textContains':
          case 'textNotContains':
          case 'textStartsWith':
          case 'textEndsWith':
            condition.text = textValue;
            break;
          case 'custom':
            condition.formula = customFormula;
            break;
          case 'duplicate':
          case 'unique':
            // 特別な条件設定は不要
            break;
          default:
            break;
        }
        
        // スタイルの設定
        const style = {
          backgroundColor: bgColor !== 'transparent' ? bgColor : undefined,
          color: textColor !== '#000000' ? textColor : undefined,
          fontWeight: fontWeight !== 'normal' ? fontWeight : undefined,
          fontStyle: fontStyle !== 'normal' ? fontStyle : undefined,
          textDecoration: textDecoration !== 'none' ? textDecoration : undefined,
          textAlign: textAlign || undefined,
          border: border || undefined
        };
        
        // 空のプロパティを削除
        Object.keys(style).forEach(key => {
          if (style[key] === undefined) {
            delete style[key];
          }
        });
        
        // プラグインにルールを追加
        this.plugin.addRule(selectedRange, condition, style);
        
        // ダイアログを閉じる
        this.removeDialog();
      };
      
      // ダイアログを閉じるハンドラ
      const handleClose = () => {
        this.removeDialog();
      };
      
      // 範囲をA1形式で表示
      const rangeDisplay = selectedRange 
        ? `${this.plugin.getCellReference(selectedRange.startRow, selectedRange.startCol)}:${this.plugin.getCellReference(selectedRange.endRow, selectedRange.endCol)}`
        : '選択範囲がありません';
      
      return (
        <div className="cf-dialog">
          <div className="cf-dialog-header">
            <h2>条件付き書式</h2>
            <button className="cf-dialog-close" onClick={handleClose}>×</button>
          </div>
          
          <div className="cf-dialog-body">
            {errorMessage && (
              <div className="cf-error-message">{errorMessage}</div>
            )}
            
            <div className="cf-form-group">
              <label>適用範囲：</label>
              <span className="cf-range-display">{rangeDisplay}</span>
            </div>
            
            <div className="cf-form-group">
              <label>条件の種類：</label>
              <select 
                value={ruleType} 
                onChange={(e) => setRuleType(e.target.value)}
                className="cf-select"
              >
                <optgroup label="数値条件">
                  <option value="greaterThan">指定値より大きい</option>
                  <option value="lessThan">指定値より小さい</option>
                  <option value="equal">指定値と等しい</option>
                  <option value="notEqual">指定値と等しくない</option>
                  <option value="between">指定範囲内</option>
                  <option value="notBetween">指定範囲外</option>
                </optgroup>
                <optgroup label="テキスト条件">
                  <option value="textContains">テキストを含む</option>
                  <option value="textNotContains">テキストを含まない</option>
                  <option value="textStartsWith">テキストで始まる</option>
                  <option value="textEndsWith">テキストで終わる</option>
                </optgroup>
                <optgroup label="その他">
                  <option value="duplicate">重複値</option>
                  <option value="unique">一意の値</option>
                  <option value="custom">カスタム数式</option>
                </optgroup>
              </select>
            </div>
            
            {(ruleType === 'greaterThan' || ruleType === 'lessThan' || 
              ruleType === 'equal' || ruleType === 'notEqual') && (
              <div className="cf-form-group">
                <label>値：</label>
                <input 
                  type="text" 
                  value={ruleValue} 
                  onChange={(e) => setRuleValue(e.target.value)}
                  className="cf-input"
                  placeholder="比較する値を入力してください"
                />
              </div>
            )}
            
            {(ruleType === 'between' || ruleType === 'notBetween') && (
              <>
                <div className="cf-form-group">
                  <label>最小値：</label>
                  <input 
                    type="text" 
                    value={minValue} 
                    onChange={(e) => setMinValue(e.target.value)}
                    className="cf-input"
                    placeholder="範囲の最小値"
                  />
                </div>
                <div className="cf-form-group">
                  <label>最大値：</label>
                  <input 
                    type="text" 
                    value={maxValue} 
                    onChange={(e) => setMaxValue(e.target.value)}
                    className="cf-input"
                    placeholder="範囲の最大値"
                  />
                </div>
              </>
            )}
            
            {(ruleType === 'textContains' || ruleType === 'textNotContains' || 
              ruleType === 'textStartsWith' || ruleType === 'textEndsWith') && (
              <div className="cf-form-group">
                <label>テキスト：</label>
                <input 
                  type="text" 
                  value={textValue} 
                  onChange={(e) => setTextValue(e.target.value)}
                  className="cf-input"
                  placeholder="検索するテキスト"
                />
              </div>
            )}
            
            {ruleType === 'custom' && (
              <div className="cf-form-group">
                <label>数式：</label>
                <input 
                  type="text" 
                  value={customFormula} 
                  onChange={(e) => setCustomFormula(e.target.value)}
                  className="cf-input"
                  placeholder="例: value > 0 && value < 100"
                />
                <div className="cf-help-text">
                  <small>「value」変数は現在のセルの値を表します</small>
                </div>
              </div>
            )}
            
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
                <button 
                  className="cf-color-reset"
                  onClick={() => setBgColor('transparent')}
                  title="背景色をクリア"
                >
                  クリア
                </button>
              </div>
              
              <div className="cf-form-group">
                <label>文字色：</label>
                <input 
                  type="color" 
                  value={textColor} 
                  onChange={(e) => setTextColor(e.target.value)}
                  className="cf-color-picker"
                />
                <button 
                  className="cf-color-reset"
                  onClick={() => setTextColor('#000000')}
                  title="文字色をリセット"
                >
                  リセット
                </button>
              </div>
            </div>
            
            <div className="cf-form-row">
              <div className="cf-form-group cf-checkbox-group">
                <label>
                  <input 
                    type="checkbox" 
                    checked={fontWeight === 'bold'} 
                    onChange={(e) => setFontWeight(e.target.checked ? 'bold' : 'normal')}
                  />
                  太字
                </label>
              </div>
              
              <div className="cf-form-group cf-checkbox-group">
                <label>
                  <input 
                    type="checkbox" 
                    checked={fontStyle === 'italic'} 
                    onChange={(e) => setFontStyle(e.target.checked ? 'italic' : 'normal')}
                  />
                  斜体
                </label>
              </div>
              
              <div className="cf-form-group cf-checkbox-group">
                <label>
                  <input 
                    type="checkbox" 
                    checked={textDecoration === 'underline'} 
                    onChange={(e) => setTextDecoration(e.target.checked ? 'underline' : 'none')}
                  />
                  下線
                </label>
              </div>
            </div>
            
            <div className="cf-form-row">
              <div className="cf-form-group">
                <label>文字の配置：</label>
                <select
                  value={textAlign}
                  onChange={(e) => setTextAlign(e.target.value)}
                  className="cf-select"
                >
                  <option value="">デフォルト</option>
                  <option value="left">左揃え</option>
                  <option value="center">中央揃え</option>
                  <option value="right">右揃え</option>
                </select>
              </div>
              
              <div className="cf-form-group">
                <label>罫線：</label>
                <select
                  value={border}
                  onChange={(e) => setBorder(e.target.value)}
                  className="cf-select"
                >
                  <option value="">なし</option>
                  <option value="1px solid #000">細線</option>
                  <option value="2px solid #000">太線</option>
                  <option value="1px dashed #000">破線</option>
                  <option value="1px solid #ff0000">赤線</option>
                </select>
              </div>
            </div>
            
            <div className="cf-preview-section">
              <h4>プレビュー</h4>
              <div className="cf-preview-container" style={previewStyle}>
                書式のプレビュー
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
    
    // キーボードイベントリスナー
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        this.removeDialog();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    // ダイアログを保存
    this.dialog = {
      root: dialogRoot,
      render: () => {
        try {
          const root = ReactDOM.createRoot(dialogRoot);
          root.render(<DialogContent />);
        } catch (error) {
          console.error('ダイアログレンダリングエラー:', error);
        }
      },
      cleanup: () => {
        dialogRoot.removeEventListener('click', handleOverlayClick);
        document.removeEventListener('keydown', handleKeyDown);
      }
    };
    
    // レンダリング
    this.dialog.render();
  }
  
  removeDialog() {
    if (this.dialog) {
      this.dialog.cleanup();
      if (this.dialog.root && this.dialog.root.parentNode) {
        document.body.removeChild(this.dialog.root);
      }
      this.dialog = null;
    }
  }
}

export default ConditionalFormatDialog;