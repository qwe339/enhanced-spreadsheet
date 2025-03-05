import React, { createContext, useContext, useReducer } from 'react';

// 初期状態
const initialState = {
  currentSheet: 'sheet1',
  sheets: ['sheet1'],
  sheetData: {
    sheet1: Array(50).fill().map(() => Array(26).fill(''))
  },
  cellStyles: {},
  conditionalFormats: {},
  charts: [],
  comments: {},
  protectedCells: {},
  dataValidations: {},
  selectedCell: null,
  selectionRange: null,
  cellAddress: '',
  formulaValue: '',
  statusMessage: 'Ready',
  selectionStats: { sum: '0', average: '0', count: 0, selection: '' },
  isModified: false,
  currentFilename: '新しいスプレッドシート',
  lastSaved: null,
  hyperformulaInstance: null,
  undoStack: [],
  redoStack: []
};

// アクションタイプ
export const actionTypes = {
  SET_CURRENT_SHEET: 'SET_CURRENT_SHEET',
  ADD_SHEET: 'ADD_SHEET',
  RENAME_SHEET: 'RENAME_SHEET',
  DELETE_SHEET: 'DELETE_SHEET',
  UPDATE_SHEET_DATA: 'UPDATE_SHEET_DATA',
  SET_SELECTED_CELL: 'SET_SELECTED_CELL',
  SET_SELECTION_RANGE: 'SET_SELECTION_RANGE',
  SET_CELL_ADDRESS: 'SET_CELL_ADDRESS',
  SET_FORMULA_VALUE: 'SET_FORMULA_VALUE',
  SET_STATUS_MESSAGE: 'SET_STATUS_MESSAGE',
  UPDATE_SELECTION_STATS: 'UPDATE_SELECTION_STATS',
  UPDATE_CELL_STYLES: 'UPDATE_CELL_STYLES',
  ADD_CONDITIONAL_FORMAT: 'ADD_CONDITIONAL_FORMAT',
  REMOVE_CONDITIONAL_FORMAT: 'REMOVE_CONDITIONAL_FORMAT',
  ADD_CHART: 'ADD_CHART',
  UPDATE_CHART: 'UPDATE_CHART',
  REMOVE_CHART: 'REMOVE_CHART',
  UPDATE_COMMENTS: 'UPDATE_COMMENTS',
  UPDATE_PROTECTED_CELLS: 'UPDATE_PROTECTED_CELLS',
  UPDATE_DATA_VALIDATIONS: 'UPDATE_DATA_VALIDATIONS',
  PUSH_TO_UNDO_STACK: 'PUSH_TO_UNDO_STACK',
  PUSH_TO_REDO_STACK: 'PUSH_TO_REDO_STACK',
  POP_FROM_UNDO_STACK: 'POP_FROM_UNDO_STACK',
  POP_FROM_REDO_STACK: 'POP_FROM_REDO_STACK',
  CLEAR_UNDO_REDO_STACK: 'CLEAR_UNDO_REDO_STACK',
  RESET_SPREADSHEET: 'RESET_SPREADSHEET',
  SET_MODIFIED: 'SET_MODIFIED',
  SET_FILENAME: 'SET_FILENAME',
  SET_LAST_SAVED: 'SET_LAST_SAVED',
  LOAD_SPREADSHEET: 'LOAD_SPREADSHEET',
  SET_HYPERFORMULA_INSTANCE: 'SET_HYPERFORMULA_INSTANCE'
};

