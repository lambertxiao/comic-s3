'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { safeDecodeURIComponent } from '@/lib/url-utils';
import { ThemeToggle } from '@/app/components/ThemeToggle';
import CommentSection from '@/app/components/CommentSection';
import './chapters.css';

interface ChaptersResponse {
  chapters: string[];
}

export default function ChaptersPage() {
  const params = useParams();
  const router = useRouter();
  // 安全解码，处理可能的双重编码
  const comicName = safeDecodeURIComponent(params.comicName as string);
  // 编码后的漫画名，用于API调用和链接生成
  const encodedComicName = encodeURIComponent(comicName);
  const [chapters, setChapters] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverMessage, setCoverMessage] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  
  // Banner图相关状态
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  
  // 精选图片相关状态
  const [featuredImages, setFeaturedImages] = useState<any[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(false);
  
  // 上传章节相关状态
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [chapterName, setChapterName] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploadingChapter, setUploadingChapter] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const chapterFileInputRef = useRef<HTMLInputElement>(null);
  
  // 删除章节相关状态
  const [deletingChapter, setDeletingChapter] = useState<string | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  
  // 删除漫画相关状态
  const [deletingComic, setDeletingComic] = useState(false);
  const [deleteComicMessage, setDeleteComicMessage] = useState<string | null>(null);
  
  // 编辑模式状态
  const [editMode, setEditMode] = useState(false);
  
  // 删除精选图相关状态
  const [deletingFeatured, setDeletingFeatured] = useState<string | null>(null);
  const [deleteFeaturedMessage, setDeleteFeaturedMessage] = useState<string | null>(null);

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

  const fetchBanner = async () => {
    try {
      const encodedComicName = encodeURIComponent(comicName);
      const response = await fetch(`/api/comics/${encodedComicName}/banner`);
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      if (data.bannerUrl) {
        setBannerUrl(data.bannerUrl);
      }
    } catch (err) {
      // 静默失败
    }
  };

  const fetchFeaturedImages = async () => {
    try {
      setLoadingFeatured(true);
      const encodedComicName = encodeURIComponent(comicName);
      const response = await fetch(`/api/comics/${encodedComicName}/featured`);
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      setFeaturedImages(data.images || []);
    } catch (err) {
      console.error('Error fetching featured images:', err);
    } finally {
      setLoadingFeatured(false);
    }
  };

  useEffect(() => {
    if (comicName) {
      fetchChapters();
      fetchCover();
      fetchBanner();
      fetchFeaturedImages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comicName]);

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

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setBannerMessage('请选择有效的图片文件');
      return;
    }

    setUploadingBanner(true);
    setBannerMessage(null);

    try {
      const formData = new FormData();
      formData.append('banner', file);
      const encodedComicName = encodeURIComponent(comicName);
      const response = await fetch(`/api/comics/${encodedComicName}/banner`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '上传失败');
      }

      const data = await response.json();
      setBannerMessage('Banner图上传成功');
      
      // 重新获取Banner URL
      setTimeout(() => {
        fetchBanner();
      }, 500);
    } catch (err) {
      setBannerMessage(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploadingBanner(false);
      if (bannerInputRef.current) {
        bannerInputRef.current.value = '';
      }
    }
  };

  const handleDeleteChapter = async (chapterName: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm(`确定要删除章节 "${chapterName}" 吗？此操作不可恢复！`)) {
      return;
    }
    
    setDeletingChapter(chapterName);
    setDeleteMessage(null);
    
    try {
      const encodedComicName = encodeURIComponent(comicName);
      const encodedChapterName = encodeURIComponent(chapterName);
      const response = await fetch(`/api/comics/${encodedComicName}/${encodedChapterName}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setDeleteMessage(`成功删除章节：${chapterName}`);
        // 刷新章节列表
        setTimeout(() => {
          fetchChapters();
          setDeleteMessage(null);
        }, 1000);
      } else {
        setDeleteMessage(data.error || '删除失败');
      }
    } catch (err) {
      setDeleteMessage(err instanceof Error ? err.message : '删除失败，请重试');
    } finally {
      setDeletingChapter(null);
    }
  };

  const handleDeleteComic = async () => {
    if (!confirm(`确定要删除漫画 "${comicName}" 吗？此操作将删除该漫画的所有章节、封面和评论，且不可恢复！`)) {
      return;
    }
    
    setDeletingComic(true);
    setDeleteComicMessage(null);
    
    try {
      const encodedComicName = encodeURIComponent(comicName);
      const response = await fetch(`/api/comics/${encodedComicName}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setDeleteComicMessage(`成功删除漫画：${comicName}`);
        // 延迟跳转，让用户看到成功消息
        setTimeout(() => {
          router.push('/');
        }, 1500);
      } else {
        setDeleteComicMessage(data.error || '删除失败');
      }
    } catch (err) {
      setDeleteComicMessage(err instanceof Error ? err.message : '删除失败，请重试');
    } finally {
      setDeletingComic(false);
    }
  };

  const handleDeleteFeatured = async (imageKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm('确定要删除这张精选图吗？')) {
      return;
    }
    
    setDeletingFeatured(imageKey);
    setDeleteFeaturedMessage(null);
    
    try {
      const encodedComicName = encodeURIComponent(comicName);
      const response = await fetch(`/api/comics/${encodedComicName}/featured?imageKey=${encodeURIComponent(imageKey)}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setDeleteFeaturedMessage('成功删除精选图');
        // 刷新精选图列表
        setTimeout(() => {
          fetchFeaturedImages();
          setDeleteFeaturedMessage(null);
        }, 1000);
      } else {
        setDeleteFeaturedMessage(data.error || '删除失败');
      }
    } catch (err) {
      setDeleteFeaturedMessage(err instanceof Error ? err.message : '删除失败，请重试');
    } finally {
      setDeletingFeatured(null);
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

  return (
    <div className="chapters-container">
      <ThemeToggle />
      
      {/* Banner 区域 */}
      <div className="comic-banner">
        <div className="banner-background">
          {bannerUrl || coverUrl ? (
            <img src={bannerUrl || coverUrl || ''} alt={comicName} className="banner-image" />
          ) : (
            <div className="banner-placeholder">
              <div className="banner-placeholder-icon">📖</div>
              <p>暂无Banner图</p>
            </div>
          )}
          <div className="banner-overlay"></div>
        </div>
        <div className="banner-content">
          <button className="back-btn banner-back-btn" onClick={() => router.push('/')}>
            ← 返回
          </button>
          <div className="banner-info">
            <h1 className="banner-title">{comicName}</h1>
            <p className="banner-subtitle">选择章节开始阅读</p>
          </div>
          <div className="banner-actions">
            <button
              className="edit-mode-toggle-btn"
              onClick={() => setEditMode(!editMode)}
              title={editMode ? '退出编辑模式' : '进入编辑模式'}
            >
              {editMode ? '✓ 编辑模式' : '✎ 编辑'}
            </button>
            {editMode && (
              <>
                <div className="banner-upload-section">
                  <input
                    ref={bannerInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleBannerChange}
                    className="banner-input"
                    id="banner-input"
                    disabled={uploadingBanner}
                  />
                  <label htmlFor="banner-input" className="banner-upload-btn">
                    {uploadingBanner ? '上传中...' : bannerUrl ? '更换Banner' : '上传Banner'}
                  </label>
                  {bannerMessage && (
                    <div className={`banner-message ${bannerMessage.includes('成功') ? 'success' : 'error'}`}>
                      {bannerMessage}
                    </div>
                  )}
                </div>
                <button
                  className="delete-comic-btn banner-delete-btn"
                  onClick={handleDeleteComic}
                  disabled={deletingComic}
                  title="删除漫画"
                >
                  {deletingComic ? '删除中...' : '删除漫画'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      
      {deleteComicMessage && (
        <div className={`delete-message ${deleteComicMessage.includes('成功') ? 'success' : 'error'}`}>
          {deleteComicMessage}
        </div>
      )}

      <div className="chapters-content">
        <div className="cover-section">
          <div className="cover-preview-container">
            {coverUrl ? (
              <img src={coverUrl} alt="封面" className="cover-preview-image" />
            ) : (
              <div className="cover-placeholder">暂无封面</div>
            )}
          </div>
          {editMode && (
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
          )}
        </div>

      {editMode && (
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
      )}

      {deleteMessage && (
        <div className={`delete-message ${deleteMessage.includes('成功') ? 'success' : 'error'}`}>
          {deleteMessage}
        </div>
      )}

      <div className="chapters-list">
        {chapters.length === 0 ? (
          <div className="empty-state">
            <p>暂无章节</p>
          </div>
        ) : (
          chapters.map((chapter, index) => (
            <div key={chapter} className="chapter-card-wrapper">
              <Link
                href={`/comic/${encodedComicName}/${encodeURIComponent(chapter)}`}
                className="chapter-link"
              >
                <div className="chapter-card">
                  <span className="chapter-number">{index + 1}</span>
                  <span className="chapter-name">{chapter}</span>
                  <span className="chapter-arrow">→</span>
                </div>
              </Link>
              {editMode && (
                <button
                  className="delete-chapter-btn"
                  onClick={(e) => handleDeleteChapter(chapter, e)}
                  disabled={deletingChapter === chapter}
                  title="删除章节"
                >
                  {deletingChapter === chapter ? '删除中...' : '×'}
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* 精选页区域 */}
      {featuredImages.length > 0 && (
        <div className="featured-section">
          <h2 className="featured-title">⭐ 精选页</h2>
          {deleteFeaturedMessage && (
            <div className={`delete-message ${deleteFeaturedMessage.includes('成功') ? 'success' : 'error'}`}>
              {deleteFeaturedMessage}
            </div>
          )}
          <div className="featured-grid">
            {featuredImages.map((image) => (
              <div key={image.id} className="featured-item-wrapper">
                <Link
                  href={`/comic/${encodedComicName}/${encodeURIComponent(image.chapterName)}`}
                  className="featured-item"
                >
                  {image.imageUrl ? (
                    <img 
                      src={image.imageUrl} 
                      alt={`${image.chapterName} - 第 ${image.imageIndex + 1} 页`}
                      className="featured-image"
                    />
                  ) : (
                    <div className="featured-image-placeholder">
                      <span>图片加载失败</span>
                    </div>
                  )}
                  <div className="featured-info">
                    <p className="featured-chapter">{image.chapterName}</p>
                    <p className="featured-page">第 {image.imageIndex + 1} 页</p>
                  </div>
                </Link>
                {editMode && (
                  <button
                    className="delete-featured-btn"
                    onClick={(e) => handleDeleteFeatured(image.imageKey, e)}
                    disabled={deletingFeatured === image.imageKey}
                    title="删除精选图"
                  >
                    {deletingFeatured === image.imageKey ? '删除中...' : '×'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <CommentSection
        comicName={comicName}
        chapterName={null}
      />
      </div>
    </div>
  );
}
