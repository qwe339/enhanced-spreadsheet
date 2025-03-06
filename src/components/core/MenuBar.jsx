import React, { useState } from 'react';
import '../../styles/MenuBar.css';

const MenuBar = ({ items = [], onMenuItemClick }) => {
  const [activeMenu, setActiveMenu] = useState(null);

  const handleMenuClick = (menuId) => {
    if (activeMenu === menuId) {
      setActiveMenu(null);
    } else {
      setActiveMenu(menuId);
      // メニュードロップダウンの位置を調整するため、次のフレームで実行
      setTimeout(() => {
        const menuDropdowns = document.querySelectorAll('.menu-dropdown');
        menuDropdowns.forEach(dropdown => {
          // ドロップダウンが画面の下に隠れないように位置調整
          const rect = dropdown.getBoundingClientRect();
          if (rect.bottom > window.innerHeight) {
            dropdown.style.maxHeight = `${window.innerHeight - rect.top - 20}px`;
            dropdown.style.overflowY = 'auto';
          }
        });
      }, 0);
    }
  };

  const handleMenuItemClick = (itemId) => {
    console.log('Menu item clicked:', itemId);
    setActiveMenu(null);
    // onMenuItemClickが関数であることを確認
    if (typeof onMenuItemClick === 'function') {
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
      {items.map((menu) => (
        <div key={menu.id} className="menu-container">
          <div
            className={`menu-title ${activeMenu === menu.id ? 'active' : ''}`}
            onClick={() => handleMenuClick(menu.id)}
          >
            {menu.label}
          </div>
          {activeMenu === menu.id && menu.submenu && (
            <div className="menu-dropdown">
              {menu.submenu.map((item, index) => 
                item.type === 'separator' ? (
                  <div key={`${menu.id}-separator-${index}`} className="menu-separator"></div>
                ) : (
                  <div
                    key={item.id}
                    className="menu-item"
                    onClick={() => {
                      if (item.action && typeof item.action === 'function') {
                        item.action();
                      } else {
                        handleMenuItemClick(item.id);
                      }
                    }}
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