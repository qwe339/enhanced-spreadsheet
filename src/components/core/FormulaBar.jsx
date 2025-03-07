// src/components/core/FormulaBar.jsx
import React, { useState, useEffect, useRef } from 'react';
import '../../styles/FormulaBar.css';

const FormulaBar = ({ cellAddress, value, onChange, onSubmit, onFocus, onBlur }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedSuggestion, setHighlightedSuggestion] = useState(0);
  const inputRef = useRef(null);
  
  // 数式の候補
  const formulaSuggestions = [
    { name: 'SUM', description: '数値を合計します', example: 'SUM(A1:A10)' },
    { name: 'AVERAGE', description: '平均を計算します', example: 'AVERAGE(A1:A10)' },
    { name: 'COUNT', description: '数値の個数を数えます', example: 'COUNT(A1:A10)' },
    { name: 'MAX', description: '最大値を返します', example: 'MAX(A1:A10)' },
    { name: 'MIN', description: '最小値を返します', example: 'MIN(A1:A10)' },
    { name: 'IF', description: '条件に基づいて値を返します', example: 'IF(A1>10,"大","小")' },
    { name: 'CONCATENATE', description: 'テキストを結合します', example: 'CONCATENATE(A1," ",B1)' },
    { name: 'LEFT', description: '左からの文字数を取得します', example: 'LEFT(A1,5)' },
    { name: 'RIGHT', description: '右からの文字数を取得します', example: 'RIGHT(A1,5)' },
    { name: 'LEN', description: '文字列の長さを返します', example: 'LEN(A1)' }
  ];
  
  // 数式候補を更新
  useEffect(() => {
    if (value && value.startsWith('=') && value.length > 1) {
      const searchTerm = value.substring(1).toUpperCase();
      const filteredSuggestions = formulaSuggestions.filter(suggestion => 
        suggestion.name.toUpperCase().includes(searchTerm)
      );
      
      setSuggestions(filteredSuggestions);
      setShowSuggestions(filteredSuggestions.length > 0 && isEditing);
      setHighlightedSuggestion(0);
    } else {
      setShowSuggestions(false);
    }
  }, [value, isEditing]);
  
  // キーボード操作の処理
  const handleKeyDown = (e) => {
    if (showSuggestions) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedSuggestion(prev => 
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedSuggestion(prev => 
            prev > 0 ? prev - 1 : suggestions.length - 1
          );
          break;
        case 'Tab':
        case 'Enter':
          e.preventDefault();
          if (suggestions.length > 0) {
            insertSuggestion(suggestions[highlightedSuggestion].name);
          } else if (e.key === 'Enter') {
            handleSubmit();
          }
          break;
        case 'Escape':
          setShowSuggestions(false);
          break;
        default:
          break;
      }
    } else if (e.key === 'Enter') {
      handleSubmit();
    }
  };
  
  // 数式候補を挿入
  const insertSuggestion = (formulaName) => {
    // 現在のカーソル位置を取得
    const cursorPos = inputRef.current.selectionStart;
    const beforeCursor = value.substring(0, cursorPos);
    const afterCursor = value.substring(cursorPos);
    
    // =以降の文字を検索
    const equalPos = beforeCursor.lastIndexOf('=');
    if (equalPos !== -1) {
      const prefix = beforeCursor.substring(0, equalPos + 1);
      // 関数名を挿入し、括弧を追加
      const newValue = `${prefix}${formulaName}(${afterCursor}`;
      onChange(newValue);
      
      // カーソル位置を括弧の中に移動
      setTimeout(() => {
        const newPos = prefix.length + formulaName.length + 1;
        inputRef.current.setSelectionRange(newPos, newPos);
        inputRef.current.focus();
      }, 10);
    }
    
    setShowSuggestions(false);
  };
  
  // 提出ハンドラ
  const handleSubmit = () => {
    onSubmit();
    setShowSuggestions(false);
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };
  
  // フォーカスハンドラ
  const handleFocus = () => {
    setIsEditing(true);
    if (onFocus) onFocus();
  };
  
  // ブラーハンドラ
  const handleBlur = () => {
    setIsEditing(false);
    setShowSuggestions(false);
    if (onBlur) onBlur();
  };

  return (
    <div className="formula-bar">
      <div className="cell-address-container">
        <div className="cell-address-label">セル:</div>
        <div className="cell-address">{cellAddress}</div>
      </div>
      <div className="formula-input-container">
        <div className="formula-label">fx</div>
        <div className="formula-input-wrapper">
          <input
            ref={inputRef}
            type="text"
            className="formula-input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder="数式または値を入力..."
          />
          
          {showSuggestions && (
            <div className="formula-suggestions">
              {suggestions.map((suggestion, index) => (
                <div
                  key={suggestion.name}
                  className={`suggestion-item ${index === highlightedSuggestion ? 'highlighted' : ''}`}
                  onClick={() => insertSuggestion(suggestion.name)}
                  onMouseEnter={() => setHighlightedSuggestion(index)}
                >
                  <div className="suggestion-name">{suggestion.name}</div>
                  <div className="suggestion-description">{suggestion.description}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <button 
        className="formula-submit-button"
        onClick={handleSubmit}
        title="確定 (Enter)"
      >
        ✓
      </button>
    </div>
  );
};

export default FormulaBar;