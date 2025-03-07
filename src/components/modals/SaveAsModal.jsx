import React, { useState, useEffect } from 'react';
import Modal from './Modal';

const SaveAsModal = ({ onClose, onSave, currentFilename }) => {
  const [filename, setFilename] = useState(currentFilename || '');
  const [savedFiles, setSavedFiles] = useState([]);
  const [fileExists, setFileExists] = useState(false);

  // 保存済みファイルのリストを取得
  useEffect(() => {
    try {
      const fileList = JSON.parse(localStorage.getItem('spreadsheet_files') || '[]');
      setSavedFiles(fileList);
    } catch (error) {
      console.error('ファイルリスト取得エラー:', error);
      setSavedFiles([]);
    }
  }, []);

  // ファイル名の重複チェック
  useEffect(() => {
    const exists = savedFiles.includes(filename) && filename !== currentFilename;
    setFileExists(exists);
  }, [filename, savedFiles, currentFilename]);

  const handleFilenameChange = (e) => {
    setFilename(e.target.value);
  };

  const handleSave = () => {
    if (!filename) return;

    // 同名ファイルが存在する場合は確認
    if (fileExists) {
      const confirmed = window.confirm(`"${filename}" は既に存在します。上書きしますか？`);
      if (!confirmed) return;
    }

    onSave(filename);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && filename) {
      handleSave();
    }
  };

  return (
    <Modal title="名前を付けて保存" onClose={onClose}>
      <div className="modal-body">
        <div className="form-group">
          <label htmlFor="filename">ファイル名:</label>
          <input 
            id="filename"
            type="text" 
            value={filename} 
            onChange={handleFilenameChange}
            onKeyDown={handleKeyDown}
            placeholder="ファイル名を入力"
            autoFocus
          />
          {fileExists && (
            <div className="form-warning">
              <span role="img" aria-label="warning">⚠️</span> 同名のファイルが既に存在します
            </div>
          )}
        </div>
        
        {savedFiles.length > 0 && (
          <div className="form-group">
            <label>保存済みファイル:</label>
            <div className="saved-files-list">
              {savedFiles.map(file => (
                <div 
                  key={file} 
                  className="saved-file-item"
                  onClick={() => setFilename(file)}
                >
                  {file}
                </div>
              ))}
            </div>
          </div>
        )}
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