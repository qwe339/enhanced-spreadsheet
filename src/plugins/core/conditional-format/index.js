import ConditionalFormatDialog from './ConditionalFormatDialog';
import './styles.css';

const conditionalFormatPlugin = {
  name: '条件付き書式',
  version: '1.0.0',
  author: 'Your Name',
  
  initialize(registry) {
    console.log('Conditional Format plugin initialized');
    this.registry = registry;
    this.rules = [];
    
    // コンポーネントを初期化
    this.formatDialog = new ConditionalFormatDialog(this);
  },
  
  cleanup() {
    console.log('Conditional Format plugin cleanup');
  },
  
  hooks: {
    // メニュー拡張
    'menu:extend': (menuConfig) => {
      // 書式メニューに条件付き書式オプションを追加
      const formatMenu = menuConfig.items.find(item => item.id === '書式');
      if (formatMenu && formatMenu.submenu) {
        formatMenu.submenu.push({
          id: 'conditional-format',
          label: '条件付き書式',
          action: () => {
            document.dispatchEvent(new CustomEvent('show-conditional-format-dialog'));
          }
        });
      }
      return menuConfig;
    },
    
    // セルレンダリングをカスタマイズ
    'cell:render': (cellData, cellElement, rowIndex, colIndex) => {
      // このセルに適用される条件付き書式ルールを検索
      const applicableRules = this.rules.filter(rule => {
        return rowIndex >= rule.range.startRow && 
               rowIndex <= rule.range.endRow &&
               colIndex >= rule.range.startCol && 
               colIndex <= rule.range.endCol;
      });
      
      if (applicableRules.length > 0) {
        // 各ルールをチェックして適用
        applicableRules.forEach(rule => {
          if (this.evaluateRule(rule, cellData)) {
            // スタイルを適用
            Object.entries(rule.style).forEach(([prop, value]) => {
              cellElement.style[prop] = value;
            });
          }
        });
      }
      
      return false; // 標準レンダリングを続行
    }
  },
  
  // ルールを評価
  evaluateRule(rule, value) {
    if (!rule.condition) return false;
    
    switch (rule.condition.type) {
      case 'greaterThan':
        return Number(value) > Number(rule.condition.value);
      case 'lessThan':
        return Number(value) < Number(rule.condition.value);
      case 'equal':
        return value == rule.condition.value;
      case 'textContains':
        return String(value).includes(rule.condition.value);
      case 'custom':
        try {
          // 安全ではありませんが、デモのためのサンプル
          return new Function('value', `return ${rule.condition.formula}`)(value);
        } catch (e) {
          console.error('Error evaluating custom formula:', e);
          return false;
        }
      default:
        return false;
    }
  },
  
  // 新しいルールを追加
  addRule(range, condition, style) {
    const rule = {
      id: `rule-${Date.now()}`,
      range,
      condition,
      style
    };
    
    this.rules.push(rule);
    return rule.id;
  },
  
  // ルールを更新
  updateRule(ruleId, updates) {
    const index = this.rules.findIndex(r => r.id === ruleId);
    if (index >= 0) {
      this.rules[index] = {
        ...this.rules[index],
        ...updates
      };
      return true;
    }
    return false;
  },
  
  // ルールを削除
  deleteRule(ruleId) {
    const index = this.rules.findIndex(r => r.id === ruleId);
    if (index >= 0) {
      this.rules.splice(index, 1);
      return true;
    }
    return false;
  }
};

export default conditionalFormatPlugin;