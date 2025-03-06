import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SpreadsheetProvider } from './context/SpreadsheetContext';
import SpreadsheetEditorWithPlugins from './components/core/SpreadsheetEditorWithPlugins';
import './styles/App.css';

function App() {
  return (
    <React.StrictMode>
      <SpreadsheetProvider>
        <Router>
          <Routes>
            <Route path="/" element={<SpreadsheetEditorWithPlugins />} />
          </Routes>
        </Router>
      </SpreadsheetProvider>
    </React.StrictMode>
  );
}

export default App;