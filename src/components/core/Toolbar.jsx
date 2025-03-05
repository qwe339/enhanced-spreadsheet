import React from 'react';
import '../../styles/Toolbar.css';

const Toolbar = ({ 
  onNew,
  onSave,
  onUndo,
  onRedo,
  onApplyBold,
  onApplyItalic,
  onApplyUnderline,
  onAlignLeft,
  onAlignCenter,
  onAlignRight
}) => {
  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button className="toolbar-button" title="新規作成" onClick={onNew}>
          <span className="toolbar-icon">📄</span>
        </button>
        <button className="toolbar-button" title="保存" onClick={onSave}>
          <span className="toolbar-icon">💾</span>
        </button>
      </div>
      
      <div className="toolbar-group">
        <button className="toolbar-button" title="元に戻す" onClick={onUndo}>
          <span className="toolbar-icon">↩️</span>
        </button>
        <button className="toolbar-button" title="やり直し" onClick={onRedo}>
          <span className="toolbar-icon">↪️</span>
        </button>
      </div>
      
      <div className="toolbar-group">
        <button className="toolbar-button" title="太字" onClick={onApplyBold}>
          <span className="toolbar-icon"><b>B</b></span>
        </button>
        <button className="toolbar-button" title="斜体" onClick={onApplyItalic}>
          <span className="toolbar-icon"><i>I</i></span>
        </button>
        <button className="toolbar-button" title="下線" onClick={onApplyUnderline}>
          <span className="toolbar-icon"><u>U</u></span>
        </button>
      </div>
      
      <div className="toolbar-group">
        <button className="toolbar-button" title="左揃え" onClick={onAlignLeft}>
          <span className="toolbar-icon">⬅️</span>
        </button>
        <button className="toolbar-button" title="中央揃え" onClick={onAlignCenter}>
          <span className="toolbar-icon">⬅️➡️</span>
        </button>
        <button className="toolbar-button" title="右揃え" onClick={onAlignRight}>
          <span className="toolbar-icon">➡️</span>
        </button>
      </div>
    </div>
  );
};

export default Toolbar;