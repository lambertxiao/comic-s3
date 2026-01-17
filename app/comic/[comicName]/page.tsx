'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { safeDecodeURIComponent } from '@/lib/url-utils';
import { ThemeToggle } from '@/app/components/ThemeToggle';
import './chapters.css';

interface ChaptersResponse {
  chapters: string[];
}

export default function ChaptersPage() {
  const params = useParams();
  const router = useRouter();
  // 安全解码，处理可能的双重编码
  const comicName = safeDecodeURIComponent(params.comicName as string);
  const [chapters, setChapters] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverMessage, setCoverMessage] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  
  // 上传章节相关状态
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [chapterName, setChapterName] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploadingChapter, setUploadingChapter] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const chapterFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (comicName) {
      fetchChapters();
      fetchCover();
    }
  }, [comicName]);

  const fetchChapters = async () => {
    try {
      setLoading(true);
      // comicName已经是解码后的值，需要重新编码用于API调用
      const encodedComicName = encodeURIComponent(comicName);
      const response = await fetch(`/api/comics/${encodedComicName}`);
      if (!response.ok) {
        throw new Error('Failed to fetch chapters');
      }
      const data: ChaptersResponse = await response.json();
      setChapters(data.chapters);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCover = async () => {
    try {
      const encodedComicName = encodeURIComponent(comicName);
      const response = await fetch(`/api/comics`);
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      const comic = data.comics.find((c: any) => c.name === comicName);
      if (comic && comic.coverUrl) {
        setCoverUrl(comic.coverUrl);
      }
    } catch (err) {
      // 静默失败
    }
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setCoverMessage('请选择有效的图片文件');
      return;
    }

    setUploadingCover(true);
    setCoverMessage(null);

    try {
      const formData = new FormData();
      formData.append('cover', file);
      const encodedComicName = encodeURIComponent(comicName);
      const response = await fetch(`/api/comics/${encodedComicName}/cover`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '上传失败');
      }

      const data = await response.json();
      setCoverMessage('封面图上传成功');
      
      // 重新获取封面URL
      setTimeout(() => {
        fetchCover();
      }, 500);
    } catch (err) {
      setCoverMessage(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) {
        coverInputRef.current.value = '';
      }
    }
  };

  const handleChapterFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileArray = Array.from(e.target.files);
      setFiles(fileArray);
    }
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    if (chapterFileInputRef.current) {
      chapterFileInputRef.current.value = '';
    }
  };

  const handleUploadChapter = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!chapterName.trim()) {
      setUploadMessage('请填写章节名');
      return;
    }

    if (files.length === 0) {
      setUploadMessage('请至少选择一个图片文件');
      return;
    }

    setUploadingChapter(true);
    setUploadMessage(null);

    try {
      const formData = new FormData();
      formData.append('comicName', comicName);
      formData.append('chapterName', chapterName.trim());
      files.forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setUploadMessage(`成功上传 ${data.uploaded}/${data.total} 个文件`);
        // 清空表单
        setChapterName('');
        setFiles([]);
        if (chapterFileInputRef.current) {
          chapterFileInputRef.current.value = '';
        }
        // 刷新章节列表
        setTimeout(() => {
          fetchChapters();
          setShowUploadForm(false);
        }, 1000);
      } else {
        setUploadMessage(data.error || '上传失败');
      }
    } catch (err) {
      setUploadMessage(err instanceof Error ? err.message : '上传失败，请重试');
    } finally {
      setUploadingChapter(false);
    }
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (error) {
    return (
      <div className="error">
        <div>
          <p>错误: {error}</p>
          <button className="btn" onClick={fetchChapters} style={{ marginTop: '20px' }}>
            重试
          </button>
        </div>
      </div>
    );
  }

  // comicName已经是解码后的值，直接使用
  // 但在生成链接时需要编码，Next.js Link会自动处理，但为了安全我们还是手动编码
  const encodedComicName = encodeURIComponent(comicName);

  return (
    <div className="chapters-container">
      <ThemeToggle />
      <header className="chapters-header">
        <button className="back-btn" onClick={() => router.push('/')}>
          ← 返回
        </button>
        <h1>{comicName}</h1>
        <p>选择章节</p>
      </header>

      <div className="cover-section">
        <div className="cover-preview-container">
          {coverUrl ? (
            <img src={coverUrl} alt="封面" className="cover-preview-image" />
          ) : (
            <div className="cover-placeholder">暂无封面</div>
          )}
        </div>
        <div className="cover-upload-section">
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            onChange={handleCoverChange}
            className="cover-input"
            id="cover-input"
            disabled={uploadingCover}
          />
          <label htmlFor="cover-input" className="cover-upload-btn">
            {uploadingCover ? '上传中...' : coverUrl ? '更换封面' : '上传封面'}
          </label>
          {coverMessage && (
            <div className={`cover-message ${coverMessage.includes('成功') ? 'success' : 'error'}`}>
              {coverMessage}
            </div>
          )}
        </div>
      </div>

      <div className="upload-chapter-section">
        <button
          className="toggle-upload-btn"
          onClick={() => setShowUploadForm(!showUploadForm)}
        >
          {showUploadForm ? '▼ 收起上传' : '▲ 上传新章节'}
        </button>
        
        {showUploadForm && (
          <form onSubmit={handleUploadChapter} className="upload-chapter-form">
            <div className="form-group">
              <label htmlFor="chapterName">章节名称 *</label>
              <input
                type="text"
                id="chapterName"
                value={chapterName}
                onChange={(e) => setChapterName(e.target.value)}
                placeholder="例如：第1章"
                required
                disabled={uploadingChapter}
              />
            </div>

            <div className="form-group">
              <label htmlFor="chapterFiles">选择图片文件 *</label>
              <div className="file-input-wrapper">
                <input
                  ref={chapterFileInputRef}
                  type="file"
                  id="chapterFiles"
                  multiple
                  accept="image/*"
                  onChange={handleChapterFileChange}
                  disabled={uploadingChapter}
                  className="file-input"
                />
                <label htmlFor="chapterFiles" className="file-input-label">
                  选择文件
                </label>
              </div>
              {files.length > 0 && (
                <div className="file-list">
                  <p className="file-count">已选择 {files.length} 个文件：</p>
                  <ul>
                    {files.map((file, index) => (
                      <li key={index} className="file-item">
                        <span className="file-name">{file.name}</span>
                        <span className="file-size">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                        {!uploadingChapter && (
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(index)}
                            className="remove-file-btn"
                          >
                            ✕
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {uploadMessage && (
              <div className={`upload-message ${uploadMessage.includes('成功') ? 'success' : 'error'}`}>
                {uploadMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={uploadingChapter || files.length === 0 || !chapterName.trim()}
              className="submit-chapter-btn"
            >
              {uploadingChapter ? '上传中...' : '开始上传'}
            </button>
          </form>
        )}
      </div>

      <div className="chapters-list">
        {chapters.length === 0 ? (
          <div className="empty-state">
            <p>暂无章节</p>
          </div>
        ) : (
          chapters.map((chapter, index) => (
            <Link
              key={chapter}
              href={`/comic/${encodedComicName}/${encodeURIComponent(chapter)}`}
            >
              <div className="chapter-card">
                <span className="chapter-number">{index + 1}</span>
                <span className="chapter-name">{chapter}</span>
                <span className="chapter-arrow">→</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
