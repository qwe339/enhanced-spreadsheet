import React from 'react';
import '../../styles/StatusBar.css';

const StatusBar = ({ message, stats }) => {
  return (
    <div className="status-bar">
      <div className="status-message">{message}</div>
      <div className="status-stats">
        <div className="stats-item">
          <span className="stats-label">選択:</span>
          <span className="stats-value">{stats.selection || 'なし'}</span>
        </div>
        {stats.count > 0 && (
          <>
            <div className="stats-separator">|</div>
            <div className="stats-item">
              <span className="stats-label">件数:</span>
              <span className="stats-value">{stats.count}</span>
            </div>
            <div className="stats-separator">|</div>
            <div className="stats-item">
              <span className="stats-label">合計:</span>
              <span className="stats-value">{stats.sum}</span>
            </div>
            <div className="stats-separator">|</div>
            <div className="stats-item">
              <span className="stats-label">平均:</span>
              <span className="stats-value">{stats.average}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StatusBar;