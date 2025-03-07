// src/plugins/core/conditional-format/RulesManagerDialog.js
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

class RulesManagerDialog {
  constructor(plugin) {
    this.plugin = plugin;
    this.dialog = null;
  }
  
  show() {
    this.removeDialog();
    
    // ダイアログのルート要素を作成
    const dialogRoot = document.createElement('div');
    dialogRoot.className = 'cf-dialog-overlay';
    document.body.appendChild(dialogRoot);
    
    // Reactコンポーネントをレンダリング
    const DialogContent = () => {
      const [rules, setRules] = useState(this.plugin.rules);
      const [selectedRuleId, setSelectedRuleId] = useState(null);
      
      // ルール一覧の更新
      useEffect(() => {
        setRules([...this.plugin.rules]);
      }, []);
      
      // ルールを削除
      const handleDeleteRule = (ruleId) => {
        if (window.confirm('このルールを削除してもよろしいですか？')) {
          const success = this.plugin.deleteRule(ruleId);
          if (success) {
            setRules(rules.filter(rule => rule.id !== ruleId));
            if (selectedRuleId === ruleId) {
              setSelectedRuleId(null);
            }
          }
        }
      };
      
      // ルールを編集
      const handleEditRule = (ruleId) => {
        // 現在は直接編集をサポートしていないため、
        // 既存のルールを削除して新しく作成するようユーザーに案内
        alert('ルールの編集機能は現在開発中です。\n\n現時点では、このルールを削除して新しいルールを作成してください。');
      };
      
      // すべてのルールを削除
      const handleClearAllRules = () => {
        if (window.confirm('すべての条件付き書式ルールを削除してもよろしいですか？')) {
          const success = this.plugin.clearAllRules();
          if (success) {
            setRules([]);
            setSelectedRuleId(null);
          }
        }
      };
      
      // ダイアログを閉じる
      const handleClose = () => {
        this.removeDialog();
      };
      
      // 条件の説明テキストを取得
      const getConditionDescription = (condition) => {
        if (!condition) return '不明な条件';
        
        switch (condition.type) {
          case 'greaterThan':
            return `> ${condition.value}`;
          case 'lessThan':
            return `< ${condition.value}`;
          case 'equal':
            return `= ${condition.value}`;
          case 'notEqual':
            return `≠ ${condition.value}`;
          case 'between':
            return `${condition.min}～${condition.max}`;
          case 'notBetween':
            return `${condition.min}～${condition.max}の範囲外`;
          case 'textContains':
            return `"${condition.text}"を含む`;
          case 'textNotContains':
            return `"${condition.text}"を含まない`;
          case 'textStartsWith':
            return `"${condition.text}"で始まる`;
          case 'textEndsWith':
            return `"${condition.text}"で終わる`;
          case 'duplicate':
            return '重複する値';
          case 'unique':
            return '一意の値';
          case 'custom':
            return `カスタム: ${condition.formula}`;
          default:
            return condition.type;
        }
      };
      
      // 範囲の文字列表現を取得
      const getRangeText = (range) => {
        if (!range) return '';
        const { startRow, startCol, endRow, endCol } = range;
        return `${this.plugin.getCellReference(startRow, startCol)}:${this.plugin.getCellReference(endRow, endCol)}`;
      };
      
      // 作成日や更新日の表示形式
      const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
          const date = new Date(dateString);
          return date.toLocaleString();
        } catch (e) {
          return dateString;
        }
      };
      
      return (
        <div className="cf-dialog cf-rules-manager">
          <div className="cf-dialog-header">
            <h2>条件付き書式の管理</h2>
            <button className="cf-dialog-close" onClick={handleClose}>×</button>
          </div>
          
          <div className="cf-dialog-body">
            {rules.length === 0 ? (
              <div className="cf-empty-state">
                条件付き書式ルールはまだ設定されていません
              </div>
            ) : (
              <div className="cf-rules-list">
                <table className="cf-rules-table">
                  <thead>
                    <tr>
                      <th>適用範囲</th>
                      <th>条件</th>
                      <th>書式</th>
                      <th>作成日時</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rules.map(rule => (
                      <tr 
                        key={rule.id} 
                        className={selectedRuleId === rule.id ? 'cf-selected-rule' : ''}
                        onClick={() => setSelectedRuleId(rule.id)}
                      >
                        <td>{getRangeText(rule.range)}</td>
                        <td>{getConditionDescription(rule.condition)}</td>
                        <td>
                          <div 
                            className="cf-style-preview"
                            style={{
                              backgroundColor: rule.style.backgroundColor,
                              color: rule.style.color,
                              fontWeight: rule.style.fontWeight,
                              fontStyle: rule.style.fontStyle,
                              textDecoration: rule.style.textDecoration,
                              textAlign: rule.style.textAlign,
                              border: rule.style.border || '1px solid #ddd',
                              padding: '2px 5px'
                            }}
                          >
                            サンプルテキスト
                          </div>
                        </td>
                        <td>{formatDate(rule.createdAt)}</td>
                        <td>
                          <button 
                            className="cf-rule-edit-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditRule(rule.id);
                            }}
                            title="編集"
                          >
                            ✏️
                          </button>
                          <button 
                            className="cf-rule-delete-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRule(rule.id);
                            }}
                            title="削除"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          <div className="cf-dialog-footer">
            {rules.length > 0 && (
              <button 
                className="cf-button cf-button-danger"
                onClick={handleClearAllRules}
              >
                すべて削除
              </button>
            )}
            <div className="cf-spacer"></div>
            <button className="cf-button cf-button-secondary" onClick={handleClose}>閉じる</button>
          </div>
        </div>
      );
    };
    
    const handleOverlayClick = (e) => {
      if (e.target.className === 'cf-dialog-overlay') {
        this.removeDialog();
      }
    };
    
    // クリックイベントを追加
    dialogRoot.addEventListener('click', handleOverlayClick);
    
    // キーボードイベントリスナー
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        this.removeDialog();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    // ダイアログを保存
    this.dialog = {
      root: dialogRoot,
      render: () => {
        try {
          const root = ReactDOM.createRoot(dialogRoot);
          root.render(<DialogContent />);
        } catch (error) {
          console.error('ダイアログレンダリングエラー:', error);
        }
      },
      cleanup: () => {
        dialogRoot.removeEventListener('click', handleOverlayClick);
        document.removeEventListener('keydown', handleKeyDown);
      }
    };
    
    // レンダリング
    this.dialog.render();
  }
  
  removeDialog() {
    if (this.dialog) {
      this.dialog.cleanup();
      if (this.dialog.root && this.dialog.root.parentNode) {
        document.body.removeChild(this.dialog.root);
      }
      this.dialog = null;
    }
  }
}

export default RulesManagerDialog;