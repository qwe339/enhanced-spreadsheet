import React, { useState } from 'react';
import Modal from './Modal';

const SaveAsModal = ({ onClose, onSave, currentFilename }) => {
  const [filename, setFilename] = useState(currentFilename || '');

  const handleFilenameChange = (e) => {
    setFilename(e.target.value);
  };

  const handleSave = () => {
    if (filename) {
      onSave(filename);
      onClose();
    }
  };

  return (
    <Modal title="名前を付けて保存" onClose={onClose}>
      <div className="modal-body">
        <div className="form-group">
          <label>ファイル名:</label>
          <input 
            type="text" 
            value={filename} 
            onChange={handleFilenameChange}
            placeholder="ファイル名を入力"
          />
        </div>
      </div>
      <div className="modal-footer">
        <button className="secondary" onClick={onClose}>キャンセル</button>
        <button 
          className="primary" 
          onClick={handleSave}
          disabled={!filename}
        >
          保存
        </button>
      </div>
    </Modal>
  );
};

export default SaveAsModal;