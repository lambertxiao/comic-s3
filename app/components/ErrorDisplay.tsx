'use client';

import { useEffect, useState } from 'react';
import './ErrorDisplay.css';

interface ErrorDisplayProps {
  title?: string;
  message: string;
  error?: Error | string;
  onRetry?: () => void;
  showDetails?: boolean;
  autoRetry?: boolean;
  retryInterval?: number;
}

export function ErrorDisplay({ 
  title = '连接错误', 
  message, 
  error,
  onRetry,
  showDetails = false,
  autoRetry = true,
  retryInterval = 5000
}: ErrorDisplayProps) {
  const errorMessage = error instanceof Error ? error.message : error || '';
  const isS3Error = errorMessage.includes('S3') || 
                    errorMessage.includes('ECONNREFUSED') ||
                    errorMessage.includes('ENOTFOUND') ||
                    errorMessage.includes('timeout') ||
                    errorMessage.includes('Network') ||
                    errorMessage.includes('credentials');
  
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  // 自动重试机制
  useEffect(() => {
    if (!autoRetry || !isS3Error || !onRetry) return;

    let retryCountLocal = 0;
    
    const interval = setInterval(async () => {
      // 检查网络状态
      if (!navigator.onLine) {
        return;
      }

      setIsRetrying(true);
      retryCountLocal += 1;
      setRetryCount(retryCountLocal);
      
      try {
        await onRetry();
        // 如果重试成功，onRetry会清除错误状态，组件会卸载
        // 这里不需要额外处理，因为错误状态清除后组件会重新渲染
      } catch (err) {
        // 重试失败，继续等待下次重试
        console.log(`自动重试失败 (第${retryCountLocal}次)`);
      } finally {
        setIsRetrying(false);
      }
    }, retryInterval);

    return () => clearInterval(interval);
  }, [autoRetry, isS3Error, onRetry, retryInterval]);

  // 监听网络状态变化
  useEffect(() => {
    if (!autoRetry || !isS3Error || !onRetry) return;

    const handleOnline = () => {
      console.log('网络已恢复，立即重试...');
      setIsRetrying(true);
      setRetryCount(prev => prev + 1);
      onRetry().finally(() => setIsRetrying(false));
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [autoRetry, isS3Error, onRetry]);

  return (
    <div className="error-display">
      <div className="error-icon">⚠️</div>
      <h2 className="error-title">{title}</h2>
      <p className="error-message">{message}</p>
      
      {isS3Error && (
        <div className="error-suggestions">
          <h3>可能的原因：</h3>
          <ul>
            <li>S3存储服务暂时不可用</li>
            <li>网络连接问题</li>
            <li>S3配置信息不正确</li>
            <li>服务器正在维护中</li>
          </ul>
          <h3>建议操作：</h3>
          <ul>
            <li>检查网络连接</li>
            <li>稍后重试</li>
            <li>联系管理员检查S3服务状态</li>
          </ul>
        </div>
      )}

      {showDetails && errorMessage && (
        <details className="error-details">
          <summary>错误详情</summary>
          <pre className="error-code">{errorMessage}</pre>
        </details>
      )}

      {onRetry && (
        <div className="error-retry-section">
          <button 
            className="error-retry-btn" 
            onClick={onRetry}
            disabled={isRetrying}
          >
            {isRetrying ? '重试中...' : '立即重试'}
          </button>
          {autoRetry && isS3Error && (
            <p className="auto-retry-info">
              {isRetrying 
                ? `正在自动重试 (第${retryCount + 1}次)...`
                : `将在 ${retryInterval / 1000} 秒后自动重试 (已重试 ${retryCount} 次)`
              }
            </p>
          )}
        </div>
      )}
    </div>
  );
}
