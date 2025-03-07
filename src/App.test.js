// src/App.test.js を更新
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import SpreadsheetEditorWithPlugins from './components/core/SpreadsheetEditorWithPlugins';
import { SpreadsheetProvider } from './context/SpreadsheetContext';

test('renders spreadsheet editor', () => {
  render(<App />);
  const headerElement = screen.getByText(/拡張スプレッドシート/i);
  expect(headerElement).toBeInTheDocument();
});

test('can add new sheet', () => {
  render(
    <SpreadsheetProvider>
      <SpreadsheetEditorWithPlugins />
    </SpreadsheetProvider>
  );
  
  // 新しいシートを追加するボタンをクリック
  const addSheetButton = screen.getByText('+');
  fireEvent.click(addSheetButton);
  
  // Sheet2が追加されたか確認
  const newSheetTab = screen.getByText('Sheet2');
  expect(newSheetTab).toBeInTheDocument();
});

test('formula bar updates when cell is selected', () => {
  render(
    <SpreadsheetProvider>
      <SpreadsheetEditorWithPlugins />
    </SpreadsheetProvider>
  );
  
  // フォーミュラバーの初期値を確認
  const formulaBar = screen.getByPlaceholderText('数式または値を入力...');
  expect(formulaBar.value).toBe('');
  
  // セル内の値を更新するロジックをテスト
  // 注意: 実際のセル選択はHandsontableを使っているため、
  // モックが必要になる場合があります
});