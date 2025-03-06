const dataValidationPlugin = {
  name: 'データ検証',
  version: '1.0.0',
  author: 'Your Name',
  
  initialize(registry) {
    console.log('Data Validation plugin initialized');
    this.registry = registry;
    this.validations = [];
  },
  
  cleanup() {
    console.log('Data Validation plugin cleanup');
  },
  
  hooks: {
    // メニュー拡張
    'menu:extend': (menuConfig) => {
      // データメニューにデータ検証オプションを追加
      const dataMenu = menuConfig.items.find(item => item.id === 'データ');
      if (dataMenu && dataMenu.submenu) {
        dataMenu.submenu.push({
          id: 'data-validation',
          label: 'データ検証',
          action: () => {
            document.dispatchEvent(new CustomEvent('show-data-validation-dialog'));
          }
        });
      } else {
        // データメニューがない場合は新しく追加
        menuConfig.items.push({
          id: 'データ',
          label: 'データ',
          submenu: [
            {
              id: 'data-validation',
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
      if (source === 'loadData') return changes;
      
      // 変更をフィルタリング
      return changes.filter(([row, col, oldValue, newValue]) => {
        // 該当セルの検証ルールを検索
        const validation = this.validations.find(v => 
          row >= v.range.startRow && row <= v.range.endRow &&
          col >= v.range.startCol && col <= v.range.endCol
        );
        
        if (!validation) return true; // 検証なし
        
        // 検証ルールに基づいて値をチェック
        const isValid = this.validateValue(validation, newValue);
        if (!isValid) {
          console.warn(`Invalid data: ${newValue} at [${row}, ${col}]`);
          // ここで警告表示などの処理を行う
          alert(`入力値が無効です: ${newValue}`);
        }
        
        return isValid;
      });
    }
  },
  
  // 値を検証
  validateValue(validation, value) {
    if (!validation.rule) return true;
    
    switch (validation.rule.type) {
      case 'number':
        return !isNaN(Number(value));
      case 'integer':
        return Number.isInteger(Number(value));
      case 'list':
        return validation.rule.values.includes(value);
      case 'date':
        return !isNaN(Date.parse(value));
      case 'textLength':
        const len = String(value).length;
        return len >= validation.rule.min && len <= validation.rule.max;
      default:
        return true;
    }
  },
  
  // 検証ルールを追加
  addValidation(range, rule) {
    const validation = {
      id: `validation-${Date.now()}`,
      range,
      rule
    };
    
    this.validations.push(validation);
    return validation.id;
  }
};

export default dataValidationPlugin;