import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// 初始化S3客户端配置
const s3Config: any = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
  // 使用路径风格的URL（path style）- 强制使用path style
  forcePathStyle: true, // 始终使用path style，不使用host style
  // 禁用host前缀（某些兼容S3服务需要）
  disableHostPrefix: true,
  // 配置重试策略
  maxAttempts: parseInt(process.env.AWS_S3_MAX_ATTEMPTS || '3'),
};

// 如果提供了自定义endpoint，则使用它（支持MinIO、阿里云OSS等兼容S3的服务）
if (process.env.AWS_S3_ENDPOINT) {
  s3Config.endpoint = process.env.AWS_S3_ENDPOINT;
}

// 初始化S3客户端
const s3Client = new S3Client(s3Config);

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'comic';

// 获取漫画列表
export async function getComicList(): Promise<string[]> {
  try {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Delimiter: '/',
    });

    const response = await s3Client.send(command);
    const comics = (response.CommonPrefixes || [])
      .map((prefix) => prefix.Prefix?.replace('/', ''))
      .filter((name): name is string => !!name)
      .sort();

    return comics;
  } catch (error: any) {
    console.error('Error fetching comic list:', {
      message: error.message,
      code: error.code,
      name: error.name,
      endpoint: process.env.AWS_S3_ENDPOINT,
      bucket: BUCKET_NAME,
      region: process.env.AWS_REGION,
    });
    throw error;
  }
}

// 获取指定漫画的章节列表
export async function getChapters(comicName: string): Promise<string[]> {
  try {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: `${comicName}/`,
      Delimiter: '/',
    });

    const response = await s3Client.send(command);
    const chapters = (response.CommonPrefixes || [])
      .map((prefix) => {
        const fullPath = prefix.Prefix || '';
        // 移除漫画名前缀，只保留章节名
        const chapterName = fullPath.replace(`${comicName}/`, '').replace('/', '');
        return chapterName;
      })
      .filter((name) => !!name)
      .sort((a, b) => {
        // 尝试按数字排序
        const numA = parseInt(a.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.match(/\d+/)?.[0] || '0');
        return numA - numB;
      });

    return chapters;
  } catch (error: any) {
    console.error('Error fetching chapters:', {
      message: error.message,
      code: error.code,
      name: error.name,
      comicName,
      endpoint: process.env.AWS_S3_ENDPOINT,
      bucket: BUCKET_NAME,
    });
    throw error;
  }
}

// 获取指定章节的图片列表
export async function getChapterImages(
  comicName: string,
  chapterName: string
): Promise<string[]> {
  try {
    const prefix = `${comicName}/${chapterName}/`;
    console.log('Searching for images with prefix:', prefix);
    
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
    });

    const response = await s3Client.send(command);
    
    console.log('S3 response:', {
      keyCount: response.KeyCount,
      contentsCount: response.Contents?.length || 0,
      allKeys: response.Contents?.map(c => c.Key),
    });
    
    const allObjects = response.Contents || [];
    console.log('All objects found:', allObjects.map(o => ({ key: o.Key, size: o.Size })));
    
    const images = allObjects
      .map((object) => object.Key)
      .filter((key): key is string => {
        if (!key) {
          console.log('Filtered out: empty key');
          return false;
        }
        // 过滤掉目录本身，只保留文件
        if (key.endsWith('/')) {
          console.log('Filtered out directory:', key);
          return false;
        }
        // 检查文件扩展名（更宽松的匹配）
        const hasImageExtension = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(key);
        if (!hasImageExtension) {
          console.log('Filtered out (not image):', key);
        }
        return hasImageExtension;
      })
      .sort((a, b) => {
        // 按文件名排序
        const nameA = a.split('/').pop() || '';
        const nameB = b.split('/').pop() || '';
        const numA = parseInt(nameA.match(/\d+/)?.[0] || '0');
        const numB = parseInt(nameB.match(/\d+/)?.[0] || '0');
        return numA - numB;
      });

    console.log('Filtered images:', images);
    return images;
  } catch (error: any) {
    console.error('Error fetching chapter images:', {
      message: error.message,
      code: error.code,
      name: error.name,
      comicName,
      chapterName,
      prefix: `${comicName}/${chapterName}/`,
      endpoint: process.env.AWS_S3_ENDPOINT,
      bucket: BUCKET_NAME,
    });
    throw error;
  }
}

// 获取图片的预签名URL（有效期1小时）
export async function getImageUrl(key: string): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return url;
  } catch (error: any) {
    console.error('Error generating image URL:', {
      message: error.message,
      code: error.code,
      name: error.name,
      key,
      endpoint: process.env.AWS_S3_ENDPOINT,
      bucket: BUCKET_NAME,
    });
    throw error;
  }
}

// 获取漫画封面图
export async function getComicCover(comicName: string): Promise<string | null> {
  try {
    // 只查找封面图（cover.jpg, cover.png等），不再使用第一张图作为默认封面
    const coverNames = ['cover.jpg', 'cover.jpeg', 'cover.png', 'cover.webp'];
    
    for (const coverName of coverNames) {
      const coverKey = `${comicName}/${coverName}`;
      try {
        // 使用ListObjectsV2Command检查文件是否存在
        const listCommand = new ListObjectsV2Command({
          Bucket: BUCKET_NAME,
          Prefix: coverKey,
          MaxKeys: 1,
        });
        const listResponse = await s3Client.send(listCommand);
        
        // 如果找到文件，生成URL
        if (listResponse.Contents && listResponse.Contents.length > 0) {
          const url = await getImageUrl(coverKey);
          return url;
        }
      } catch {
        // 继续尝试下一个
        continue;
      }
    }

    // 如果没有找到封面图，返回 null
    return null;
  } catch (error: any) {
    console.error('Error fetching comic cover:', {
      message: error.message,
      comicName,
    });
    return null;
  }
}

// 上传文件到S3
export async function uploadFile(
  comicName: string,
  chapterName: string | null,
  fileName: string,
  fileBuffer: Buffer,
  contentType: string
): Promise<string> {
  try {
    // 构建S3 key
    // 如果chapterName为空，说明是封面图，路径为: comic/漫画名/文件名
    // 否则路径为: comic/漫画名/章节名/文件名
    const key = chapterName 
      ? `${comicName}/${chapterName}/${fileName}`
      : `${comicName}/${fileName}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    });

    await s3Client.send(command);
    return key;
  } catch (error: any) {
    console.error('Error uploading file:', {
      message: error.message,
      code: error.code,
      name: error.name,
      comicName,
      chapterName,
      fileName,
      endpoint: process.env.AWS_S3_ENDPOINT,
      bucket: BUCKET_NAME,
    });
    throw error;
  }
}
