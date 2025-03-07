import React from 'react';
import Modal from './Modal';

const ConfirmDialog = ({ onClose, onConfirm, title, message, confirmButtonText = '確認', cancelButtonText = 'キャンセル' }) => {
  return (
    <Modal title={title} onClose={onClose}>
      <div className="modal-body">
        <p>{message}</p>
      </div>
      <div className="modal-footer">
        <button className="secondary" onClick={onClose}>{cancelButtonText}</button>
        <button 
          className="primary" 
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmButtonText}
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;