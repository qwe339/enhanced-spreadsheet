// src/components/core/SheetTabs.jsx
import React, { useState } from 'react';
import '../../styles/SheetTabs.css';

const SheetTabs = ({ sheets, currentSheet, onSheetChange, onAddSheet, onRenameSheet, onDeleteSheet }) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [sheetToRename, setSheetToRename] = useState(null);
  const [newSheetName, setNewSheetName] = useState('');
  
  // シート名変更を開始
  const startRenaming = (e, sheetId) => {
    e.stopPropagation();
    setSheetToRename(sheetId);
    setNewSheetName(sheetId);
    setIsRenaming(true);
    
    // 次のレンダリングサイクルでinputにフォーカス
    setTimeout(() => {
      const input = document.getElementById('sheet-rename-input');
      if (input) {
        input.focus();
        input.select();
      }
    }, 10);
  };
  
  // シート名変更を確定
  const confirmRename = () => {
    if (newSheetName && newSheetName !== sheetToRename) {
      onRenameSheet(sheetToRename, newSheetName);
    }
    cancelRename();
  };
  
  // シート名変更をキャンセル
  const cancelRename = () => {
    setIsRenaming(false);
    setSheetToRename(null);
    setNewSheetName('');
  };
  
  // キーボードイベント処理
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      confirmRename();
    } else if (e.key === 'Escape') {
      cancelRename();
    }
  };
  
  // シート削除の確認
  const confirmDeleteSheet = (e, sheetId) => {
    e.stopPropagation();
    
    if (sheets.length <= 1) {
      alert('最後のシートは削除できません');
      return;
    }
    
    if (window.confirm(`シート "${sheetId}" を削除してもよろしいですか？`)) {
      onDeleteSheet(sheetId);
    }
  };
  
  // コンテキストメニューを表示
  const showContextMenu = (e, sheetId) => {
    e.preventDefault();
    
    // カスタムコンテキストメニューの作成
    const menu = document.createElement('div');
    menu.className = 'sheet-context-menu';
    menu.innerHTML = `
      <div class="sheet-menu-item rename">名前の変更</div>
      ${sheets.length > 1 ? '<div class="sheet-menu-item delete">削除</div>' : ''}
      <div class="sheet-menu-item cancel">キャンセル</div>
    `;
    
    // 位置を設定
    menu.style.left = `${e.pageX}px`;
    menu.style.top = `${e.pageY}px`;
    
    // クリックイベントを追加
    menu.querySelector('.rename').addEventListener('click', () => {
      document.body.removeChild(menu);
      startRenaming(e, sheetId);
    });
    
    if (sheets.length > 1) {
      menu.querySelector('.delete').addEventListener('click', () => {
        document.body.removeChild(menu);
        confirmDeleteSheet(e, sheetId);
      });
    }
    
    menu.querySelector('.cancel').addEventListener('click', () => {
      document.body.removeChild(menu);
    });
    
    // 外部クリックで閉じる
    const handleOutsideClick = () => {
      if (document.body.contains(menu)) {
        document.body.removeChild(menu);
        document.removeEventListener('click', handleOutsideClick);
      }
    };
    
    // 少し遅延させて追加（即時クリックを防ぐため）
    setTimeout(() => {
      document.addEventListener('click', handleOutsideClick);
    }, 10);
    
    document.body.appendChild(menu);
  };
  
  return (
    <div className="sheet-tabs">
      {sheets.map(sheetId => (
        <div
          key={sheetId}
          className={`sheet-tab ${sheetId === currentSheet ? 'active' : ''}`}
          onClick={() => onSheetChange(sheetId)}
          onContextMenu={(e) => showContextMenu(e, sheetId)}
        >
          {isRenaming && sheetToRename === sheetId ? (
            <input
              id="sheet-rename-input"
              className="sheet-rename-input"
              type="text"
              value={newSheetName}
              onChange={(e) => setNewSheetName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={confirmRename}
              onClick={(e) => e.stopPropagation()}
              maxLength={30}
            />
          ) : (
            <>
              <span className="sheet-tab-text">{sheetId}</span>
              <div className="sheet-tab-actions">
                <button 
                  className="sheet-tab-button" 
                  onClick={(e) => startRenaming(e, sheetId)}
                  title="名前の変更"
                >
                  ✏️
                </button>
                {sheets.length > 1 && (
                  <button 
                    className="sheet-tab-button" 
                    onClick={(e) => confirmDeleteSheet(e, sheetId)}
                    title="削除"
                  >
                    ✕
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      ))}
      <div 
        className="sheet-tab add-sheet" 
        onClick={(e) => {
          e.preventDefault();
          onAddSheet();
        }}
        title="新しいシートを追加"
      >
        <span className="add-icon">+</span>
      </div>
    </div>
  );
};

export default SheetTabs;