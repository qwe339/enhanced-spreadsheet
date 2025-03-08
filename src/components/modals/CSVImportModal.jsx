// src/components/modals/CSVImportModal.jsx
import React, { useState, useEffect, useCallback } from 'react';
import Modal from './Modal';
import Papa from 'papaparse';

const CSVImportModal = ({ onClose, onImport }) => {
  // 状態管理
  const [file, setFile] = useState(null);
  const [csvContent, setCsvContent] = useState('');
  const [delimiter, setDelimiter] = useState('auto');
  const [encoding, setEncoding] = useState('auto');
  const [header, setHeader] = useState(false);
  const [startingRow, setStartingRow] = useState('1');
  const [previewData, setPreviewData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fileInfo, setFileInfo] = useState(null);

  // ファイル選択時の処理
  const handleFileChange = useCallback(async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setLoading(true);
    setError('');
    
    try {
      setFileInfo({
        name: selectedFile.name,
        size: formatFileSize(selectedFile.size),
        type: selectedFile.type || 'text/csv'
      });
      
      // 文字コードを自動検出
      const detectedEncoding = encoding === 'auto' 
        ? await detectEncoding(selectedFile) 
        : encoding;
      
      console.log(`検出された文字コード: ${detectedEncoding}`);
      
      // ファイルを読み込み
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        setCsvContent(content);
        
        // 区切り文字を自動検出
        const effectiveDelimiter = delimiter === 'auto' 
          ? detectDelimiters(content) 
          : delimiter;
        
        // プレビュー用にCSVをパース
        parseCSVPreview(content, effectiveDelimiter, detectedEncoding);
      };
      
      reader.onerror = (error) => {
        setError(`ファイルの読み込みに失敗しました: ${error.message}`);
        setLoading(false);
      };
      
      reader.readAsText(selectedFile, detectedEncoding);
    } catch (error) {
      console.error('ファイル処理エラー:', error);
      setError(`ファイルの処理に失敗しました: ${error.message}`);
      setLoading(false);
    }
  }, [delimiter, encoding]);

  // CSVプレビューのパース
  const parseCSVPreview = useCallback((content, delimiter, encoding) => {
    Papa.parse(content, {
      delimiter: delimiter,
      header: header,
      encoding: encoding,
      preview: 5,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: (results) => {
        setPreviewData(results.data);
        setLoading(false);
        
        // 検出した区切り文字を表示
        if (delimiter === 'auto') {
          setDelimiter(detectDelimiters(content));
        }
      },
      error: (error) => {
        console.error('プレビュー生成エラー:', error);
        setError(`プレビューの生成に失敗しました: ${error.message}`);
        setLoading(false);
      }
    });
  }, [header]);

  // ヘッダー設定が変更された場合のプレビュー更新
  useEffect(() => {
    if (csvContent && !loading) {
      const effectiveDelimiter = delimiter === 'auto' 
        ? detectDelimiters(csvContent) 
        : delimiter;
      parseCSVPreview(csvContent, effectiveDelimiter, encoding);
    }
  }, [csvContent, delimiter, encoding, header, loading, parseCSVPreview]);

  // 文字コードの自動検出
  const detectEncoding = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      const blob = file.slice(0, 4096); // 最初の4KBだけ読み込む
      
      reader.onload = (e) => {
        const content = new Uint8Array(e.target.result);
        
        // BOMチェック (UTF-8)
        if (content.length >= 3 && content[0] === 0xEF && content[1] === 0xBB && content[2] === 0xBF) {
          resolve('UTF-8');
          return;
        }
        
        // 日本語文字を含むかチェック
        let hasJapaneseChars = false;
        for (let i = 0; i < content.length; i++) {
          if (content[i] > 0x7F) {
            hasJapaneseChars = true;
            break;
          }
        }
        
        if (hasJapaneseChars) {
          resolve('Shift_JIS'); // 日本語文字があればShift_JISと推測
        } else {
          resolve('UTF-8'); // なければUTF-8と推測
        }
      };
      
      reader.readAsArrayBuffer(blob);
    });
  };

  // 区切り文字の自動検出
  const detectDelimiters = (text) => {
    const delimiters = {
      ',': (text.match(/,/g) || []).length,
      '\t': (text.match(/\t/g) || []).length,
      ';': (text.match(/;/g) || []).length
    };
    
    // 最も頻出する区切り文字を選択
    const detected = Object.entries(delimiters)
      .sort((a, b) => b[1] - a[1])
      .filter(([_, count]) => count > 0)
      .map(([delimiter]) => delimiter)[0] || ',';
      
    return detected;
  };
  
  // ファイルサイズのフォーマット
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // インポート実行
  const handleImport = async () => {
    if (!file || !csvContent) {
      setError('ファイルを選択してください');
      return;
    }
    
    setLoading(true);
    
    try {
      // 区切り文字の自動検出
      const effectiveDelimiter = delimiter === 'auto' 
        ? detectDelimiters(csvContent) 
        : delimiter;
      
      console.log(`インポート設定: 区切り文字="${effectiveDelimiter}", エンコーディング="${encoding}", ヘッダー=${header}, 開始行=${startingRow}`);
      
      // CSVをパース
      Papa.parse(csvContent, {
        delimiter: effectiveDelimiter,
        header: header,
        encoding: encoding,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        dynamicTyping: true, // 数値を自動的に変換
        complete: (results) => {
          if (results.errors && results.errors.length > 0) {
            console.warn('パース警告:', results.errors);
          }
          
          // データ変換処理
          let processedData;
          
          if (header) {
            if (results.data.length === 0 || !results.data[0]) {
              setError('有効なデータがありません');
              setLoading(false);
              return;
            }
            
            // ヘッダー行がある場合はオブジェクトから配列に変換
            const headers = Object.keys(results.data[0]);
            processedData = [
              headers, // ヘッダー行を最初の行として追加
              ...results.data.map(row => headers.map(key => 
                row[key] !== undefined ? row[key] : ''
              ))
            ];
          } else {
            processedData = results.data;
          }
          
          // 開始行の指定を反映
          const startRow = parseInt(startingRow, 10) - 1;
          if (startRow > 0 && startRow < processedData.length) {
            processedData = processedData.slice(startRow);
          }
          
          // 空の行をフィルタリング
          const filteredData = processedData.filter(row => 
            Array.isArray(row) && row.some(cell => 
              cell !== null && cell !== undefined && cell !== ''
            )
          );
          
          if (filteredData.length === 0) {
            setError('インポート可能なデータがありません');
            setLoading(false);
            return;
          }
          
          console.log(`インポートデータ: ${filteredData.length}行 × ${filteredData[0].length}列`);
          
          // インポート成功イベントをコンソールに出力
          console.log('CSVインポート成功:', {
            rows: filteredData.length,
            columns: filteredData[0].length,
            filename: file.name
          });
          
          // インポート処理実行
          onImport(filteredData);
          onClose();
        },
        error: (error) => {
          console.error('CSVパースエラー:', error);
          setError(`CSVの解析に失敗しました: ${error.message}`);
          setLoading(false);
        }
      });
    } catch (error) {
      console.error('インポート処理エラー:', error);
      setError(`インポートに失敗しました: ${error.message}`);
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
          {fileInfo && (
            <div className="file-info">
              <p><strong>ファイル名:</strong> {fileInfo.name}</p>
              <p><strong>サイズ:</strong> {fileInfo.size}</p>
              <p><strong>タイプ:</strong> {fileInfo.type}</p>
            </div>
          )}
        </div>
        
        <div className="form-group">
          <label>区切り文字:</label>
          <select 
            value={delimiter} 
            onChange={(e) => setDelimiter(e.target.value)}
            className="form-control"
            disabled={loading}
          >
            <option value="auto">自動検出</option>
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
            disabled={loading}
          >
            <option value="auto">自動検出</option>
            <option value="UTF-8">UTF-8</option>
            <option value="Shift_JIS">Shift_JIS</option>
            <option value="EUC-JP">EUC-JP</option>
            <option value="ISO-8859-1">ISO-8859-1</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>開始行:</label>
          <input 
            type="number" 
            value={startingRow} 
            onChange={(e) => setStartingRow(e.target.value)}
            min="1"
            className="form-control"
            disabled={loading}
          />
          <small className="form-text">1から始まる行番号を指定してください。</small>
        </div>
        
        <div className="form-group checkbox-group">
          <label>
            <input 
              type="checkbox" 
              checked={header} 
              onChange={(e) => setHeader(e.target.checked)}
              disabled={loading}
            />
            1行目をヘッダーとして使用
          </label>
          <small className="form-text">
            チェックした場合、1行目（または指定した開始行）がヘッダー行として処理されます。
          </small>
        </div>
        
        {loading && (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <p>CSVデータを処理中...</p>
          </div>
        )}
        
        {previewData.length > 0 && (
          <div className="preview-section">
            <h4>プレビュー (最初の5行)</h4>
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
            <p className="preview-note">
              注意: 実際のインポートではすべての行が処理されます。
            </p>
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

// CSVインポートモーダル用のスタイルをここに追加
const styles = `
  .file-info {
    margin-top: 10px;
    padding: 8px;
    background-color: #f8f9fa;
    border-radius: 4px;
    font-size: 13px;
  }
  
  .file-info p {
    margin: 4px 0;
  }
  
  .loading-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  
  .spinner {
    border: 4px solid #f3f3f3;
    border-top: 4px solid #3498db;
    border-radius: 50%;
    width: 30px;
    height: 30px;
    animation: spin 1s linear infinite;
    margin-bottom: 10px;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .preview-note {
    font-size: 12px;
    font-style: italic;
    color: #666;
    margin-top: 8px;
  }
  
  .form-text {
    font-size: 12px;
    color: #666;
    margin-top: 4px;
  }
`;

// スタイルを動的に追加
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}

export default CSVImportModal;