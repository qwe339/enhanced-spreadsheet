import React from 'react';
import '../../styles/FormulaBar.css';

const FormulaBar = ({ cellAddress, value, onChange, onSubmit, onFocus, onBlur }) => {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onSubmit();
    }
  };

  return (
    <div className="formula-bar">
      <div className="cell-address-container">
        <div className="cell-address-label">セル:</div>
        <div className="cell-address">{cellAddress}</div>
      </div>
      <div className="formula-input-container">
        <div className="formula-label">fx</div>
        <input
          type="text"
          className="formula-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder="数式または値を入力..."
        />
      </div>
      <button 
        className="formula-submit-button"
        onClick={onSubmit}
        title="確定 (Enter)"
      >
        ✓
      </button>
    </div>
  );
};

export default FormulaBar;