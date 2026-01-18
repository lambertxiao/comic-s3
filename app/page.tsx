'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ThemeToggle } from '@/app/components/ThemeToggle';
import { ErrorDisplay } from '@/app/components/ErrorDisplay';
import './home.css';

interface Comic {
  name: string;
  coverUrl: string | null;
}

interface ComicListResponse {
  comics: Comic[];
  error?: string;
  isS3Error?: boolean;
  originalError?: string;
}

export default function Home() {
  const [comics, setComics] = useState<Comic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isS3Error, setIsS3Error] = useState(false);
  const [originalError, setOriginalError] = useState<string | undefined>();

  useEffect(() => {
    fetchComics();
  }, []);

  const fetchComics = async () => {
    try {
      setLoading(true);
      setError(null);
      setIsS3Error(false);
      const response = await fetch('/api/comics');
      const data: ComicListResponse = await response.json();
      
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to fetch comics');
      }
      
      setComics(data.comics);
      // 成功时清除所有错误状态
      setIsS3Error(false);
      setOriginalError(undefined);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      // 尝试从响应中获取S3错误信息
      try {
        const response = await fetch('/api/comics');
        const data: ComicListResponse = await response.json();
        setIsS3Error(data.isS3Error || false);
        setOriginalError(data.originalError);
      } catch {
        // 忽略
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="home-container">
        <ThemeToggle />
        <div className="loading">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="home-container">
        <ThemeToggle />
        <ErrorDisplay
          title="无法加载漫画列表"
          message={error}
          error={originalError}
          onRetry={fetchComics}
          showDetails={process.env.NODE_ENV === 'development'}
          autoRetry={isS3Error}
          retryInterval={5000}
        />
      </div>
    );
  }

  return (
    <div className="home-container">
      <ThemeToggle />
      <header className="header">
        <h1>📚 想看漫画</h1>
        <p>选择你想看的漫画</p>
        <Link href="/upload" className="upload-link">
          📤 上传漫画
        </Link>
      </header>

      <div className="comics-grid">
        {comics.length === 0 ? (
          <div className="empty-state">
            <p>暂无漫画</p>
          </div>
        ) : (
          comics.map((comic) => (
            <Link key={comic.name} href={`/comic/${encodeURIComponent(comic.name)}`}>
              <div className="comic-card">
                {comic.coverUrl ? (
                  <div className="comic-cover">
                    <img src={comic.coverUrl} alt={comic.name} />
                  </div>
                ) : (
                  <div className="comic-icon">📖</div>
                )}
                <h3>{comic.name}</h3>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
