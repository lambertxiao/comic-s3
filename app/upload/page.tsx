'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import './upload.css';

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [comicName, setComicName] = useState('');
  const [chapterName, setChapterName] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileArray = Array.from(e.target.files);
      setFiles(fileArray);
    }
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!comicName.trim() || !chapterName.trim()) {
      setResult({ success: false, message: '请填写漫画名和章节名' });
      return;
    }

    if (files.length === 0) {
      setResult({ success: false, message: '请至少选择一个文件' });
      return;
    }

    setUploading(true);
    setResult(null);
    setUploadProgress({});

    try {
      const formData = new FormData();
      formData.append('comicName', comicName.trim());
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
        setResult({
          success: true,
          message: `成功上传 ${data.uploaded}/${data.total} 个文件`,
        });
        // 清空表单
        setComicName('');
        setChapterName('');
        setFiles([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setResult({
          success: false,
          message: data.error || '上传失败',
        });
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || '上传失败，请重试',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-container">
      <header className="upload-header">
        <Link href="/" className="back-link">
          ← 返回首页
        </Link>
        <h1>📤 上传漫画</h1>
        <p>上传漫画图片到S3存储</p>
      </header>

      <form onSubmit={handleSubmit} className="upload-form">
        <div className="form-group">
          <label htmlFor="comicName">漫画名称 *</label>
          <input
            type="text"
            id="comicName"
            value={comicName}
            onChange={(e) => setComicName(e.target.value)}
            placeholder="例如：火影忍者"
            required
            disabled={uploading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="chapterName">章节名称 *</label>
          <input
            type="text"
            id="chapterName"
            value={chapterName}
            onChange={(e) => setChapterName(e.target.value)}
            placeholder="例如：第1章"
            required
            disabled={uploading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="files">选择图片文件 *</label>
          <div className="file-input-wrapper">
            <input
              ref={fileInputRef}
              type="file"
              id="files"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              disabled={uploading}
              className="file-input"
            />
            <label htmlFor="files" className="file-input-label">
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
                    {!uploading && (
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

        {result && (
          <div className={`result-message ${result.success ? 'success' : 'error'}`}>
            {result.message}
          </div>
        )}

        <div className="form-actions">
          <button
            type="submit"
            disabled={uploading || files.length === 0}
            className="submit-btn"
          >
            {uploading ? '上传中...' : '开始上传'}
          </button>
          {result?.success && (
            <Link href={`/comic/${encodeURIComponent(comicName)}`} className="view-link">
              查看章节
            </Link>
          )}
        </div>
      </form>

      <div className="upload-info">
        <h3>📋 上传说明</h3>
        <ul>
          <li>支持上传多个图片文件（jpg, png, gif, webp等）</li>
          <li>文件将按照上传顺序保存到S3</li>
          <li>路径格式：<code>comic/漫画名/章节名/文件名</code></li>
          <li>建议文件名包含序号，如：001.jpg, 002.jpg</li>
        </ul>
      </div>
    </div>
  );
}
