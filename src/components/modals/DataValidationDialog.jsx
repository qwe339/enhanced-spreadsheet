import React, { useState, useEffect } from 'react';
import Modal from './Modal';

const DataValidationDialog = ({ onClose, onApply, selectedRange }) => {
  const [validationType, setValidationType] = useState('any');
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');
  const [listValues, setListValues] = useState('');
  const [customFormula, setCustomFormula] = useState('');
  const [errorMessage, setErrorMessage] = useState('入力値が無効です');
  const [showErrorMessage, setShowErrorMessage] = useState(true);
  const [errorStyle, setErrorStyle] = useState('stop');
  
  // 選択範囲の表示
  const rangeDisplay = selectedRange ? 
    `${selectedRange.startCol}${selectedRange.startRow + 1}:${selectedRange.endCol}${selectedRange.endRow + 1}` : 
    '選択範囲なし';
  
  // エラーメッセージの検証
  useEffect(() => {
    if (showErrorMessage && !errorMessage.trim()) {
      setErrorMessage('入力値が無効です');
    }
  }, [showErrorMessage, errorMessage]);
  
  const handleApply = () => {
    let validationRule = {
      type: validationType,
      errorMessage: showErrorMessage ? errorMessage : '',
      errorStyle
    };
    
    switch(validationType) {
      case 'number':
        validationRule.min = minValue !== '' ? parseFloat(minValue) : undefined;
        validationRule.max = maxValue !== '' ? parseFloat(maxValue) : undefined;
        break;
      case 'list':
        validationRule.options = listValues.split(',').map(item => item.trim());
        break;
      case 'date':
        validationRule.min = minValue !== '' ? minValue : undefined;
        validationRule.max = maxValue !== '' ? maxValue : undefined;
        break;
      case 'textLength':
        validationRule.min = minValue !== '' ? parseInt(minValue, 10) : undefined;
        validationRule.max = maxValue !== '' ? parseInt(maxValue, 10) : undefined;
        break;
      case 'custom':
        validationRule.expression = customFormula;
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
          <span className="range-display">{rangeDisplay}</span>
        </div>
        
        <div className="form-group">
          <label>検証の種類：</label>
          <select 
            value={validationType} 
            onChange={(e) => setValidationType(e.target.value)}
            className="form-control"
          >
            <option value="any">制限なし</option>
            <option value="number">数値</option>
            <option value="list">リスト</option>
            <option value="date">日付</option>
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
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label>最大値：</label>
              <input 
                type="number" 
                value={maxValue} 
                onChange={(e) => setMaxValue(e.target.value)}
                placeholder="最大値を指定しない場合は空欄"
                className="form-control"
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
              className="form-control"
            />
            <div className="form-text">カンマで区切って選択肢を入力してください</div>
          </div>
        )}
        
        {validationType === 'date' && (
          <>
            <div className="form-group">
              <label>開始日：</label>
              <input 
                type="date" 
                value={minValue} 
                onChange={(e) => setMinValue(e.target.value)}
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label>終了日：</label>
              <input 
                type="date" 
                value={maxValue} 
                onChange={(e) => setMaxValue(e.target.value)}
                className="form-control"
              />
            </div>
          </>
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
                className="form-control"
                min="0"
              />
            </div>
            <div className="form-group">
              <label>最大文字数：</label>
              <input 
                type="number" 
                value={maxValue} 
                onChange={(e) => setMaxValue(e.target.value)}
                placeholder="最大文字数"
                className="form-control"
                min="0"
              />
            </div>
          </>
        )}
        
        {validationType === 'custom' && (
          <div className="form-group">
            <label>カスタム数式：</label>
            <input 
              type="text" 
              value={customFormula} 
              onChange={(e) => setCustomFormula(e.target.value)}
              placeholder="例: value > 0 && value < 100"
              className="form-control"
            />
            <div className="form-text">
              「value」を使って現在の値を参照できます
            </div>
          </div>
        )}
        
        {validationType !== 'any' && (
          <>
            <div className="form-group">
              <label>エラー対応：</label>
              <select 
                value={errorStyle} 
                onChange={(e) => setErrorStyle(e.target.value)}
                className="form-control"
              >
                <option value="stop">拒否（入力を許可しない）</option>
                <option value="warning">警告（入力は許可する）</option>
                <option value="info">情報（通知のみ）</option>
              </select>
            </div>
            
            <div className="form-group">
              <div className="checkbox-wrapper">
                <input 
                  type="checkbox" 
                  id="show-error-message"
                  checked={showErrorMessage} 
                  onChange={(e) => setShowErrorMessage(e.target.checked)}
                />
                <label htmlFor="show-error-message">
                  エラーメッセージを表示する
                </label>
              </div>
            </div>
            
            {showErrorMessage && (
              <div className="form-group">
                <label>エラーメッセージ：</label>
                <input 
                  type="text" 
                  value={errorMessage} 
                  onChange={(e) => setErrorMessage(e.target.value)}
                  placeholder="エラー時に表示するメッセージ"
                  className="form-control"
                />
              </div>
            )}
          </>
        )}
      </div>
      
      <div className="modal-footer">
        <button className="secondary" onClick={onClose}>キャンセル</button>
        <button 
          className="primary" 
          onClick={handleApply}
          disabled={
            (validationType === 'list' && !listValues.trim()) ||
            (validationType === 'custom' && !customFormula.trim())
          }
        >
          適用
        </button>
      </div>
    </Modal>
  );
};

export default DataValidationDialog;