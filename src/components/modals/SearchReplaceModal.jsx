// src/components/modals/SearchReplaceModal.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Modal from './Modal';
import './SearchReplaceModal.css';

const SearchReplaceModal = ({ onClose, onSearch, onReplace, onReplaceAll }) => {
  // 検索・置換の状態
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [wholeCell, setWholeCell] = useState(false);
  const [searchInAllSheets, setSearchInAllSheets] = useState(false);
  const [regularExpression, setRegularExpression] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [searchStats, setSearchStats] = useState({ total: 0, current: 0, sheets: {} });
  const [expandedResults, setExpandedResults] = useState(true);
  const [activeTab, setActiveTab] = useState('search');

  // 検索結果リストへの参照
  const resultsListRef = useRef(null);
  const searchInputRef = useRef(null);
  
  // コンポーネントがマウントされたときに検索入力欄にフォーカス
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // 検索を実行する関数
  const handleSearch = useCallback(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setCurrentResultIndex(-1);
      return;
    }
    
    setIsSearching(true);
    
    try {
      // 検索オプション
      const searchOptions = {
        matchCase,
        wholeCell,
        regularExpression,
        searchInAllSheets
      };
      
      // 検索を実行
      const results = onSearch(searchTerm, searchOptions);
      
      if (!results || results.length === 0) {
        setSearchResults([]);
        setCurrentResultIndex(-1);
        setSearchStats({ total: 0, current: 0, sheets: {} });
      } else {
        setSearchResults(results);
        setCurrentResultIndex(0);
        
        // シートごとの検索結果数を集計
        const sheetCounts = results.reduce((acc, result) => {
          const sheetName = result.sheet || 'current';
          if (!acc[sheetName]) acc[sheetName] = 0;
          acc[sheetName]++;
          return acc;
        }, {});
        
        setSearchStats({
          total: results.length,
          current: 1,
          sheets: sheetCounts
        });
        
        // 最初の結果にジャンプ
        setTimeout(() => {
          if (results.length > 0 && resultsListRef.current) {
            const firstResult = resultsListRef.current.querySelector('.search-result-item');
            if (firstResult) {
              firstResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          }
        }, 100);
      }
    } catch (error) {
      console.error('検索エラー:', error);
    } finally {
      setIsSearching(false);
    }
  }, [searchTerm, matchCase, wholeCell, regularExpression, searchInAllSheets, onSearch]);

  // Enterキーで検索を実行
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && e.target.id === 'search-term') {
      handleSearch();
    }
  }, [handleSearch]);

  // 次の検索結果に移動
  const handleNextResult = useCallback(() => {
    if (searchResults.length === 0) return;
    
    const nextIndex = (currentResultIndex + 1) % searchResults.length;
    setCurrentResultIndex(nextIndex);
    
    // 結果にジャンプ
    const result = searchResults[nextIndex];
    onSearch(searchTerm, { 
      matchCase, 
      wholeCell,
      regularExpression,
      jumpTo: result 
    });
    
    setSearchStats(prev => ({
      ...prev,
      current: nextIndex + 1
    }));
    
    // 結果リストで現在の項目をスクロール
    setTimeout(() => {
      if (resultsListRef.current) {
        const currentItem = resultsListRef.current.querySelector(`.search-result-item[data-index="${nextIndex}"]`);
        if (currentItem) {
          currentItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    }, 100);
  }, [searchResults, currentResultIndex, searchTerm, matchCase, wholeCell, regularExpression, onSearch]);

  // 前の検索結果に移動
  const handlePrevResult = useCallback(() => {
    if (searchResults.length === 0) return;
    
    const prevIndex = (currentResultIndex - 1 + searchResults.length) % searchResults.length;
    setCurrentResultIndex(prevIndex);
    
    // 結果にジャンプ
    const result = searchResults[prevIndex];
    onSearch(searchTerm, { 
      matchCase, 
      wholeCell,
      regularExpression,
      jumpTo: result 
    });
    
    setSearchStats(prev => ({
      ...prev,
      current: prevIndex + 1
    }));
    
    // 結果リストで現在の項目をスクロール
    setTimeout(() => {
      if (resultsListRef.current) {
        const currentItem = resultsListRef.current.querySelector(`.search-result-item[data-index="${prevIndex}"]`);
        if (currentItem) {
          currentItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    }, 100);
  }, [searchResults, currentResultIndex, searchTerm, matchCase, wholeCell, regularExpression, onSearch]);

  // 特定の検索結果にジャンプ
  const handleResultClick = useCallback((index) => {
    if (index < 0 || index >= searchResults.length) return;
    
    setCurrentResultIndex(index);
    
    // 結果にジャンプ
    const result = searchResults[index];
    onSearch(searchTerm, { 
      matchCase, 
      wholeCell,
      regularExpression,
      jumpTo: result 
    });
    
    setSearchStats(prev => ({
      ...prev,
      current: index + 1
    }));
  }, [searchResults, searchTerm, matchCase, wholeCell, regularExpression, onSearch]);

  // 選択された結果を置換
  const handleReplace = useCallback(() => {
    if (!searchTerm.trim() || currentResultIndex < 0) return;
    
    if (currentResultIndex >= 0 && currentResultIndex < searchResults.length) {
      const result = searchResults[currentResultIndex];
      
      // 置換を実行
      const success = onReplace(searchTerm, replaceTerm, result, { 
        matchCase, 
        wholeCell,
        regularExpression
      });
      
      if (success) {
        // 検索結果を更新
        handleSearch();
      }
    }
  }, [searchTerm, replaceTerm, currentResultIndex, searchResults, matchCase, wholeCell, regularExpression, onReplace, handleSearch]);

  // すべての検索結果を置換
  const handleReplaceAll = useCallback(() => {
    if (!searchTerm.trim()) return;
    
    // 置換を実行
    const count = onReplaceAll(searchTerm, replaceTerm, { 
      matchCase, 
      wholeCell,
      regularExpression,
      searchInAllSheets
    });
    
    if (count > 0) {
      alert(`${count}件置換しました。`);
      // 検索結果をリセット
      setSearchResults([]);
      setCurrentResultIndex(-1);
      setSearchStats({ total: 0, current: 0, sheets: {} });
    } else {
      alert('置換する項目がありませんでした。');
    }
  }, [searchTerm, replaceTerm, matchCase, wholeCell, regularExpression, searchInAllSheets, onReplaceAll]);

  // 検索オプション変更時に検索結果をリセット
  useEffect(() => {
    setSearchResults([]);
    setCurrentResultIndex(-1);
    setSearchStats({ total: 0, current: 0, sheets: {} });
  }, [matchCase, wholeCell, regularExpression, searchInAllSheets]);

  // セル内容を表示用にフォーマット
  const formatCellContent = (content) => {
    if (content === null || content === undefined) return '';
    
    const str = String(content);
    if (str.length > 50) {
      return str.substring(0, 47) + '...';
    }
    return str;
  };

  // 検索結果ハイライト処理
  const highlightSearchTerm = (text) => {
    if (!searchTerm.trim() || !text) return text;
    
    try {
      let regex;
      
      if (regularExpression) {
        // 正規表現の場合
        regex = new RegExp(searchTerm, matchCase ? 'g' : 'gi');
      } else {
        // 通常の検索の場合はエスケープ
        const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        regex = new RegExp(escapedSearchTerm, matchCase ? 'g' : 'gi');
      }
      
      // 文字列に分割してハイライト
      const parts = String(text).split(regex);
      
      if (parts.length === 1) return text;
      
      // 検索語にマッチする部分を取得
      const matches = String(text).match(regex);
      
      // ハイライト部分を含む配列を作成
      const result = [];
      parts.forEach((part, i) => {
        result.push(part);
        if (i < parts.length - 1 && matches && matches[i]) {
          result.push(<span key={i} className="search-highlight">{matches[i]}</span>);
        }
      });
      
      return result;
    } catch (e) {
      console.error('ハイライト処理エラー:', e);
      return text;
    }
  };

  return (
    <Modal title="検索と置換" onClose={onClose} className="search-replace-modal">
      <div className="search-tabs">
        <button 
          className={`search-tab ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          検索
        </button>
        <button 
          className={`search-tab ${activeTab === 'replace' ? 'active' : ''}`}
          onClick={() => setActiveTab('replace')}
        >
          置換
        </button>
      </div>
      
      <div className="modal-body">
        <div className="search-replace-panel">
          <div className="form-group">
            <label htmlFor="search-term">検索文字列:</label>
            <div className="search-input-container">
              <input 
                id="search-term"
                ref={searchInputRef}
                type="text" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                className="form-control"
                placeholder="検索する文字列を入力..."
              />
              <button
                className="search-button"
                onClick={handleSearch}
                disabled={isSearching || !searchTerm.trim()}
              >
                {isSearching ? '検索中...' : '検索'}
              </button>
            </div>
          </div>
          
          {activeTab === 'replace' && (
            <div className="form-group">
              <label htmlFor="replace-term">置換文字列:</label>
              <input 
                id="replace-term"
                type="text" 
                value={replaceTerm} 
                onChange={(e) => setReplaceTerm(e.target.value)}
                className="form-control"
                placeholder="置換後の文字列を入力..."
              />
            </div>
          )}
          
          <div className="search-options">
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
            
            <div className="form-group options-group">
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={regularExpression} 
                  onChange={(e) => setRegularExpression(e.target.checked)}
                />
                正規表現を使用
              </label>
              
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={searchInAllSheets} 
                  onChange={(e) => setSearchInAllSheets(e.target.checked)}
                />
                すべてのシートを検索
              </label>
            </div>
          </div>
          
          {activeTab === 'replace' && (
            <div className="replace-buttons">
              <button 
                className="secondary"
                onClick={handleReplace}
                disabled={currentResultIndex < 0 || !searchTerm.trim()}
              >
                置換
              </button>
              <button 
                className="primary"
                onClick={handleReplaceAll}
                disabled={!searchTerm.trim()}
              >
                すべて置換
              </button>
            </div>
          )}
        </div>
        
        <div className="search-results-panel">
          <div className="search-results-header">
            <button
              className="toggle-results-button"
              onClick={() => setExpandedResults(!expandedResults)}
            >
              {expandedResults ? '▼' : '▶'} 検索結果
            </button>
            
            {searchStats.total > 0 && (
              <div className="search-stats">
                {searchStats.current} / {searchStats.total} 件見つかりました
              </div>
            )}
            
            <div className="search-navigation">
              <button 
                className="nav-button prev-button"
                onClick={handlePrevResult}
                disabled={searchResults.length === 0}
                title="前へ"
              >
                ◀
              </button>
              <button 
                className="nav-button next-button"
                onClick={handleNextResult}
                disabled={searchResults.length === 0}
                title="次へ"
              >
                ▶
              </button>
            </div>
          </div>
          
          {expandedResults && (
            <div className="search-results-list" ref={resultsListRef}>
              {searchResults.length === 0 ? (
                <div className="no-results">
                  {searchTerm.trim() ? '検索結果はありません' : '検索語を入力してください'}
                </div>
              ) : (
                searchResults.map((result, index) => (
                  <div 
                    key={`${result.sheet || 'current'}-${result.row}-${result.col}`}
                    className={`search-result-item ${index === currentResultIndex ? 'current' : ''}`}
                    onClick={() => handleResultClick(index)}
                    data-index={index}
                  >
                    <div className="result-location">
                      {result.sheet && `${result.sheet} / `}
                      {`${result.cellAddress || `${numToLetter(result.col)}${result.row + 1}`}`}
                    </div>
                    <div className="result-content">
                      {highlightSearchTerm(formatCellContent(result.value))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="modal-footer search-replace-footer">
        <button className="secondary" onClick={onClose}>閉じる</button>
      </div>
    </Modal>
  );
};

// 列インデックスをA1形式に変換するユーティリティ関数
function numToLetter(colIndex) {
  let temp, letter = '';
  while (colIndex >= 0) {
    temp = colIndex % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    colIndex = (colIndex - temp) / 26 - 1;
  }
  return letter;
}

export default SearchReplaceModal;