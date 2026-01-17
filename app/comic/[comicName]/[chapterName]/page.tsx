'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { safeDecodeURIComponent } from '@/lib/url-utils';
import { ThemeToggle } from '@/app/components/ThemeToggle';
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
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (comicName && chapterName) {
      fetchImages();
    }
  }, [comicName, chapterName]);

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
      
      setImages(data.images || []);
      if (!data.images || data.images.length === 0) {
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
            {images.map((image, index) => (
              <div key={image.key} className="image-item">
                {!loadedImages.has(index) && (
                  <div className="image-placeholder">
                    <div className="loading-spinner"></div>
                    <span>加载中...</span>
                  </div>
                )}
                <img
                  src={image.url}
                  alt={`第 ${index + 1} 页`}
                  onLoad={() => handleImageLoad(index)}
                  onError={() => handleImageLoad(index)}
                  className={loadedImages.has(index) ? 'loaded' : 'loading'}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {images.length > 0 && (
        <div className="page-indicator">
          <span className="page-text">
            {currentPage} / {images.length}
          </span>
        </div>
      )}
    </div>
  );
}
