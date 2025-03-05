import React, { useState } from 'react';
import Modal from './Modal';

const OpenFileModal = ({ onClose, onFileOpen, savedFiles }) => {
  const [selectedFile, setSelectedFile] = useState('');

  const handleFileSelect = (e) => {
    setSelectedFile(e.target.value);
  };

  const handleOpen = () => {
    if (selectedFile) {
      onFileOpen(selectedFile);
      onClose();
    }
  };

  return (
    <Modal title="ファイルを開く" onClose={onClose}>
      <div className="modal-body">
        <div className="form-group">
          <label>保存されたファイル:</label>
          <select 
            value={selectedFile} 
            onChange={handleFileSelect}
            className="file-select"
          >
            <option value="">選択してください</option>
            {savedFiles.map(file => (
              <option key={file} value={file}>{file}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="modal-footer">
        <button className="secondary" onClick={onClose}>キャンセル</button>
        <button 
          className="primary" 
          onClick={handleOpen}
          disabled={!selectedFile}
        >
          開く
        </button>
      </div>
    </Modal>
  );
};

export default OpenFileModal;