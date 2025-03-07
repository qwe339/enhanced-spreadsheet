// src/components/modals/CSVImportModal.jsx
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Papa from 'papaparse';

const CSVImportModal = ({ onClose, onImport }) => {
  const [csvContent, setCsvContent] = useState('');
  const [delimiter, setDelimiter] = useState(',');
  const [encoding, setEncoding] = useState('UTF-8');
  const [header, setHeader] = useState(false);
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // ファイル選択時の処理
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setLoading(true);
    setError('');
    
    try {
      // ファイルを読み込んでプレビュー
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          setCsvContent(event.target.result);
          
          // CSVをパース
          Papa.parse(event.target.result, {
            delimiter,
            header,
            preview: 5, // プレビュー行数
            encoding,
            complete: (results) => {
              setPreviewData(results.data);
              setLoading(false);
            },
            error: (err) => {
              setError(`CSVの解析に失敗しました: ${err.message}`);
              setLoading(false);
            }
          });
        } catch (err) {
          setError(`CSVの解析に失敗しました: ${err.message}`);
          setLoading(false);
        }
      };
      
      reader.onerror = () => {
        setError('ファイルの読み込みに失敗しました');
        setLoading(false);
      };
      
      reader.readAsText(selectedFile, encoding);
    } catch (err) {
      setError(`エラーが発生しました: ${err.message}`);
      setLoading(false);
    }
  };
  
  // デリミタ変更時にプレビュー更新
  useEffect(() => {
    if (file && csvContent) {
      try {
        setLoading(true);
        
        // CSVをパース
        Papa.parse(csvContent, {
          delimiter,
          header,
          preview: 5,
          encoding,
          complete: (results) => {
            setPreviewData(results.data);
            setLoading(false);
          },
          error: (err) => {
            setError(`CSVの解析に失敗しました: ${err.message}`);
            setLoading(false);
          }
        });
      } catch (err) {
        setError(`プレビュー更新エラー: ${err.message}`);
        setLoading(false);
      }
    }
  }, [delimiter, header, encoding, csvContent, file]);
  
  // インポート実行
  const handleImport = () => {
    if (!file) {
      setError('ファイルを選択してください');
      return;
    }
    
    setLoading(true);
    
    try {
      // CSVをパース
      Papa.parse(csvContent, {
        delimiter,
        header,
        encoding,
        complete: (results) => {
          // 空行や空データをフィルタリング
          const filteredData = results.data.filter(row => {
            // 配列の場合は少なくとも1つの非空要素があるかチェック
            if (Array.isArray(row)) {
              return row.some(cell => cell !== null && cell !== undefined && cell !== '');
            }
            // オブジェクトの場合は少なくとも1つの値があるかチェック
            else if (typeof row === 'object' && row !== null) {
              return Object.values(row).some(value => value !== null && value !== undefined && value !== '');
            }
            return false;
          });
          
          if (filteredData.length === 0) {
            setError('インポート可能なデータがありません');
            setLoading(false);
            return;
          }
          
          onImport(filteredData);
          onClose();
        },
        error: (err) => {
          setError(`CSVの解析に失敗しました: ${err.message}`);
          setLoading(false);
        }
      });
    } catch (err) {
      setError(`インポートに失敗しました: ${err.message}`);
      setLoading(false);
    }
  };

  return (
    <Modal title="CSVインポート" onClose={onClose}>
      <div className="modal-body">
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        <div className="form-group">
          <label>CSVファイル:</label>
          <input 
            type="file" 
            accept=".csv,.txt" 
            onChange={handleFileChange}
            className="file-input"
          />
        </div>
        
        <div className="form-group">
          <label>区切り文字:</label>
          <select 
            value={delimiter} 
            onChange={(e) => setDelimiter(e.target.value)}
            className="form-control"
          >
            <option value=",">カンマ (,)</option>
            <option value=";">セミコロン (;)</option>
            <option value="\t">タブ</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>エンコーディング:</label>
          <select 
            value={encoding} 
            onChange={(e) => setEncoding(e.target.value)}
            className="form-control"
          >
            <option value="UTF-8">UTF-8</option>
            <option value="Shift_JIS">Shift_JIS</option>
            <option value="ISO-8859-1">ISO-8859-1</option>
          </select>
        </div>
        
        <div className="form-group checkbox-group">
          <label>
            <input 
              type="checkbox" 
              checked={header} 
              onChange={(e) => setHeader(e.target.checked)}
            />
            1行目をヘッダーとして使用
          </label>
        </div>
        
        {previewData.length > 0 && (
          <div className="preview-section">
            <h4>プレビュー</h4>
            <div className="preview-table-container">
              <table className="preview-table">
                <tbody>
                  {previewData.map((row, rowIndex) => (
                    <tr key={`row-${rowIndex}`}>
                      {Array.isArray(row) 
                        ? row.map((cell, cellIndex) => (
                            <td key={`cell-${rowIndex}-${cellIndex}`}>
                              {cell !== null && cell !== undefined ? String(cell) : ''}
                            </td>
                          ))
                        : Object.entries(row).map(([key, value], cellIndex) => (
                            <td key={`cell-${rowIndex}-${cellIndex}`}>
                              {value !== null && value !== undefined ? String(value) : ''}
                            </td>
                          ))
                      }
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      
      <div className="modal-footer">
        <button 
          className="secondary" 
          onClick={onClose}
          disabled={loading}
        >
          キャンセル
        </button>
        <button 
          className="primary" 
          onClick={handleImport}
          disabled={!file || loading}
        >
          {loading ? 'インポート中...' : 'インポート'}
        </button>
      </div>
    </Modal>
  );
};

export default CSVImportModal;