import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SpreadsheetProvider } from './context/SpreadsheetContext';
import SpreadsheetEditor from './components/core/SpreadsheetEditor';
import './styles/App.css';

function App() {
  return (
    <SpreadsheetProvider>
      <Router>
        <Routes>
          <Route path="/" element={<SpreadsheetEditor />} />
        </Routes>
      </Router>
    </SpreadsheetProvider>
  );
}

export default App;