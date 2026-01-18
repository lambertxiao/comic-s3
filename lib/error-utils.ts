/**
 * 检测是否为S3连接错误
 */
export function isS3ConnectionError(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = error.message || '';
  const errorCode = error.code || error.name || '';
  const errorString = `${errorMessage} ${errorCode}`.toLowerCase();
  
  // 检测常见的S3连接错误
  const s3ErrorPatterns = [
    'econnrefused',      // 连接被拒绝
    'enotfound',         // 域名解析失败
    'timeout',           // 超时
    'network',           // 网络错误
    'credentials',        // 凭证错误
    'access denied',     // 访问被拒绝
    'invalidcredentials', // 无效凭证
    'signature',         // 签名错误
    'endpoint',          // 端点错误
    'bucket',            // 存储桶错误
    'region',            // 区域错误
    's3',                // S3相关
    'aws',               // AWS相关
  ];
  
  return s3ErrorPatterns.some(pattern => errorString.includes(pattern));
}

/**
 * 获取友好的错误消息
 */
export function getFriendlyErrorMessage(error: any): string {
  if (!error) return '发生未知错误';
  
  const errorMessage = error.message || '';
  const errorCode = error.code || error.name || '';
  
  if (isS3ConnectionError(error)) {
    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ENOTFOUND')) {
      return '无法连接到S3存储服务，请检查网络连接或联系管理员';
    }
    if (errorMessage.includes('timeout')) {
      return '连接S3存储服务超时，请稍后重试';
    }
    if (errorMessage.includes('credentials') || errorMessage.includes('Access Denied')) {
      return 'S3存储服务认证失败，请检查配置信息';
    }
    if (errorMessage.includes('bucket') || errorMessage.includes('Bucket')) {
      return 'S3存储桶不存在或无法访问';
    }
    return 'S3存储服务连接失败，请稍后重试或联系管理员';
  }
  
  // 返回原始错误消息，如果没有则返回通用消息
  return errorMessage || '操作失败，请稍后重试';
}
