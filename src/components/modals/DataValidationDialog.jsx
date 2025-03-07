import React, { useState, useEffect } from 'react';
import Modal from './Modal';

const DataValidationDialog = ({ onClose, onApply, selectedRange }) => {
  const [validationType, setValidationType] = useState('any');
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');
  const [listValues, setListValues] = useState('');
  const [customFormula, setCustomFormula] = useState('');
  const [errorMessage, setErrorMessage] = useState('入力値が無効です');
  
  // 選択範囲の表示
  const rangeDisplay = selectedRange ? 
    `${selectedRange.startCol}${selectedRange.startRow + 1}:${selectedRange.endCol}${selectedRange.endRow + 1}` : 
    '選択範囲なし';
  
  const handleApply = () => {
    let validationRule = {
      type: validationType
    };
    
    switch(validationType) {
      case 'number':
        validationRule.min = minValue !== '' ? parseFloat(minValue) : undefined;
        validationRule.max = maxValue !== '' ? parseFloat(maxValue) : undefined;
        break;
      case 'list':
        validationRule.options = listValues.split(',').map(item => item.trim());
        break;
      case 'textLength':
        validationRule.min = minValue !== '' ? parseInt(minValue, 10) : undefined;
        validationRule.max = maxValue !== '' ? parseInt(maxValue, 10) : undefined;
        break;
      case 'custom':
        validationRule.expression = customFormula;
        validationRule.errorMessage = errorMessage;
        break;
      default:
        break;
    }
    
    onApply(validationRule);
    onClose();
  };
  
  return (
    <Modal title="データ検証" onClose={onClose}>
      <div className="modal-body">
        <div className="form-group">
          <label>適用範囲：</label>
          <span>{rangeDisplay}</span>
        </div>
        
        <div className="form-group">
          <label>検証の種類：</label>
          <select 
            value={validationType} 
            onChange={(e) => setValidationType(e.target.value)}
          >
            <option value="any">制限なし</option>
            <option value="number">数値</option>
            <option value="list">リスト</option>
            <option value="textLength">テキストの長さ</option>
            <option value="custom">カスタム数式</option>
          </select>
        </div>
        
        {validationType === 'number' && (
          <>
            <div className="form-group">
              <label>最小値：</label>
              <input 
                type="number" 
                value={minValue} 
                onChange={(e) => setMinValue(e.target.value)}
                placeholder="最小値を指定しない場合は空欄"
              />
            </div>
            <div className="form-group">
              <label>最大値：</label>
              <input 
                type="number" 
                value={maxValue} 
                onChange={(e) => setMaxValue(e.target.value)}
                placeholder="最大値を指定しない場合は空欄"
              />
            </div>
          </>
        )}
        
        {validationType === 'list' && (
          <div className="form-group">
            <label>リスト項目（カンマ区切り）：</label>
            <input 
              type="text" 
              value={listValues} 
              onChange={(e) => setListValues(e.target.value)}
              placeholder="例: 項目1, 項目2, 項目3"
            />
          </div>
        )}
        
        {validationType === 'textLength' && (
          <>
            <div className="form-group">
              <label>最小文字数：</label>
              <input 
                type="number" 
                value={minValue} 
                onChange={(e) => setMinValue(e.target.value)}
                placeholder="最小文字数"
              />
            </div>
            <div className="form-group">
              <label>最大文字数：</label>
              <input 
                type="number" 
                value={maxValue} 
                onChange={(e) => setMaxValue(e.target.value)}
                placeholder="最大文字数"
              />
            </div>
          </>
        )}
        
        {validationType === 'custom' && (
          <>
            <div className="form-group">
              <label>カスタム数式：</label>
              <input 
                type="text" 
                value={customFormula} 
                onChange={(e) => setCustomFormula(e.target.value)}
                placeholder="例: value > 0 && value < 100"
              />
            </div>
            <div className="form-group">
              <label>エラーメッセージ：</label>
              <input 
                type="text" 
                value={errorMessage} 
                onChange={(e) => setErrorMessage(e.target.value)}
                placeholder="エラー時に表示するメッセージ"
              />
            </div>
          </>
        )}
      </div>
      
      <div className="modal-footer">
        <button className="secondary" onClick={onClose}>キャンセル</button>
        <button 
          className="primary" 
          onClick={handleApply}
        >
          適用
        </button>
      </div>
    </Modal>
  );
};

export default DataValidationDialog;