'use client';

import { useEffect, useState, useRef } from 'react';
import './CommentSection.css';

export interface Comment {
  id: string;
  userName: string;
  content: string;
  chapterName: string | null;
  parentId: string | null;
  createdAt: string;
  likes: number;
}

interface CommentSectionProps {
  comicName: string;
  chapterName?: string | null;
}

export default function CommentSection({ comicName, chapterName }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userName, setUserName] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  // 从localStorage加载用户名
  useEffect(() => {
    const savedUserName = localStorage.getItem('comment_user_name');
    if (savedUserName) {
      setUserName(savedUserName);
    }
  }, []);

  // 获取评论列表
  const fetchComments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const encodedComicName = encodeURIComponent(comicName);
      let url: string;
      
      if (chapterName) {
        // 章节级别评论
        const encodedChapterName = encodeURIComponent(chapterName);
        url = `/api/comics/${encodedComicName}/${encodedChapterName}/comments`;
      } else {
        // 漫画级别评论
        url = `/api/comics/${encodedComicName}/comments`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('获取评论失败');
      }
      
      const data = await response.json();
      setComments(data.comments || []);
    } catch (err) {
      console.error('Error fetching comments:', err);
      setError(err instanceof Error ? err.message : '获取评论失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [comicName, chapterName]);

  // 发表评论
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userName.trim()) {
      setSubmitError('请输入昵称');
      return;
    }
    
    if (!content.trim()) {
      setSubmitError('请输入评论内容');
      contentTextareaRef.current?.focus();
      return;
    }
    
    setSubmitting(true);
    setSubmitError(null);
    
    try {
      const encodedComicName = encodeURIComponent(comicName);
      let url: string;
      
      if (chapterName) {
        // 章节级别评论
        const encodedChapterName = encodeURIComponent(chapterName);
        url = `/api/comics/${encodedComicName}/${encodedChapterName}/comments`;
      } else {
        // 漫画级别评论
        url = `/api/comics/${encodedComicName}/comments`;
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userName: userName.trim(),
          content: content.trim(),
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '发表评论失败');
      }
      
      // 保存用户名到localStorage
      localStorage.setItem('comment_user_name', userName.trim());
      
      // 清空输入框
      setContent('');
      
      // 重新获取评论列表
      await fetchComments();
    } catch (err) {
      console.error('Error submitting comment:', err);
      setSubmitError(err instanceof Error ? err.message : '发表评论失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 7) {
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } else if (days > 0) {
      return `${days}天前`;
    } else if (hours > 0) {
      return `${hours}小时前`;
    } else if (minutes > 0) {
      return `${minutes}分钟前`;
    } else {
      return '刚刚';
    }
  };

  return (
    <div className="comment-section">
      <h3 className="comment-section-title">
        {chapterName ? `章节评论 (${chapterName})` : '漫画评论'}
      </h3>
      
      {/* 评论输入框 */}
      <form onSubmit={handleSubmit} className="comment-form">
        <div className="comment-form-row">
          <input
            type="text"
            placeholder="昵称"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="comment-input comment-input-name"
            disabled={submitting}
          />
        </div>
        <div className="comment-form-row">
          <textarea
            ref={contentTextareaRef}
            placeholder="写下你的评论..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="comment-input comment-input-content"
            rows={4}
            disabled={submitting}
          />
        </div>
        {submitError && (
          <div className="comment-error">{submitError}</div>
        )}
        <button
          type="submit"
          className="comment-submit-btn"
          disabled={submitting || !userName.trim() || !content.trim()}
        >
          {submitting ? '发表中...' : '发表评论'}
        </button>
      </form>

      {/* 评论列表 */}
      <div className="comment-list">
        {loading ? (
          <div className="comment-loading">加载中...</div>
        ) : error ? (
          <div className="comment-error">{error}</div>
        ) : comments.length === 0 ? (
          <div className="comment-empty">暂无评论，快来发表第一条评论吧~</div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="comment-item">
              <div className="comment-header">
                <span className="comment-user-name">{comment.userName}</span>
                <span className="comment-time">{formatTime(comment.createdAt)}</span>
              </div>
              <div className="comment-content">{comment.content}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
