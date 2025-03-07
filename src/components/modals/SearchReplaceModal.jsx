import React, { useState, useEffect } from 'react';
import Modal from './Modal';

const SearchReplaceModal = ({ onClose, onSearch, onReplace, onReplaceAll }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [wholeCell, setWholeCell] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(-1);

  useEffect(() => {
    // フォーカスを検索フィールドに設定
    const searchInput = document.getElementById('search-term');
    if (searchInput) {
      searchInput.focus();
    }
  }, []);

  const handleSearch = () => {
    if (!searchTerm.trim()) return;
    
    const results = onSearch(searchTerm, { matchCase, wholeCell });
    setSearchResults(results || []);
    setCurrentResultIndex(results && results.length > 0 ? 0 : -1);
  };

  const handleNextResult = () => {
    if (searchResults.length === 0) return;
    
    const nextIndex = (currentResultIndex + 1) % searchResults.length;
    setCurrentResultIndex(nextIndex);
    
    // 結果にジャンプ
    const result = searchResults[nextIndex];
    onSearch(searchTerm, { matchCase, wholeCell, jumpTo: result });
  };

  const handlePrevResult = () => {
    if (searchResults.length === 0) return;
    
    const prevIndex = (currentResultIndex - 1 + searchResults.length) % searchResults.length;
    setCurrentResultIndex(prevIndex);
    
    // 結果にジャンプ
    const result = searchResults[prevIndex];
    onSearch(searchTerm, { matchCase, wholeCell, jumpTo: result });
  };

  const handleReplace = () => {
    if (!searchTerm.trim()) return;
    
    if (currentResultIndex >= 0 && currentResultIndex < searchResults.length) {
      const result = searchResults[currentResultIndex];
      onReplace(searchTerm, replaceTerm, result, { matchCase, wholeCell });
      
      // 検索結果を更新
      handleSearch();
    }
  };

  const handleReplaceAll = () => {
    if (!searchTerm.trim()) return;
    
    const count = onReplaceAll(searchTerm, replaceTerm, { matchCase, wholeCell });
    setSearchResults([]);
    setCurrentResultIndex(-1);
    
    alert(`${count}件置換しました。`);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.target.id === 'search-term') {
      handleSearch();
    }
  };

  return (
    <Modal title="検索と置換" onClose={onClose}>
      <div className="modal-body">
        <div className="form-group">
          <label htmlFor="search-term">検索文字列:</label>
          <input 
            id="search-term"
            type="text" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            className="form-control"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="replace-term">置換文字列:</label>
          <input 
            id="replace-term"
            type="text" 
            value={replaceTerm} 
            onChange={(e) => setReplaceTerm(e.target.value)}
            className="form-control"
          />
        </div>
        
        <div className="form-group options-group">
          <label className="checkbox-label">
            <input 
              type="checkbox" 
              checked={matchCase} 
              onChange={(e) => setMatchCase(e.target.checked)}
            />
            大文字/小文字を区別
          </label>
          
          <label className="checkbox-label">
            <input 
              type="checkbox" 
              checked={wholeCell} 
              onChange={(e) => setWholeCell(e.target.checked)}
            />
            セル内容が完全に一致
          </label>
        </div>
        
        {searchResults.length > 0 && (
          <div className="search-results-info">
            {currentResultIndex + 1} / {searchResults.length} 件見つかりました
          </div>
        )}
      </div>
      
      <div className="modal-footer">
        <div className="search-buttons">
          <button 
            className="secondary"
            onClick={handleSearch}
          >
            検索
          </button>
          <button 
            className="secondary"
            onClick={handlePrevResult}
            disabled={searchResults.length === 0}
          >
            前へ
          </button>
          <button 
            className="secondary"
            onClick={handleNextResult}
            disabled={searchResults.length === 0}
          >
            次へ
          </button>
        </div>
        
        <div className="replace-buttons">
          <button 
            className="secondary"
            onClick={handleReplace}
            disabled={currentResultIndex < 0}
          >
            置換
          </button>
          <button 
            className="primary"
            onClick={handleReplaceAll}
          >
            すべて置換
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default SearchReplaceModal;