// リデューサー
function spreadsheetReducer(state, action) {
  switch (action.type) {
    case actionTypes.SET_CURRENT_SHEET:
      return { ...state, currentSheet: action.payload };
      
    case actionTypes.ADD_SHEET: {
      const newSheetId = action.payload;
      return {
        ...state,
        sheets: [...state.sheets, newSheetId],
        sheetData: {
          ...state.sheetData,
          [newSheetId]: Array(50).fill().map(() => Array(26).fill(''))
        }
      };
    }
    
    case actionTypes.RENAME_SHEET: {
      const { oldSheetId, newSheetId } = action.payload;
      const sheetIndex = state.sheets.indexOf(oldSheetId);
      
      if (sheetIndex === -1) return state;
      
      const newSheets = [...state.sheets];
      newSheets[sheetIndex] = newSheetId;
      
      const newSheetData = { ...state.sheetData };
      newSheetData[newSheetId] = newSheetData[oldSheetId];
      delete newSheetData[oldSheetId];
      
      return {
        ...state,
        sheets: newSheets,
        sheetData: newSheetData,
        currentSheet: state.currentSheet === oldSheetId ? newSheetId : state.currentSheet
      };
    }
    
    case actionTypes.DELETE_SHEET: {
      const sheetToDelete = action.payload;
      const sheetIndex = state.sheets.indexOf(sheetToDelete);
      
      if (sheetIndex === -1 || state.sheets.length <= 1) return state;
      
      const newSheets = state.sheets.filter(id => id !== sheetToDelete);
      const newSheetData = { ...state.sheetData };
      delete newSheetData[sheetToDelete];
      
      return {
        ...state,
        sheets: newSheets,
        sheetData: newSheetData,
        currentSheet: state.currentSheet === sheetToDelete ? newSheets[0] : state.currentSheet
      };
    }
    
    case actionTypes.UPDATE_SHEET_DATA: {
      const { sheetId, data } = action.payload;
      return {
        ...state,
        sheetData: {
          ...state.sheetData,
          [sheetId]: data
        },
        isModified: true
      };
    }
    
    case actionTypes.SET_SELECTED_CELL:
      return { ...state, selectedCell: action.payload };
      
    case actionTypes.SET_SELECTION_RANGE:
      return { ...state, selectionRange: action.payload };
      
    case actionTypes.SET_CELL_ADDRESS:
      return { ...state, cellAddress: action.payload };
      
    case actionTypes.SET_FORMULA_VALUE:
      return { ...state, formulaValue: action.payload };
      
    case actionTypes.SET_STATUS_MESSAGE:
      return { ...state, statusMessage: action.payload };
      
    case actionTypes.UPDATE_SELECTION_STATS:
      return { ...state, selectionStats: action.payload };
      
    case actionTypes.UPDATE_CELL_STYLES: {
      const { sheetId, styles } = action.payload;
      return {
        ...state,
        cellStyles: {
          ...state.cellStyles,
          [sheetId]: styles
        },
        isModified: true
      };
    }
    
    case actionTypes.ADD_CONDITIONAL_FORMAT: {
      const { sheetId, format } = action.payload;
      const currentFormats = state.conditionalFormats[sheetId] || [];
      return {
        ...state,
        conditionalFormats: {
          ...state.conditionalFormats,
          [sheetId]: [...currentFormats, format]
        },
        isModified: true
      };
    }
    
    case actionTypes.REMOVE_CONDITIONAL_FORMAT: {
      const { sheetId, formatId } = action.payload;
      const currentFormats = state.conditionalFormats[sheetId] || [];
      return {
        ...state,
        conditionalFormats: {
          ...state.conditionalFormats,
          [sheetId]: currentFormats.filter(format => format.id !== formatId)
        },
        isModified: true
      };
    }
    
    case actionTypes.ADD_CHART:
      return {
        ...state,
        charts: [...state.charts, action.payload],
        isModified: true
      };
      
    case actionTypes.UPDATE_CHART: {
      const { id, chartData } = action.payload;
      return {
        ...state,
        charts: state.charts.map(chart => 
          chart.id === id ? chartData : chart
        ),
        isModified: true
      };
    }
    
    case actionTypes.REMOVE_CHART:
      return {
        ...state,
        charts: state.charts.filter(chart => chart.id !== action.payload),
        isModified: true
      };
      
    case actionTypes.UPDATE_COMMENTS: {
      const { sheetId, comments } = action.payload;
      return {
        ...state,
        comments: {
          ...state.comments,
          [sheetId]: comments
        },
        isModified: true
      };
    }
    
    case actionTypes.UPDATE_PROTECTED_CELLS: {
      const { sheetId, protectedCells } = action.payload;
      return {
        ...state,
        protectedCells: {
          ...state.protectedCells,
          [sheetId]: protectedCells
        },
        isModified: true
      };
    }
    
    case actionTypes.UPDATE_DATA_VALIDATIONS: {
      const { sheetId, dataValidations } = action.payload;
      return {
        ...state,
        dataValidations: {
          ...state.dataValidations,
          [sheetId]: dataValidations
        },
        isModified: true
      };
    }
    
    case actionTypes.PUSH_TO_UNDO_STACK:
      return {
        ...state,
        undoStack: [...state.undoStack, action.payload]
      };
      
    case actionTypes.PUSH_TO_REDO_STACK:
      return {
        ...state,
        redoStack: [...state.redoStack, action.payload]
      };
      
    case actionTypes.POP_FROM_UNDO_STACK:
      return {
        ...state,
        undoStack: state.undoStack.slice(0, -1)
      };
      
    case actionTypes.POP_FROM_REDO_STACK:
      return {
        ...state,
        redoStack: state.redoStack.slice(0, -1)
      };
      
    case actionTypes.CLEAR_UNDO_REDO_STACK:
      return {
        ...state,
        undoStack: [],
        redoStack: []
      };
      
case actionTypes.RESET_SPREADSHEET:
  console.log('RESET_SPREADSHEET アクションを処理します');
  
  // ペイロードが存在する場合はそれを使用し、そうでなければ初期状態を使用
  const resetState = action.payload || {
    sheets: ['sheet1'],
    sheetData: { 'sheet1': Array(50).fill().map(() => Array(26).fill('')) },
    cellStyles: {},
    conditionalFormats: {},
    charts: [],
    comments: {},
    protectedCells: {},
    dataValidations: {},
    currentSheet: 'sheet1',
    currentFilename: '新しいスプレッドシート',
    lastSaved: null,
    isModified: false
  };
  
  return {
    ...initialState,
    ...resetState,
    hyperformulaInstance: state.hyperformulaInstance, // HyperFormulaインスタンスは保持
    undoStack: [], // 履歴はクリア
    redoStack: []
  };
      
    case actionTypes.SET_MODIFIED:
      return { ...state, isModified: action.payload };
      
    case actionTypes.SET_FILENAME:
      return { ...state, currentFilename: action.payload };
      
    case actionTypes.SET_LAST_SAVED:
      return { ...state, lastSaved: action.payload };
      
    case actionTypes.LOAD_SPREADSHEET:
      return {
        ...state,
        ...action.payload,
        isModified: false
      };
      
    case actionTypes.SET_HYPERFORMULA_INSTANCE:
      return {
        ...state,
        hyperformulaInstance: action.payload
      };
      
    default:
      return state;
  }
}

// コンテキスト
const SpreadsheetContext = createContext();

// プロバイダーコンポーネント
export function SpreadsheetProvider({ children }) {
  const [state, dispatch] = useReducer(spreadsheetReducer, initialState);

  return (
    <SpreadsheetContext.Provider value={{ state, dispatch, actionTypes }}>
      {children}
    </SpreadsheetContext.Provider>
  );
}

// カスタムフック
export function useSpreadsheet() {
  const context = useContext(SpreadsheetContext);
  if (!context) {
    throw new Error('useSpreadsheet must be used within a SpreadsheetProvider');
  }
  return context;
}