// src/plugins/core/conditional-format/index.js
import ConditionalFormatDialog from './ConditionalFormatDialog';
import RulesManagerDialog from './RulesManagerDialog';
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
    this.rulesManagerDialog = new RulesManagerDialog(this);
    
    // イベントリスナーのセットアップ
    this.setupEventListeners();
  },
  
  cleanup() {
    console.log('Conditional Format plugin cleanup');
    this.removeEventListeners();
  },
  
  setupEventListeners() {
    // 条件付き書式ダイアログ表示イベント
    this.handleShowDialog = () => {
      if (!this.registry.hotInstance) {
        console.warn('Handsontableインスタンスが見つかりません');
        return;
      }
      
      // 選択範囲を取得
      const selectedRanges = this.registry.hotInstance.getSelected();
      if (!selectedRanges || selectedRanges.length === 0) {
        alert('条件付き書式を適用する範囲を選択してください');
        return;
      }
      
      // 選択範囲の座標を解析
      const [startRow, startCol, endRow, endCol] = selectedRanges[0];
      const range = {
        startRow: Math.min(startRow, endRow),
        startCol: Math.min(startCol, endCol),
        endRow: Math.max(startRow, endRow),
        endCol: Math.max(startCol, endCol)
      };
      
      this.formatDialog.show(range);
    };
    
    // 書式リスト表示イベント
    this.handleShowRules = () => {
      this.rulesManagerDialog.show();
    };
    
    // イベントリスナーを登録
    document.addEventListener('show-conditional-format-dialog', this.handleShowDialog);
    document.addEventListener('show-conditional-format-rules', this.handleShowRules);
  },
  
  removeEventListeners() {
    // イベントリスナーを削除
    document.removeEventListener('show-conditional-format-dialog', this.handleShowDialog);
    document.removeEventListener('show-conditional-format-rules', this.handleShowRules);
  },
  
  hooks: {
    // メニュー拡張
    'menu:extend': (menuConfig) => {
      // 書式メニューに条件付き書式オプションを追加
      const formatMenuIndex = menuConfig.items.findIndex(item => item.id === 'format' || item.id === '書式');
      
      const conditionalFormatItems = [
        { 
          id: 'conditional-format', 
          label: '条件付き書式', 
          action: () => {
            document.dispatchEvent(new CustomEvent('show-conditional-format-dialog'));
          }
        },
        {
          id: 'manage-conditional-formats',
          label: '条件付き書式の管理',
          action: () => {
            document.dispatchEvent(new CustomEvent('show-conditional-format-rules'));
          }
        }
      ];
      
      if (formatMenuIndex >= 0) {
        // 既存のサブメニューに追加
        const submenu = menuConfig.items[formatMenuIndex].submenu || menuConfig.items[formatMenuIndex].items || [];
        
        // 既にある条件付き書式メニューを探す
        const cfIndex = submenu.findIndex(item => item.id === 'conditional-format');
        
        if (cfIndex >= 0) {
          // 既存のメニューを更新
          submenu[cfIndex] = conditionalFormatItems[0];
          
          // 管理メニューがなければ追加
          if (!submenu.some(item => item.id === 'manage-conditional-formats')) {
            submenu.splice(cfIndex + 1, 0, conditionalFormatItems[1]);
          }
        } else {
          // セパレータを追加してから条件付き書式メニューを追加
          submenu.push({ type: 'separator' });
          submenu.push(...conditionalFormatItems);
        }
        
        // 更新したサブメニューを設定
        if (menuConfig.items[formatMenuIndex].submenu) {
          menuConfig.items[formatMenuIndex].submenu = submenu;
        } else {
          menuConfig.items[formatMenuIndex].items = submenu;
        }
      } else {
        // 書式メニューがなければ新規作成
        menuConfig.items.push({
          id: 'format',
          label: '書式',
          submenu: [
            ...conditionalFormatItems
          ]
        });
      }
      
      return menuConfig;
    },
    
    // ツールバー拡張
    'toolbar:extend': (toolbarConfig) => {
      // 条件付き書式ボタンを追加
      toolbarConfig.items.push({
        id: 'conditional-format',
        tooltip: '条件付き書式',
        icon: '🎨',
        action: () => {
          document.dispatchEvent(new CustomEvent('show-conditional-format-dialog'));
        }
      });
      
      return toolbarConfig;
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
        // 各ルールを評価して適用
        applicableRules.forEach(rule => {
          if (this.evaluateRule(rule, cellData, rowIndex, colIndex)) {
            // スタイルを適用
            this.applyRuleStyle(rule.style, cellElement);
          }
        });
      }
      
      return false; // 標準レンダリングを続行
    }
  },
  
  // ルールを評価
  evaluateRule(rule, value, cellRow, cellCol) {
    if (!rule || !rule.condition) return false;
    
    // nullやundefinedの場合は空文字列として扱う
    const cellValue = value === null || value === undefined ? '' : value;
    
    switch (rule.condition.type) {
      case 'greaterThan':
        return Number(cellValue) > Number(rule.condition.value);
        
      case 'lessThan':
        return Number(cellValue) < Number(rule.condition.value);
        
      case 'equal':
        return String(cellValue) === String(rule.condition.value);
        
      case 'notEqual':
        return String(cellValue) !== String(rule.condition.value);
        
      case 'between':
        const numValue = Number(cellValue);
        const min = Number(rule.condition.min);
        const max = Number(rule.condition.max);
        return numValue >= min && numValue <= max;
        
      case 'notBetween':
        const num = Number(cellValue);
        const minVal = Number(rule.condition.min);
        const maxVal = Number(rule.condition.max);
        return num < minVal || num > maxVal;
        
      case 'textContains':
        return String(cellValue).includes(rule.condition.text);
        
      case 'textNotContains':
        return !String(cellValue).includes(rule.condition.text);
        
      case 'textStartsWith':
        return String(cellValue).startsWith(rule.condition.text);
        
      case 'textEndsWith':
        return String(cellValue).endsWith(rule.condition.text);
        
      case 'custom':
        try {
          // 安全な評価ではないが、デモ用途で提供
          return new Function('value', `return ${rule.condition.formula}`)(cellValue);
        } catch (e) {
          console.error('条件式の評価エラー:', e);
          return false;
        }
        
      case 'duplicate':
        // 重複値チェックは別途処理が必要
        if (this.registry.hotInstance) {
          const data = this.registry.hotInstance.getData();
          const values = [];
          
          // 範囲内の値を収集
          for (let r = rule.range.startRow; r <= rule.range.endRow; r++) {
            for (let c = rule.range.startCol; c <= rule.range.endCol; c++) {
              if (r !== cellRow || c !== cellCol) { // 自分自身を除く
                const val = data[r] && data[r][c];
                if (val !== null && val !== undefined) {
                  values.push(String(val));
                }
              }
            }
          }
          
          // 値が範囲内に存在するか確認
          return values.includes(String(cellValue));
        }
        return false;
        
      case 'unique':
        // 一意の値チェックは別途処理が必要
        if (this.registry.hotInstance) {
          const data = this.registry.hotInstance.getData();
          const values = [];
          
          // 範囲内の値を収集
          for (let r = rule.range.startRow; r <= rule.range.endRow; r++) {
            for (let c = rule.range.startCol; c <= rule.range.endCol; c++) {
              if (r !== cellRow || c !== cellCol) { // 自分自身を除く
                const val = data[r] && data[r][c];
                if (val !== null && val !== undefined) {
                  values.push(String(val));
                }
              }
            }
          }
          
          // 値が範囲内に存在しないか確認
          return !values.includes(String(cellValue));
        }
        return true;
        
      default:
        return false;
    }
  },
  
  // スタイルを適用
  applyRuleStyle(style, element) {
    if (!style || !element) return;
    
    // 背景色
    if (style.backgroundColor) {
      element.style.backgroundColor = style.backgroundColor;
    }
    
    // 文字色
    if (style.color) {
      element.style.color = style.color;
    }
    
    // フォントスタイル
    if (style.fontStyle) {
      element.style.fontStyle = style.fontStyle;
    }
    
    // フォント太さ
    if (style.fontWeight) {
      element.style.fontWeight = style.fontWeight;
    }
    
    // 下線
    if (style.textDecoration) {
      element.style.textDecoration = style.textDecoration;
    }
    
    // テキスト配置
    if (style.textAlign) {
      element.style.textAlign = style.textAlign;
    }
    
    // ボーダー
    if (style.border) {
      element.style.border = style.border;
    }
    
    // カスタムクラス
    if (style.className) {
      element.classList.add(...style.className.split(' '));
    }
  },
  
  // 新しいルールを追加
  addRule(range, condition, style) {
    if (!range || !condition) {
      console.warn('有効な範囲と条件が必要です');
      return null;
    }
    
    const rule = {
      id: `rule-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      range,
      condition,
      style,
      createdAt: new Date().toISOString()
    };
    
    this.rules.push(rule);
    
    // グリッドを再描画
    if (this.registry.hotInstance) {
      this.registry.hotInstance.render();
    }
    
    console.log('条件付き書式ルールを追加しました:', rule);
    return rule.id;
  },
  
  // ルールを更新
  updateRule(ruleId, updates) {
    if (!ruleId) return false;
    
    const ruleIndex = this.rules.findIndex(r => r.id === ruleId);
    if (ruleIndex === -1) {
      console.warn(`ルールID ${ruleId} が見つかりません`);
      return false;
    }
    
    // ルールを更新
    this.rules[ruleIndex] = {
      ...this.rules[ruleIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    // グリッドを再描画
    if (this.registry.hotInstance) {
      this.registry.hotInstance.render();
    }
    
    console.log('条件付き書式ルールを更新しました:', this.rules[ruleIndex]);
    return true;
  },
  
  // ルールを削除
  deleteRule(ruleId) {
    if (!ruleId) return false;
    
    const initialLength = this.rules.length;
    this.rules = this.rules.filter(rule => rule.id !== ruleId);
    
    // ルールが削除されたかチェック
    if (this.rules.length < initialLength) {
      // グリッドを再描画
      if (this.registry.hotInstance) {
        this.registry.hotInstance.render();
      }
      
      console.log(`条件付き書式ルール ${ruleId} を削除しました`);
      return true;
    }
    
    console.warn(`ルールID ${ruleId} が見つからないため削除できませんでした`);
    return false;
  },
  
  // すべてのルールをクリア
  clearAllRules() {
    if (this.rules.length === 0) return false;
    
    this.rules = [];
    
    // グリッドを再描画
    if (this.registry.hotInstance) {
      this.registry.hotInstance.render();
    }
    
    console.log('すべての条件付き書式ルールを削除しました');
    return true;
  },
  
  // ルールのエクスポート
  exportRules() {
    if (this.rules.length === 0) {
      return { rules: [] };
    }
    
    return {
      rules: this.rules,
      exportedAt: new Date().toISOString()
    };
  },
  
  // ルールのインポート
  importRules(data) {
    if (!data || !Array.isArray(data.rules)) {
      console.warn('有効なルールデータではありません');
      return false;
    }
    
    // ルールを追加（既存のルールは残す）
    this.rules = [...this.rules, ...data.rules];
    
    // グリッドを再描画
    if (this.registry.hotInstance) {
      this.registry.hotInstance.render();
    }
    
    console.log(`${data.rules.length}個の条件付き書式ルールをインポートしました`);
    return true;
  },
  
  // セル参照を取得 (A1形式)
  getCellReference(row, col) {
    // 列のアルファベット部分を計算
    let colStr = '';
    let tempCol = col;
    
    do {
      const remainder = tempCol % 26;
      colStr = String.fromCharCode(65 + remainder) + colStr;
      tempCol = Math.floor(tempCol / 26) - 1;
    } while (tempCol >= 0);
    
    // 行番号は1から開始
    return `${colStr}${row + 1}`;
  }
};

export default conditionalFormatPlugin;