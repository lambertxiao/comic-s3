'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ThemeToggle } from '@/app/components/ThemeToggle';
import './home.css';

interface Comic {
  name: string;
  coverUrl: string | null;
}

interface ComicListResponse {
  comics: Comic[];
}

export default function Home() {
  const [comics, setComics] = useState<Comic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchComics();
  }, []);

  const fetchComics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/comics');
      if (!response.ok) {
        throw new Error('Failed to fetch comics');
      }
      const data: ComicListResponse = await response.json();
      setComics(data.comics);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
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
          <button className="btn" onClick={fetchComics} style={{ marginTop: '20px' }}>
            重试
          </button>
        </div>
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
