import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import '../../styles/MenuBar.css';

// ドロップダウンメニューをPortalとしてレンダリング
const MenuDropdown = ({ menu, position, onItemClick, onClose }) => {
  // Portalのコンテナ
  const dropdownRoot = document.getElementById('dropdown-root') || document.body;
  
  // 外部クリックを処理するためのref
  const dropdownRef = useRef(null);
  
  // メニュー項目の取得 - submenuかitemsのどちらかを使用
  const menuItems = menu.submenu || menu.items || [];
  
  useEffect(() => {
    // 外部クリックハンドラ
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };
    
    // ドキュメントにイベントリスナーを追加（少し遅延させる）
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleOutsideClick);
    }, 100);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [onClose]);
  
  // メニュー項目がない場合
  if (!menuItems || menuItems.length === 0) {
    console.error('Menu has no items:', menu);
    return null;
  }
  
  // ReactPortalを使ってドロップダウンをdocument.bodyに直接レンダリング
  return ReactDOM.createPortal(
    <div 
      ref={dropdownRef}
      className="menu-dropdown"
      style={{
        position: 'fixed',
        left: `${position.left}px`,
        top: `${position.top}px`,
        minWidth: '200px',
        backgroundColor: 'white',
        border: '1px solid #ddd',
        borderRadius: '4px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
        zIndex: 9999,
        margin: 0,
        padding: 0
      }}
    >
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '4px 8px',
        borderBottom: '1px solid #eee',
        fontWeight: 'bold',
        fontSize: '12px'
      }}>
        {menu.label}
      </div>
      
      {menuItems.map((item, index) => 
        item.type === 'separator' ? (
          <div 
            key={`sep-${index}`} 
            style={{
              height: '1px',
              backgroundColor: '#ddd',
              margin: '4px 0'
            }}
          />
        ) : (
          <button
            key={item.id || `item-${index}`}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              background: 'none',
              border: 'none',
              padding: '8px 16px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            onClick={() => onItemClick(item.id, item.action)}
          >
            {item.label}
          </button>
        )
      )}
    </div>,
    dropdownRoot
  );
};

const MenuBar = ({ items = [], onMenuItemClick }) => {
  const [activeMenu, setActiveMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0 });
  
  // ポータルコンテナを作成
  useEffect(() => {
    if (!document.getElementById('dropdown-root')) {
      const root = document.createElement('div');
      root.id = 'dropdown-root';
      document.body.appendChild(root);
      
      return () => {
        if (document.body.contains(root)) {
          document.body.removeChild(root);
        }
      };
    }
  }, []);
  
  // メニュー構造をコンソールに出力 (デバッグ用)
  useEffect(() => {
    console.log("MenuBar items:", items);
  }, [items]);
  
  // メニューボタンクリックハンドラ
  const handleMenuClick = (menuId, event) => {
    event.stopPropagation();
    console.log("Menu clicked:", menuId);
    
    // ボタン位置を取得
    const rect = event.currentTarget.getBoundingClientRect();
    setMenuPosition({
      left: rect.left,
      top: rect.bottom
    });
    
    // 同じメニューならtoggle、違うならそのメニューを開く
    setActiveMenu(prevMenu => prevMenu === menuId ? null : menuId);
  };
  
  // メニュー項目クリックハンドラ
  const handleItemClick = (itemId, action) => {
    console.log("Menu item clicked:", itemId);
    
    // アクションまたはコールバックを実行
    if (action && typeof action === 'function') {
      action();
    } else if (typeof onMenuItemClick === 'function') {
      onMenuItemClick(itemId);
    }
    
    // メニューを閉じる
    setActiveMenu(null);
  };
  
  // ESCキーでメニューを閉じる
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && activeMenu) {
        setActiveMenu(null);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeMenu]);
  
  // アクティブメニューを取得
  const getActiveMenu = () => {
    if (!activeMenu || !Array.isArray(items)) return null;
    return items.find(item => item.id === activeMenu);
  };
  
  // アクティブなメニュー項目
  const activeMenuObject = getActiveMenu();
  // メニュー項目を持っているかチェック (submenu または items)
  const hasMenuItems = activeMenuObject && 
    ((activeMenuObject.submenu && activeMenuObject.submenu.length > 0) || 
     (activeMenuObject.items && activeMenuObject.items.length > 0));
  
  return (
    <div className="menu-bar">
      {Array.isArray(items) && items.map((menu) => (
        <div key={menu.id} className="menu-container">
          <button
            className={`menu-button ${activeMenu === menu.id ? 'active' : ''}`}
            onClick={(e) => handleMenuClick(menu.id, e)}
          >
            {menu.label}
          </button>
        </div>
      ))}
      
      {/* アクティブメニューのドロップダウン */}
      {activeMenu && activeMenuObject && hasMenuItems && (
        <MenuDropdown
          menu={activeMenuObject}
          position={menuPosition}
          onItemClick={handleItemClick}
          onClose={() => setActiveMenu(null)}
        />
      )}
    </div>
  );
};

export default MenuBar;