import React from 'react';
import SpreadsheetEditor from './SpreadsheetEditor';
import withPlugins from './withPlugins';

// オリジナルのSpreadsheetEditorにプラグインを接続
const SpreadsheetEditorWithPlugins = withPlugins(SpreadsheetEditor);

export default SpreadsheetEditorWithPlugins;