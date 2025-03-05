import React, { useState } from 'react';
import '../../styles/MenuBar.css';

const menuItems = [
  {
    id: 'file',
    label: 'ファイル',
    items: [
      { id: 'new', label: '新規作成' },
      { id: 'open', label: '開く...' },
      { id: 'save', label: '保存' },
      { id: 'saveAs', label: '名前を付けて保存...' },
      { type: 'separator' },
      { id: 'importCSV', label: 'CSVインポート...' },
      { id: 'importExcel', label: 'Excelインポート...' },
      { type: 'separator' },
      { id: 'exportCSV', label: 'CSVエクスポート' },
      { id: 'exportExcel', label: 'Excelエクスポート' },
      { type: 'separator' },
      { id: 'print', label: '印刷...' }
    ]
  },
  {
    id: 'edit',
    label: '編集',
    items: [
      { id: 'undo', label: '元に戻す' },
      { id: 'redo', label: 'やり直し' },
      { type: 'separator' },
      { id: 'cut', label: '切り取り' },
      { id: 'copy', label: 'コピー' },
      { id: 'paste', label: '貼り付け' },
      { type: 'separator' },
      { id: 'search', label: '検索と置換...' }
    ]
  },
  {
    id: 'format',
    label: '書式',
    items: [
      { id: 'formatCell', label: 'セルの書式...' },
      { type: 'separator' },
      { id: 'bold', label: '太字' },
      { id: 'italic', label: '斜体' },
      { id: 'underline', label: '下線' },
      { type: 'separator' },
      { id: 'alignLeft', label: '左揃え' },
      { id: 'alignCenter', label: '中央揃え' },
      { id: 'alignRight', label: '右揃え' }
    ]
  },
  {
    id: 'help',
    label: 'ヘルプ',
    items: [
      { id: 'about', label: 'バージョン情報' },
      { id: 'shortcuts', label: 'キーボードショートカット' }
    ]
  }
];

const MenuBar = ({ onMenuItemClick }) => {
  const [activeMenu, setActiveMenu] = useState(null);

  const handleMenuClick = (menuId) => {
    if (activeMenu === menuId) {
      setActiveMenu(null);
    } else {
      setActiveMenu(menuId);
    }
  };

const handleMenuItemClick = (itemId) => {
  console.log('Menu item clicked:', itemId);
  setActiveMenu(null);
  // onMenuItemClickが関数であることを確認
  if (typeof onMenuItemClick === 'function') {
    console.log('Calling parent handler for:', itemId);
    onMenuItemClick(itemId);
  } else {
    console.warn('No menu item click handler provided');
  }
};

  // メニュー外をクリックした時にメニューを閉じる
  const handleOutsideClick = () => {
    if (activeMenu) {
      setActiveMenu(null);
    }
  };

  return (
    <div className="menu-bar">
      {menuItems.map((menu) => (
        <div key={menu.id} className="menu-container">
          <div
            className={`menu-title ${activeMenu === menu.id ? 'active' : ''}`}
            onClick={() => handleMenuClick(menu.id)}
          >
            {menu.label}
          </div>
          {activeMenu === menu.id && (
            <div className="menu-dropdown">
              {menu.items.map((item, index) => 
                item.type === 'separator' ? (
                  <div key={`${menu.id}-separator-${index}`} className="menu-separator"></div>
                ) : (
                  <div
                    key={item.id}
                    className="menu-item"
                    onClick={() => handleMenuItemClick(item.id)}
                  >
                    {item.label}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      ))}
      {activeMenu && <div className="menu-backdrop" onClick={handleOutsideClick} />}
    </div>
  );
};

export default MenuBar;