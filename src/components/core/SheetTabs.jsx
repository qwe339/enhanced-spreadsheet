import React from 'react';
import '../../styles/SheetTabs.css';

const SheetTabs = ({ sheets, currentSheet, onSheetChange, onAddSheet }) => {
  return (
    <div className="sheet-tabs">
      {sheets.map(sheetId => (
        <div
          key={sheetId}
          className={`sheet-tab ${sheetId === currentSheet ? 'active' : ''}`}
          onClick={() => onSheetChange(sheetId)}
        >
          <span className="sheet-tab-text">{sheetId}</span>
        </div>
      ))}
      <div className="sheet-tab add-sheet" onClick={(e) => {
    e.preventDefault();
    onAddSheet();
  }}>
  <span className="add-icon">+</span>
      </div>
    </div>
  );
};

export default SheetTabs;