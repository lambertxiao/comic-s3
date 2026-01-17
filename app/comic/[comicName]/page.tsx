'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { safeDecodeURIComponent } from '@/lib/url-utils';
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

  useEffect(() => {
    if (comicName) {
      fetchChapters();
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
      <header className="chapters-header">
        <button className="back-btn" onClick={() => router.push('/')}>
          ← 返回
        </button>
        <h1>{comicName}</h1>
        <p>选择章节</p>
      </header>

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
