import React from 'react';
import { createRoot } from 'react-dom/client';
import CellCommentPortal from '../../../components/features/CellComment';
import './styles.css';

const commentsPlugin = {
  name: 'コメント機能',
  version: '1.0.0',
  author: 'Your Name',
  
  initialize(registry) {
    console.log('Comments plugin initialized');
    this.registry = registry;
    this.comments = {};
    this.activeComment = null;
    this.commentRoot = null;
    
    // コメント用のコンテナを作成
    this.createCommentContainer();
    
    // イベントリスナーのセットアップ
    this.setupEventListeners();
  },
  
  cleanup() {
    console.log('Comments plugin cleanup');
    this.removeEventListeners();
    this.removeCommentContainer();
    this.closeActiveComment();
  },
  
  createCommentContainer() {
    // コメント表示用のコンテナがなければ作成
    if (!document.getElementById('comment-container')) {
      const container = document.createElement('div');
      container.id = 'comment-container';
      document.body.appendChild(container);
    }
  },
  
  removeCommentContainer() {
    const container = document.getElementById('comment-container');
    if (container) {
      document.body.removeChild(container);
    }
  },
  
  setupEventListeners() {
    // コメント追加イベント
    this.handleAddComment = (e) => {
      const { row, col } = e.detail || {};
      if (row !== undefined && col !== undefined) {
        this.showAddCommentDialog(row, col);
      }
    };
    
    // セルダブルクリックイベント
    this.handleCellDoubleClick = (e) => {
      const { target } = e;
      const cell = target.closest('td');
      
      if (cell && this.registry.hotInstance) {
        const hot = this.registry.hotInstance;
        const { row, col } = hot.getCoords(cell);
        
        if (row !== null && col !== null) {
          const comment = this.getComment(row, col);
          
          if (comment) {
            this.showComment(row, col);
          } else if (e.altKey) {
            // Alt+ダブルクリックで新規コメント
            this.showAddCommentDialog(row, col);
          }
        }
      }
    };
    
    // コンテキストメニューイベント
    this.handleContextMenu = (e) => {
      // コンテキストメニューのコメント操作は別途実装
    };
    
    // イベントリスナーを登録
    document.addEventListener('add-cell-comment', this.handleAddComment);
    document.addEventListener('cell-doubleclick', this.handleCellDoubleClick);
    
    // Handsontableのコンテナを取得
    const hotContainer = document.querySelector('.handsontable-grid');
    if (hotContainer) {
      hotContainer.addEventListener('dblclick', this.handleCellDoubleClick);
    }
  },
  
  removeEventListeners() {
    document.removeEventListener('add-cell-comment', this.handleAddComment);
    document.removeEventListener('cell-doubleclick', this.handleCellDoubleClick);
    
    const hotContainer = document.querySelector('.handsontable-grid');
    if (hotContainer) {
      hotContainer.removeEventListener('dblclick', this.handleCellDoubleClick);
    }
  },
  
  hooks: {
    // セルプロパティをカスタマイズ
    'cell:properties': (row, col, value) => {
      const comment = this.getComment(row, col);
      
      if (comment) {
        return {
          className: 'cell-has-comment',
          title: comment.text
        };
      }
      
      return null;
    },
    
    // コンテキストメニュー拡張
    'contextmenu:extend': (menuItems, { row, col }) => {
      const hasComment = this.getComment(row, col);
      
      if (hasComment) {
        menuItems.push({
          key: 'comment_edit',
          name: 'コメントを編集',
          callback: () => this.showComment(row, col)
        });
        
        menuItems.push({
          key: 'comment_delete',
          name: 'コメントを削除',
          callback: () => this.removeComment(row, col)
        });
      } else {
        menuItems.push({
          key: 'comment_add',
          name: 'コメントを追加',
          callback: () => this.showAddCommentDialog(row, col)
        });
      }
      
      return menuItems;
    }
  },
  
  // コメントを追加
  addComment(row, col, text) {
    if (text.trim() === '') return null;
    
    const key = `${row},${col}`;
    const now = new Date().toISOString();
    
    this.comments[key] = {
      text,
      createdAt: now,
      updatedAt: now
    };
    
    // グリッドを再描画
    if (this.registry.hotInstance) {
      this.registry.hotInstance.render();
    }
    
    return key;
  },
  
  // コメントを更新
  updateComment(row, col, text) {
    const key = `${row},${col}`;
    const comment = this.comments[key];
    
    if (!comment) return false;
    
    comment.text = text;
    comment.updatedAt = new Date().toISOString();
    
    // グリッドを再描画
    if (this.registry.hotInstance) {
      this.registry.hotInstance.render();
    }
    
    return true;
  },
  
  // コメントを削除
  removeComment(row, col) {
    const key = `${row},${col}`;
    
    if (!this.comments[key]) return false;
    
    delete this.comments[key];
    
    // グリッドを再描画
    if (this.registry.hotInstance) {
      this.registry.hotInstance.render();
    }
    
    // コメントが表示されていれば閉じる
    this.closeActiveComment();
    
    return true;
  },
  
  // コメントを取得
  getComment(row, col) {
    const key = `${row},${col}`;
    return this.comments[key];
  },
  
  // コメントを表示
  showComment(row, col) {
    const comment = this.getComment(row, col);
    if (!comment) return;
    
    // 現在表示中のコメントを閉じる
    this.closeActiveComment();
    
    // セル位置を取得
    const position = this.getCellPosition(row, col);
    if (!position) return;
    
    // コメントコンポーネントをレンダリング
    this.renderComment(row, col, comment, position);
  },
  
  // コメント追加ダイアログ
  showAddCommentDialog(row, col) {
    // 現在のコメントを閉じる
    this.closeActiveComment();
    
    // 空のコメントを仮作成
    const emptyComment = {
      text: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // セル位置を取得
    const position = this.getCellPosition(row, col);
    if (!position) return;
    
    // 編集モードでコメントコンポーネントをレンダリング
    this.renderComment(row, col, emptyComment, position, true);
  },
  
  // コメントをレンダリング
  renderComment(row, col, comment, position, isNew = false) {
    const commentContainer = document.getElementById('comment-container');
    
    if (!commentContainer) {
      console.error('コメントコンテナが見つかりません');
      return;
    }
    
    // コメントルートを作成
    if (!this.commentRoot) {
      this.commentRoot = createRoot(commentContainer);
    }
    
    // コメントの更新ハンドラ
    const handleUpdate = (text) => {
      if (isNew) {
        if (text.trim()) {
          this.addComment(row, col, text);
        }
      } else {
        this.updateComment(row, col, text);
      }
    };
    
    // コメントの削除ハンドラ
    const handleDelete = () => {
      this.removeComment(row, col);
      this.closeActiveComment();
    };
    
    // コメントを閉じるハンドラ
    const handleClose = () => {
      this.closeActiveComment();
    };
    
    // アクティブコメント情報を保存
    this.activeComment = { row, col };
    
    // コメントコンポーネントをレンダリング
    this.commentRoot.render(
      <CellCommentPortal
        comment={comment}
        position={position}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onClose={handleClose}
      />
    );
  },
  
  // 表示中のコメントを閉じる
  closeActiveComment() {
    if (this.commentRoot) {
      // 空のコンテンツをレンダリングして、コメントを削除
      this.commentRoot.render(null);
      
      this.activeComment = null;
    }
  },
  
  // セルの位置を取得
  getCellPosition(row, col) {
    const hot = this.registry.hotInstance;
    if (!hot) return null;
    
    const td = hot.getCell(row, col);
    if (!td) return null;
    
    const rect = td.getBoundingClientRect();
    
    return {
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX
    };
  }
};

export default commentsPlugin;