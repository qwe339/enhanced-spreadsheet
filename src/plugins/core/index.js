import DataValidationDialog from '../../components/modals/DataValidationDialog';

const dataValidationPlugin = {
  name: 'データ検証',
  version: '1.0.0',
  author: 'Your Name',
  
  initialize(registry) {
    console.log('Data Validation plugin initialized');
    this.registry = registry;
    this.validations = [];
    this.dialog = null;
    
    // イベントリスナーのセットアップ
    this.setupEventListeners();
  },
  
  cleanup() {
    console.log('Data Validation plugin cleanup');
    this.removeEventListeners();
  },
  
  setupEventListeners() {
    // データ検証ダイアログ表示イベント
    this.handleShowDialog = () => {
      this.showValidationDialog();
    };
    
    document.addEventListener('show-data-validation-dialog', this.handleShowDialog);
  },
  
  removeEventListeners() {
    document.removeEventListener('show-data-validation-dialog', this.handleShowDialog);
  },
  
  hooks: {
    // メニュー拡張
    'menu:extend': (menuConfig) => {
      // データメニューにデータ検証オプションを追加
      const dataMenu = menuConfig.items.find(item => item.id === 'data');
      if (dataMenu && dataMenu.items) {
        const validationMenuIndex = dataMenu.items.findIndex(item => item.id === 'dataValidation');
        
        if (validationMenuIndex >= 0) {
          dataMenu.items[validationMenuIndex].action = () => {
            document.dispatchEvent(new CustomEvent('show-data-validation-dialog'));
          };
        } else {
          dataMenu.items.push({
            id: 'dataValidation',
            label: 'データ検証',
            action: () => {
              document.dispatchEvent(new CustomEvent('show-data-validation-dialog'));
            }
          });
        }
      } else {
        // データメニューがない場合は新しく追加
        menuConfig.items.push({
          id: 'data',
          label: 'データ',
          items: [
            {
              id: 'dataValidation',
              label: 'データ検証',
              action: () => {
                document.dispatchEvent(new CustomEvent('show-data-validation-dialog'));
              }
            }
          ]
        });
      }
      return menuConfig;
    },
    
    // データ変更前の検証
    'data:beforeChange': (changes, source) => {
      if (!changes || source === 'loadData') return changes;
      
      // 変更をフィルタリング
      return changes.filter(([row, col, oldValue, newValue]) => {
        // 該当セルの検証ルールを検索
        const validation = this.findValidationForCell(row, col);
        
        if (!validation) return true; // 検証なし
        
        // 検証ルールに基づいて値をチェック
        const validationResult = this.validateValue(validation.rule, newValue);
        if (!validationResult.isValid) {
          const errorStyle = validation.rule.errorStyle || 'stop';
          
          // エラーメッセージがあれば表示
          if (validation.rule.errorMessage && validation.rule.errorMessage.trim()) {
            const message = validation.rule.errorMessage;
            
            switch (errorStyle) {
              case 'stop':
                alert(message);
                return false; // 変更を拒否
              case 'warning':
                if (!confirm(`${message}\n\n続行しますか？`)) {
                  return false; // ユーザーがキャンセルした場合
                }
                break;
              case 'info':
                alert(message);
                break;
              default:
                break;
            }
          } else {
            // デフォルトメッセージ
            if (errorStyle === 'stop') {
              alert('入力値が無効です');
              return false;
            } else if (errorStyle === 'warning') {
              if (!confirm('入力値が無効です。続行しますか？')) {
                return false;
              }
            }
          }
        }
        
        return true;
      });
    },
    
    // セルレンダリングのカスタマイズ
    'cell:properties': (row, col, value) => {
      // セルの検証ルールを検索
      const validation = this.findValidationForCell(row, col);
      
      if (validation && validation.rule.type === 'list') {
        // ドロップダウンリストを表示
        return {
          type: 'dropdown',
          source: validation.rule.options || []
        };
      }
      
      return null;
    }
  },
  
  // 検証ダイアログを表示
  showValidationDialog() {
    const hot = this.registry.hotInstance;
    if (!hot) {
      console.warn('Handsontableインスタンスが見つかりません');
      return;
    }
    
    // 選択範囲を取得
    const selected = hot.getSelected();
    if (!selected || selected.length === 0) {
      alert('データ検証を適用するセルを選択してください');
      return;
    }
    
    // 最初の選択範囲を使用
    const [startRow, startCol, endRow, endCol] = selected[0];
    const range = {
      startRow: Math.min(startRow, endRow),
      startCol: Math.min(startCol, endCol),
      endRow: Math.max(startRow, endRow),
      endCol: Math.max(startCol, endCol)
    };
    
    // 既存の検証ルールを確認
    const existingValidation = this.findValidationForCell(range.startRow, range.startCol);
    
    // モーダルを表示するためにReactコンポーネントを作成
    this.renderValidationDialog(range, existingValidation);
  },
  
  // 検証ダイアログをレンダリング
  renderValidationDialog(range, existingValidation = null) {
    // ダイアログのルート要素を作成
    const dialogRoot = document.createElement('div');
    dialogRoot.id = 'validation-dialog-root';
    document.body.appendChild(dialogRoot);
    
    // ダイアログを閉じる関数
    const closeDialog = () => {
      if (dialogRoot.parentNode) {
        document.body.removeChild(dialogRoot);
      }
    };
    
    // 適用ボタンのハンドラ
    const handleApply = (rule) => {
      this.addValidation(range, rule);
      closeDialog();
    };
    
    // ReactDOM.renderの代わりにReactDOMのcreateRootを使用する
    import('react-dom/client').then(({ createRoot }) => {
      import('react').then((React) => {
        import('../../components/modals/DataValidationDialog').then(({ default: DataValidationDialog }) => {
          const root = createRoot(dialogRoot);
          root.render(
            React.createElement(DataValidationDialog, {
              onClose: closeDialog,
              onApply: handleApply,
              selectedRange: range,
              initialRule: existingValidation ? existingValidation.rule : null
            })
          );
        }).catch(error => {
          console.error('DataValidationDialogのロードに失敗:', error);
          closeDialog();
        });
      }).catch(error => {
        console.error('Reactのロードに失敗:', error);
        closeDialog();
      });
    }).catch(error => {
      console.error('ReactDOMのロードに失敗:', error);
      closeDialog();
    });
  },
  
  // 検証ルールを追加
  addValidation(range, rule) {
    if (!range || !rule) return null;
    
    const validation = {
      id: `validation-${Date.now()}`,
      range,
      rule
    };
    
    // 重複するルールを削除
    this.validations = this.validations.filter(v => 
      !(this.rangesOverlap(v.range, range))
    );
    
    this.validations.push(validation);
    
    console.log('検証ルールを追加:', validation);
    
    // グリッドを再描画
    const hot = this.registry.hotInstance;
    if (hot) {
      hot.render();
    }
    
    return validation.id;
  },
  
  // 特定のセルに適用される検証ルールを検索
  findValidationForCell(row, col) {
    return this.validations.find(validation => {
      const { range } = validation;
      return row >= range.startRow && row <= range.endRow &&
             col >= range.startCol && col <= range.endCol;
    });
  },
  
  // 値を検証する
  validateValue(rule, value) {
    if (!rule || rule.type === 'any') {
      return { isValid: true };
    }
    
    // 空の値は常に有効とする（オプション）
    if (value === null || value === undefined || value === '') {
      return { isValid: true };
    }
    
    switch (rule.type) {
      case 'number':
        // 数値チェック
        if (isNaN(Number(value))) {
          return { 
            isValid: false, 
            message: '数値を入力してください' 
          };
        }
        
        const numValue = Number(value);
        
        // 最小値チェック
        if (rule.min !== undefined && numValue < rule.min) {
          return { 
            isValid: false, 
            message: `${rule.min}以上の値を入力してください` 
          };
        }
        
        // 最大値チェック
        if (rule.max !== undefined && numValue > rule.max) {
          return { 
            isValid: false, 
            message: `${rule.max}以下の値を入力してください` 
          };
        }
        
        return { isValid: true };
      
      case 'list':
        // リスト値チェック
        if (!rule.options || !Array.isArray(rule.options)) {
          return { isValid: true };
        }
        
        return { 
          isValid: rule.options.includes(value), 
          message: 'リストから値を選択してください' 
        };
      
      case 'date':
        // 日付チェック
        if (isNaN(Date.parse(value))) {
          return { 
            isValid: false, 
            message: '有効な日付を入力してください' 
          };
        }
        
        const dateValue = new Date(value);
        
        // 最小日付チェック
        if (rule.min && new Date(rule.min) > dateValue) {
          return { 
            isValid: false, 
            message: `${rule.min}以降の日付を入力してください` 
          };
        }
        
        // 最大日付チェック
        if (rule.max && new Date(rule.max) < dateValue) {
          return { 
            isValid: false, 
            message: `${rule.max}以前の日付を入力してください` 
          };
        }
        
        return { isValid: true };
      
      case 'textLength':
        // テキスト長チェック
        const textLength = String(value).length;
        
        // 最小長チェック
        if (rule.min !== undefined && textLength < rule.min) {
          return { 
            isValid: false, 
            message: `${rule.min}文字以上入力してください` 
          };
        }
        
        // 最大長チェック
        if (rule.max !== undefined && textLength > rule.max) {
          return { 
            isValid: false, 
            message: `${rule.max}文字以下で入力してください` 
          };
        }
        
        return { isValid: true };
      
      case 'custom':
        // カスタム式チェック
        if (!rule.expression) {
          return { isValid: true };
        }
        
        try {
          // 安全ではないが、デモ用に実装
          const result = new Function('value', `return ${rule.expression}`)(value);
          return { 
            isValid: Boolean(result), 
            message: rule.errorMessage || '入力値が無効です' 
          };
        } catch (error) {
          console.error('カスタム検証式のエラー:', error);
          return { 
            isValid: false, 
            message: '検証中にエラーが発生しました' 
          };
        }
      
      default:
        return { isValid: true };
    }
  },
  
  // 範囲が重複しているかチェック
  rangesOverlap(range1, range2) {
    return !(
      range1.endRow < range2.startRow ||
      range1.startRow > range2.endRow ||
      range1.endCol < range2.startCol ||
      range1.startCol > range2.endCol
    );
  }
};

export default dataValidationPlugin;