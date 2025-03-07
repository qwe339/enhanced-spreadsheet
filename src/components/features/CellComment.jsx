import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import '../../styles/CellComment.css';

const CellComment = ({ comment, position, onUpdate, onDelete, onClose }) => {
  const [text, setText] = useState(comment.text || '');
  const [isEditing, setIsEditing] = useState(false);
  const commentRef = useRef(null);
  const textareaRef = useRef(null);
  
  // コンポーネントがマウントされたら、テキストエリアにフォーカス
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);
  
  // クリック外判定
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (commentRef.current && !commentRef.current.contains(event.target)) {
        if (isEditing) {
          handleSave();
        } else {
          onClose();
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing, onClose, text]);
  
  // Escキーでの閉じる
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isEditing) {
          setIsEditing(false);
          setText(comment.text);
        } else {
          onClose();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [comment.text, isEditing, onClose]);
  
  // 保存処理
  const handleSave = () => {
    if (text.trim() !== comment.text) {
      onUpdate(text);
    }
    setIsEditing(false);
  };
  
  // 削除処理
  const handleDelete = () => {
    if (window.confirm('このコメントを削除しますか？')) {
      onDelete();
    }
  };
  
  // 日付表示
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (error) {
      return '';
    }
  };
  
  return (
    <div 
      className="cell-comment" 
      ref={commentRef} 
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`
      }}
    >
      <div className="comment-header">
        <span className="comment-title">コメント</span>
        <div className="comment-buttons">
          {!isEditing && (
            <button 
              className="comment-button edit-button" 
              onClick={() => setIsEditing(true)}
              title="編集"
            >
              ✏️
            </button>
          )}
          <button 
            className="comment-button delete-button" 
            onClick={handleDelete}
            title="削除"
          >
            🗑️
          </button>
          <button 
            className="comment-button close-button" 
            onClick={onClose}
            title="閉じる"
          >
            ✖️
          </button>
        </div>
      </div>
      
      <div className="comment-body">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            className="comment-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={handleSave}
          />
        ) : (
          <div className="comment-text">{text}</div>
        )}
      </div>
      
      <div className="comment-footer">
        {comment.updatedAt && (
          <span className="comment-date">
            更新: {formatDate(comment.updatedAt)}
          </span>
        )}
      </div>
    </div>
  );
};

// ポータルを使ってDOMの末尾にレンダリング
const CellCommentPortal = (props) => {
  const portalContainer = document.getElementById('comment-container') || document.body;
  return ReactDOM.createPortal(<CellComment {...props} />, portalContainer);
};

export default CellCommentPortal;