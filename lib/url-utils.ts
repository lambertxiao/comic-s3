/**
 * 安全地解码URL参数，处理可能的双重编码
 */
export function safeDecodeURIComponent(str: string): string {
  try {
    // 先尝试解码
    let decoded = decodeURIComponent(str);
    // 如果解码后还包含编码字符（%），说明可能是双重编码，再解码一次
    if (decoded.includes('%') && decoded !== str) {
      try {
        decoded = decodeURIComponent(decoded);
      } catch {
        // 如果第二次解码失败，返回第一次解码的结果
      }
    }
    return decoded;
  } catch {
    // 如果解码失败，返回原始值
    return str;
  }
}

/**
 * 检查字符串是否包含URL编码字符
 */
export function isEncoded(str: string): boolean {
  try {
    return decodeURIComponent(str) !== str;
  } catch {
    return false;
  }
}
