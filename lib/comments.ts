import { GetObjectCommand, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, BUCKET_NAME } from './s3';

export interface Comment {
  id: string;
  userName: string;
  content: string;
  chapterName: string | null; // null表示漫画级别评论
  parentId: string | null; // null表示顶级评论，否则是回复的评论ID
  createdAt: string;
  likes: number;
}

export interface CommentsData {
  comments: Comment[];
  lastUpdated: string;
}

// 获取评论文件的S3 key
function getCommentsKey(comicName: string, chapterName: string | null): string {
  if (chapterName) {
    // 章节级别评论：comic/漫画名/chapters/章节名/comments.json
    return `${comicName}/chapters/${chapterName}/comments.json`;
  } else {
    // 漫画级别评论：comic/漫画名/comments.json
    return `${comicName}/comments.json`;
  }
}

// 检查文件是否存在
async function fileExists(comicName: string, chapterName: string | null): Promise<boolean> {
  try {
    const key = getCommentsKey(comicName, chapterName);
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    await s3Client.send(command);
    return true;
  } catch (error: any) {
    if (error.name === 'NoSuchKey' || error.name === 'NotFound') {
      return false;
    }
    throw error;
  }
}

// 读取评论文件
export async function readComments(
  comicName: string,
  chapterName: string | null
): Promise<CommentsData> {
  try {
    const key = getCommentsKey(comicName, chapterName);
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(command);
    const body = await response.Body?.transformToString();
    
    if (!body) {
      return { comments: [], lastUpdated: new Date().toISOString() };
    }

    return JSON.parse(body) as CommentsData;
  } catch (error: any) {
    // 如果文件不存在，返回空数据（使用固定的初始值，避免每次生成新的时间戳）
    if (error.name === 'NoSuchKey' || error.name === 'NotFound') {
      return { comments: [], lastUpdated: '' }; // 使用空字符串表示文件不存在
    }
    console.error('Error reading comments:', error);
    throw error;
  }
}

// 检查文件内容是否被修改（通过读取文件并比较 lastUpdated）
async function checkFileModified(
  comicName: string,
  chapterName: string | null,
  expectedLastUpdated: string | null
): Promise<boolean> {
  try {
    const exists = await fileExists(comicName, chapterName);
    
    // 如果文件不存在
    if (!exists) {
      // 如果 expectedLastUpdated 是空字符串或 null，说明这是第一次写入，不算被修改
      if (!expectedLastUpdated || expectedLastUpdated === '') {
        return false;
      }
      // 否则说明文件被删除了，算作被修改
      return true;
    }
    
    // 文件存在，读取并比较
    const currentData = await readComments(comicName, chapterName);
    // 如果 lastUpdated 不匹配，说明文件被修改了
    return currentData.lastUpdated !== expectedLastUpdated;
  } catch (error) {
    // 如果读取失败，假设文件被修改了
    console.error('Error checking file modification:', error);
    return true;
  }
}

// 写入评论文件（带乐观锁）
export async function writeComments(
  comicName: string,
  chapterName: string | null,
  commentsData: CommentsData,
  expectedLastModified: string | null,
  maxRetries: number = 3
): Promise<void> {
  const key = getCommentsKey(comicName, chapterName);
  let retries = maxRetries;
  let currentCommentsData = commentsData;

  while (retries > 0) {
    try {
      // 检查文件是否被修改
      const isModified = await checkFileModified(comicName, chapterName, expectedLastModified);
      
      // 如果文件被修改了，重新读取并合并
      // 注意：如果 expectedLastModified 是 null 或空字符串，说明是第一次写入，不需要检查
      if (isModified && expectedLastModified && expectedLastModified !== '') {
        if (retries === 1) {
          throw new Error('文件已被其他用户修改，请刷新后重试');
        }
        
        // 重新读取最新数据
        const latestData = await readComments(comicName, chapterName);
        
        // 合并评论（保留所有评论，按时间排序）
        // 使用 Map 去重，保留最新的评论
        const commentMap = new Map<string, Comment>();
        
        // 先添加现有评论
        latestData.comments.forEach(c => commentMap.set(c.id, c));
        
        // 再添加新评论（会覆盖相同ID的旧评论）
        currentCommentsData.comments.forEach(c => commentMap.set(c.id, c));
        
        // 转换为数组并按时间排序
        const uniqueComments = Array.from(commentMap.values()).sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        
        currentCommentsData = {
          comments: uniqueComments,
          lastUpdated: new Date().toISOString(),
        };
        
        expectedLastModified = latestData.lastUpdated || null;
        retries--;
        await new Promise(resolve => setTimeout(resolve, 100)); // 等待100ms后重试
        continue;
      }

      // 写入文件
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: JSON.stringify(currentCommentsData, null, 2),
        ContentType: 'application/json',
      });

      await s3Client.send(command);
      return; // 成功写入
    } catch (error: any) {
      if (error.message?.includes('文件已被其他用户修改')) {
        throw error; // 重试次数用完，抛出错误
      }
      
      retries--;
      if (retries === 0) {
        console.error('Error writing comments after retries:', error);
        throw new Error('写入评论失败，请稍后重试');
      }
      
      await new Promise(resolve => setTimeout(resolve, 100)); // 等待后重试
    }
  }
}

// 添加评论
export async function addComment(
  comicName: string,
  chapterName: string | null,
  userName: string,
  content: string,
  parentId: string | null = null
): Promise<Comment> {
  // 读取现有评论
  const commentsData = await readComments(comicName, chapterName);
  // 如果文件不存在，lastUpdated 会是空字符串，我们需要保存这个状态
  const expectedLastModified = commentsData.lastUpdated || null;

  // 创建新评论
  const newComment: Comment = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userName: userName.trim(),
    content: content.trim(),
    chapterName,
    parentId,
    createdAt: new Date().toISOString(),
    likes: 0,
  };

  // 添加到评论列表
  commentsData.comments.push(newComment);
  commentsData.lastUpdated = new Date().toISOString();

  // 写入（带乐观锁）
  await writeComments(comicName, chapterName, commentsData, expectedLastModified);

  return newComment;
}

// 获取评论列表（支持过滤）
export async function getComments(
  comicName: string,
  chapterName: string | null
): Promise<Comment[]> {
  const commentsData = await readComments(comicName, chapterName);
  
  // 如果指定了章节名，只返回该章节的评论
  // 如果没有指定章节名，只返回漫画级别的评论（chapterName为null）
  return commentsData.comments.filter(comment => {
    if (chapterName) {
      return comment.chapterName === chapterName;
    } else {
      return comment.chapterName === null;
    }
  });
}
