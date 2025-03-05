import React, { useState } from 'react';
import Modal from './Modal';

const CSVImportModal = ({ onClose, onImport }) => {
  const [csvContent, setCsvContent] = useState('');
  const [delimiter, setDelimiter] = useState(',');
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCsvContent(event.target.result);
      };
      reader.readAsText(file);
    }
  };
  
  const handleDelimiterChange = (e) => {
    setDelimiter(e.target.value);
  };
  
  const handleImport = () => {
    if (csvContent) {
      onImport(csvContent, { delimiter });
      onClose();
    }
  };

  return (
    <Modal title="CSVインポート" onClose={onClose}>
      <div className="modal-body">
        <div className="form-group">
          <label>CSVファイル:</label>
          <input 
            type="file" 
            accept=".csv,.txt" 
            onChange={handleFileChange}
          />
        </div>
        <div className="form-group">
          <label>区切り文字:</label>
          <select value={delimiter} onChange={handleDelimiterChange}>
            <option value=",">カンマ (,)</option>
            <option value=";">セミコロン (;)</option>
            <option value="\t">タブ</option>
          </select>
        </div>
      </div>
      <div className="modal-footer">
        <button className="secondary" onClick={onClose}>キャンセル</button>
        <button 
          className="primary" 
          onClick={handleImport}
          disabled={!csvContent}
        >
          インポート
        </button>
      </div>
    </Modal>
  );
};

export default CSVImportModal;