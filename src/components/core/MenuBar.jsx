import React, { useState } from 'react';
import '../../styles/MenuBar.css';

const MenuBar = ({ items = [], onMenuItemClick }) => {
  const [activeMenu, setActiveMenu] = useState(null);

  // メニュークリックハンドラ
  const handleMenuClick = (menuId, e) => {
    console.log("Menu clicked:", menuId);
    // クリックの伝播を停止
    e.stopPropagation();
    
    // アクティブなメニューの切り替え
    setActiveMenu(prev => prev === menuId ? null : menuId);
  };

  // メニュー項目クリックハンドラ
  const handleItemClick = (itemId, action, e) => {
    console.log("Menu item clicked:", itemId);
    // クリックの伝播を停止
    e.stopPropagation();
    
    // アクションがある場合は実行、なければonMenuItemClickを呼び出す
    if (action && typeof action === 'function') {
      action();
    } else if (typeof onMenuItemClick === 'function') {
      onMenuItemClick(itemId);
    }
    
    // メニューを閉じる
    setActiveMenu(null);
  };

  // メニュー以外の場所をクリックしたらメニューを閉じる
  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (activeMenu && !e.target.closest('.menu-container')) {
        console.log("Clicked outside menu, closing");
        setActiveMenu(null);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [activeMenu]);

  return (
    <div className="menu-bar">
      {items.map((menu) => (
        <div key={menu.id} className="menu-container">
          <button
            className={`menu-button ${activeMenu === menu.id ? 'active' : ''}`}
            onClick={(e) => handleMenuClick(menu.id, e)}
          >
            {menu.label}
          </button>
          
          {activeMenu === menu.id && menu.submenu && (
            <div className="menu-dropdown">
              {menu.submenu.map((item, index) => 
                item.type === 'separator' ? (
                  <div key={`sep-${index}`} className="menu-separator" />
                ) : (
                  <button
                    key={item.id || `item-${index}`}
                    className="menu-item"
                    onClick={(e) => handleItemClick(item.id, item.action, e)}
                  >
                    {item.label}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default MenuBar;