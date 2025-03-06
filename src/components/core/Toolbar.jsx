import React from 'react';
import '../../styles/Toolbar.css';

const Toolbar = ({ items = [], onClick }) => {
  const handleItemClick = (item) => {
    if (item.action && typeof item.action === 'function') {
      item.action();
    } else if (onClick && typeof onClick === 'function') {
      onClick(item.id);
    }
  };

  return (
    <div className="toolbar">
      {items.map((item, index) => 
        item.type === 'separator' ? (
          <div key={`separator-${index}`} className="toolbar-separator"></div>
        ) : (
          <button
            key={item.id}
            className="toolbar-button"
            title={item.tooltip || item.id}
            onClick={() => handleItemClick(item)}
          >
            <span className="toolbar-icon">{item.icon}</span>
          </button>
        )
      )}
    </div>
  );
};

export default Toolbar;