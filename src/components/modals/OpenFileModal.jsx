import React, { useState, useEffect } from 'react';
import Modal from './Modal';

const OpenFileModal = ({ onClose, onFileOpen }) => {
  const [selectedFile, setSelectedFile] = useState('');
  const [savedFiles, setSavedFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  // 保存済みファイルのリストを取得
  useEffect(() => {
    try {
      const fileList = JSON.parse(localStorage.getItem('spreadsheet_files') || '[]');
      setSavedFiles(fileList);
    } catch (error) {
      console.error('ファイルリスト取得エラー:', error);
      setSavedFiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFileSelect = (e) => {
    setSelectedFile(e.target.value);
  };

  const handleOpen = () => {
    if (selectedFile) {
      onFileOpen(selectedFile);
      onClose();
    }
  };

  // ファイルの削除機能を追加
  const handleDeleteFile = (e, filename) => {
    e.stopPropagation();
    
    if (window.confirm(`ファイル "${filename}" を削除してもよろしいですか？`)) {
      // ファイルをローカルストレージから削除
      localStorage.removeItem(`spreadsheet_${filename}`);
      
      // ファイルリストを更新
      const updatedFileList = savedFiles.filter(file => file !== filename);
      localStorage.setItem('spreadsheet_files', JSON.stringify(updatedFileList));
      
      // 状態を更新
      setSavedFiles(updatedFileList);
      
      // 選択中のファイルを削除した場合は選択を解除
      if (selectedFile === filename) {
        setSelectedFile('');
      }
    }
  };

  return (
    <Modal title="ファイルを開く" onClose={onClose}>
      <div className="modal-body">
        {loading ? (
          <div className="loading-indicator">ファイルを読み込み中...</div>
        ) : savedFiles.length === 0 ? (
          <div className="empty-state">保存されたファイルがありません</div>
        ) : (
          <div className="file-list">
            {savedFiles.map(file => (
              <div 
                key={file} 
                className={`file-item ${selectedFile === file ? 'selected' : ''}`}
                onClick={() => setSelectedFile(file)}
                onDoubleClick={() => {
                  setSelectedFile(file);
                  handleOpen();
                }}
              >
                <span className="file-icon">📄</span>
                <span className="file-name">{file}</span>
                <button 
                  className="file-delete-btn"
                  onClick={(e) => handleDeleteFile(e, file)}
                  title="削除"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
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