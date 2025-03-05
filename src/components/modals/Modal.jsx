import React, { useEffect } from 'react';
import '../../styles/Modals.css';

const Modal = ({ title, children, onClose }) => {
  // ESCキーでモーダルを閉じる
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    // モーダルが開いている間はスクロールを無効化
    document.body.style.overflow = 'hidden';
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [onClose]);

  // モーダル外のクリックでモーダルを閉じる
  const handleBackdropClick = (e) => {
    if (e.target.className === 'modal-overlay') {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleBackdropClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <span className="modal-close" onClick={onClose}>&times;</span>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Modal;