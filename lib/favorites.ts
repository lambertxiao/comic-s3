import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, BUCKET_NAME } from './s3';

export interface FeaturedImage {
  id: string;
  chapterName: string;
  imageKey: string;
  imageIndex: number;
  addedAt: string;
  addedBy?: string; // 可选：添加者信息
}

export interface FeaturedData {
  images: FeaturedImage[];
  lastUpdated: string;
}

// 获取精选文件的S3 key（按漫画存储）
function getFeaturedKey(comicName: string): string {
  return `${comicName}/_featured.json`;
}

// 读取精选文件
export async function readFeatured(comicName: string): Promise<FeaturedData> {
  try {
    const key = getFeaturedKey(comicName);
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(command);
    const body = await response.Body?.transformToString();
    
    if (!body) {
      return { images: [], lastUpdated: '' };
    }

    return JSON.parse(body) as FeaturedData;
  } catch (error: any) {
    // 如果文件不存在，返回空数据
    if (error.name === 'NoSuchKey' || error.name === 'NotFound') {
      return { images: [], lastUpdated: '' };
    }
    console.error('Error reading featured:', error);
    throw error;
  }
}

// 检查文件是否存在
async function fileExists(key: string): Promise<boolean> {
  try {
    const { HeadObjectCommand } = await import('@aws-sdk/client-s3');
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

// 检查文件内容是否被修改
async function checkFileModified(comicName: string, expectedLastUpdated: string | null): Promise<boolean> {
  try {
    const currentData = await readFeatured(comicName);
    return currentData.lastUpdated !== expectedLastUpdated;
  } catch (error) {
    console.error('Error checking file modification:', error);
    return true;
  }
}

// 写入精选文件（带乐观锁）
export async function writeFeatured(
  comicName: string,
  featuredData: FeaturedData,
  expectedLastModified: string | null,
  maxRetries: number = 3
): Promise<void> {
  const key = getFeaturedKey(comicName);
  let retries = maxRetries;
  let currentFeaturedData = featuredData;

  while (retries > 0) {
    try {
      // 检查文件是否被修改
      const isModified = await checkFileModified(comicName, expectedLastModified);
      
      // 如果文件被修改了，重新读取并合并
      if (isModified && expectedLastModified && expectedLastModified !== '') {
        if (retries === 1) {
          throw new Error('文件已被其他用户修改，请刷新后重试');
        }
        
        // 重新读取最新数据
        const latestData = await readFeatured(comicName);
        
        // 合并精选图片（使用imageKey去重）
        const imageMap = new Map<string, FeaturedImage>();
        
        // 先添加现有图片
        latestData.images.forEach(img => imageMap.set(img.imageKey, img));
        
        // 再添加新图片（会覆盖相同imageKey的旧图片）
        currentFeaturedData.images.forEach(img => imageMap.set(img.imageKey, img));
        
        // 转换为数组并按时间排序
        const uniqueImages = Array.from(imageMap.values()).sort((a, b) => 
          new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
        );
        
        currentFeaturedData = {
          images: uniqueImages,
          lastUpdated: new Date().toISOString(),
        };
        
        expectedLastModified = latestData.lastUpdated || null;
        retries--;
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }

      // 写入文件
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: JSON.stringify(currentFeaturedData, null, 2),
        ContentType: 'application/json',
      });

      await s3Client.send(command);
      return; // 成功写入
    } catch (error: any) {
      if (error.message?.includes('文件已被其他用户修改')) {
        throw error;
      }
      
      retries--;
      if (retries === 0) {
        console.error('Error writing featured after retries:', error);
        throw new Error('写入精选失败，请稍后重试');
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

// 添加精选图片（一张图只能被加入一次）
export async function addFeaturedImage(
  comicName: string,
  chapterName: string,
  imageKey: string,
  imageIndex: number
): Promise<FeaturedImage | null> {
  // 读取现有精选
  const featuredData = await readFeatured(comicName);
  const expectedLastModified = featuredData.lastUpdated || null;

  // 检查是否已经存在（根据imageKey去重）
  const existingImage = featuredData.images.find(
    img => img.imageKey === imageKey
  );

  if (existingImage) {
    // 如果已存在，返回null表示已添加过
    return null;
  }

  // 创建新精选图片
  const newImage: FeaturedImage = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    chapterName,
    imageKey,
    imageIndex,
    addedAt: new Date().toISOString(),
  };

  // 添加到精选列表
  featuredData.images.unshift(newImage); // 添加到开头
  featuredData.lastUpdated = new Date().toISOString();

  // 写入（带乐观锁）
  await writeFeatured(comicName, featuredData, expectedLastModified);

  return newImage;
}

// 删除精选图片
export async function removeFeaturedImage(comicName: string, imageKey: string): Promise<void> {
  const featuredData = await readFeatured(comicName);
  const expectedLastModified = featuredData.lastUpdated || null;

  // 移除精选图片
  featuredData.images = featuredData.images.filter(img => img.imageKey !== imageKey);
  featuredData.lastUpdated = new Date().toISOString();

  // 写入（带乐观锁）
  await writeFeatured(comicName, featuredData, expectedLastModified);
}

// 获取精选图片列表
export async function getFeaturedImages(comicName: string): Promise<FeaturedImage[]> {
  const featuredData = await readFeatured(comicName);
  // 按时间倒序排列（最新的在前）
  return featuredData.images.sort((a, b) => 
    new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
  );
}

// 检查图片是否已被精选
export async function isFeatured(comicName: string, imageKey: string): Promise<boolean> {
  const featuredData = await readFeatured(comicName);
  return featuredData.images.some(img => img.imageKey === imageKey);
}
