'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { safeDecodeURIComponent } from '@/lib/url-utils';
import { ThemeToggle } from '@/app/components/ThemeToggle';
import CommentSection from '@/app/components/CommentSection';
import './reader.css';

interface ImageData {
  key: string;
  url: string;
}

interface ImagesResponse {
  images: ImageData[];
}

export default function ReaderPage() {
  const params = useParams();
  const router = useRouter();
  // 安全解码，处理可能的双重编码
  const comicName = safeDecodeURIComponent(params.comicName as string);
  const chapterName = safeDecodeURIComponent(params.chapterName as string);
  const [images, setImages] = useState<ImageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const [visibleImages, setVisibleImages] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [chapters, setChapters] = useState<string[]>([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(-1);
  const imageItemRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  
  // 精选相关状态
  const [featuredImages, setFeaturedImages] = useState<Set<string>>(new Set());
  const [featuringImage, setFeaturingImage] = useState<string | null>(null);

  useEffect(() => {
    if (comicName && chapterName) {
      fetchImages();
      fetchChapters();
    }
  }, [comicName, chapterName]);

  // 检查图片是否已精选
  useEffect(() => {
    if (images.length === 0) return;
    
    const checkFeatured = async () => {
      const featuredSet = new Set<string>();
      for (const image of images) {
        try {
          const encodedComicName = encodeURIComponent(comicName);
          const response = await fetch(
            `/api/comics/${encodedComicName}/featured/check?imageKey=${encodeURIComponent(image.key)}`
          );
          if (response.ok) {
            const data = await response.json();
            if (data.featured) {
              featuredSet.add(image.key);
            }
          }
        } catch (error) {
          console.error('Error checking featured:', error);
        }
      }
      setFeaturedImages(featuredSet);
    };
    
    checkFeatured();
  }, [images, comicName]);

  const fetchChapters = async () => {
    try {
      const encodedComicName = encodeURIComponent(comicName);
      const response = await fetch(`/api/comics/${encodedComicName}`);
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      const chaptersList = data.chapters || [];
      setChapters(chaptersList);
      
      // 找到当前章节的索引
      const index = chaptersList.findIndex((ch: string) => ch === chapterName);
      setCurrentChapterIndex(index);
    } catch (err) {
      console.error('Error fetching chapters:', err);
    }
  };

  // 设置 Intersection Observer 用于懒加载
  useEffect(() => {
    if (images.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-index') || '0', 10);
            setVisibleImages((prev) => new Set([...prev, index]));
            // 一旦开始加载，就不再需要观察了
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '500px', // 提前500px开始加载
        threshold: 0.01,
      }
    );

    // 观察所有图片容器
    imageItemRefs.current.forEach((item, index) => {
      if (item) {
        observer.observe(item);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [images]);

  useEffect(() => {
    if (images.length === 0) return;

    const handleScroll = () => {
      const imageItems = document.querySelectorAll('.image-item');
      if (imageItems.length === 0) return;

      const scrollPosition = window.scrollY + window.innerHeight / 2;
      let currentIndex = 0;

      imageItems.forEach((item, index) => {
        const rect = item.getBoundingClientRect();
        const itemTop = rect.top + window.scrollY;
        const itemBottom = itemTop + rect.height;

        if (scrollPosition >= itemTop && scrollPosition <= itemBottom) {
          currentIndex = index + 1;
        }
      });

      // 如果没找到，检查是否在最后一张图片之后
      if (currentIndex === 0) {
        const lastItem = imageItems[imageItems.length - 1];
        if (lastItem) {
          const lastRect = lastItem.getBoundingClientRect();
          const lastTop = lastRect.top + window.scrollY;
          if (scrollPosition > lastTop) {
            currentIndex = images.length;
          }
        }
      }

      // 如果还是没找到，检查是否在第一张图片之前
      if (currentIndex === 0) {
        const firstItem = imageItems[0];
        if (firstItem) {
          const firstRect = firstItem.getBoundingClientRect();
          const firstTop = firstRect.top + window.scrollY;
          if (scrollPosition < firstTop) {
            currentIndex = 1;
          }
        }
      }

      if (currentIndex > 0) {
        setCurrentPage(currentIndex);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // 初始调用

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [images]);

  const fetchImages = async () => {
    try {
      setLoading(true);
      setError(null);
      // 重置加载状态
      setLoadedImages(new Set());
      setVisibleImages(new Set());
      
      // comicName和chapterName已经是解码后的值，需要重新编码用于API调用
      const encodedComicName = encodeURIComponent(comicName);
      const encodedChapterName = encodeURIComponent(chapterName);
      const url = `/api/comics/${encodedComicName}/${encodedChapterName}`;
      console.log('Fetching images from:', url);
      console.log('Decoded values:', { comicName, chapterName });
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('API response:', { 
        ok: response.ok, 
        status: response.status,
        data 
      });
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch images');
      }
      
      const imagesList = data.images || [];
      setImages(imagesList);
      
      // 立即加载前3张图片（第一张和接下来的两张）
      if (imagesList.length > 0) {
        const initialVisible = new Set<number>();
        for (let i = 0; i < Math.min(3, imagesList.length); i++) {
          initialVisible.add(i);
        }
        setVisibleImages(initialVisible);
      }
      
      if (imagesList.length === 0) {
        setError(`未找到图片。请检查路径：${comicName}/${chapterName}`);
      }
    } catch (err) {
      console.error('Error fetching images:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleImageLoad = (index: number) => {
    setLoadedImages((prev) => new Set([...prev, index]));
  };

  const setImageItemRef = (index: number, element: HTMLDivElement | null) => {
    if (element) {
      imageItemRefs.current.set(index, element);
    } else {
      imageItemRefs.current.delete(index);
    }
  };

  const handleToggleFeatured = async (image: ImageData, index: number) => {
    const imageKey = image.key;
    const isFeatured = featuredImages.has(imageKey);
    
    if (featuringImage === imageKey) return; // 防止重复点击
    
    setFeaturingImage(imageKey);
    
    try {
      if (isFeatured) {
        // 取消精选
        const encodedComicName = encodeURIComponent(comicName);
        const response = await fetch(
          `/api/comics/${encodedComicName}/featured?imageKey=${encodeURIComponent(imageKey)}`,
          { method: 'DELETE' }
        );
        
        if (response.ok) {
          setFeaturedImages(prev => {
            const newSet = new Set(prev);
            newSet.delete(imageKey);
            return newSet;
          });
        } else {
          const data = await response.json();
          alert(data.error || '取消精选失败');
        }
      } else {
        // 添加精选
        const encodedComicName = encodeURIComponent(comicName);
        const response = await fetch(`/api/comics/${encodedComicName}/featured`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chapterName,
            imageKey,
            imageIndex: index,
          }),
        });
        
        if (response.ok) {
          setFeaturedImages(prev => new Set([...prev, imageKey]));
        } else {
          const data = await response.json();
          if (data.alreadyFeatured) {
            // 如果已经被精选，更新状态
            setFeaturedImages(prev => new Set([...prev, imageKey]));
          } else {
            alert(data.error || '添加精选失败');
          }
        }
      }
    } catch (error) {
      console.error('Error toggling featured:', error);
      alert('操作失败，请重试');
    } finally {
      setFeaturingImage(null);
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
          <button className="btn" onClick={fetchImages} style={{ marginTop: '20px' }}>
            重试
          </button>
        </div>
      </div>
    );
  }

  if (images.length === 0 && !loading) {
    return (
      <div className="error">
        <div>
          <p>本章节暂无图片</p>
          {error && <p style={{ marginTop: '10px', fontSize: '14px', color: '#999' }}>{error}</p>}
          <p style={{ marginTop: '10px', fontSize: '12px', color: '#999' }}>
            路径：{comicName}/{chapterName}
          </p>
          <button className="btn" onClick={fetchImages} style={{ marginTop: '20px' }}>
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="reader-container">
      <ThemeToggle />
      <header className="reader-header">
        <button className="back-btn" onClick={() => router.back()}>
          ← 返回章节列表
        </button>
        <div className="reader-info">
          <h2>{comicName}</h2>
          <p>{chapterName}</p>
        </div>
        <div className="reader-progress">
          共 {images.length} 页
        </div>
      </header>

      <div className="reader-content">
        {loading && (
          <div className="image-loading">加载中...</div>
        )}
        {!loading && images.length > 0 && (
          <div className="images-list">
            {images.map((image, index) => {
              const shouldLoad = visibleImages.has(index);
              const isLoaded = loadedImages.has(index);
              
              return (
                <div
                  key={image.key}
                  ref={(el) => setImageItemRef(index, el)}
                  className="image-item"
                  data-index={index}
                >
                  {!isLoaded && shouldLoad && (
                    <div className="image-placeholder">
                      <div className="loading-spinner"></div>
                      <span>加载中...</span>
                    </div>
                  )}
                  {!shouldLoad && (
                    <div className="image-placeholder">
                      <span>滚动查看</span>
                    </div>
                  )}
                  <img
                    src={shouldLoad ? image.url : undefined}
                    data-src={image.url}
                    alt={`第 ${index + 1} 页`}
                    onLoad={() => handleImageLoad(index)}
                    onError={() => handleImageLoad(index)}
                    className={isLoaded ? 'loaded' : 'loading'}
                  />
                  {shouldLoad && (
                    <button
                      className={`favorite-btn ${featuredImages.has(image.key) ? 'favorited' : ''}`}
                      onClick={() => handleToggleFeatured(image, index)}
                      disabled={featuringImage === image.key}
                      title={featuredImages.has(image.key) ? '取消精选' : '加入精选'}
                    >
                      {featuredImages.has(image.key) ? '★' : '☆'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {images.length > 0 && (
        <div className="page-indicator">
          {currentChapterIndex > 0 && (
            <Link
              href={`/comic/${encodeURIComponent(comicName)}/${encodeURIComponent(chapters[currentChapterIndex - 1])}`}
              className="chapter-nav-btn prev-chapter"
            >
              ← 上一章
            </Link>
          )}
          <span className="page-text">
            {currentPage} / {images.length}
          </span>
          {currentChapterIndex >= 0 && currentChapterIndex < chapters.length - 1 && (
            <Link
              href={`/comic/${encodeURIComponent(comicName)}/${encodeURIComponent(chapters[currentChapterIndex + 1])}`}
              className="chapter-nav-btn next-chapter"
            >
              下一章 →
            </Link>
          )}
        </div>
      )}

      <CommentSection
        comicName={comicName}
        chapterName={chapterName}
      />
    </div>
  );
}
