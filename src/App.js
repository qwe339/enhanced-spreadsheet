import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SpreadsheetProvider } from './context/SpreadsheetContext';
import SpreadsheetEditor from './components/core/SpreadsheetEditor';
import './styles/App.css';

function App() {
  // デバッグ用のエラーハンドリング
  const errorHandler = (error, info) => {
    console.error('アプリケーションエラー:', error);
    console.error('エラー詳細:', info);
  };

  return (
    <React.StrictMode>
      <SpreadsheetProvider>
        <Router>
          <Routes>
            <Route path="/" element={<SpreadsheetEditor />} />
          </Routes>
        </Router>
      </SpreadsheetProvider>
    </React.StrictMode>
  );
}

export default App;