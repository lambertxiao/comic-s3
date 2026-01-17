import { NextResponse } from 'next/server';
import { getChapterImages, getImageUrl } from '@/lib/s3';
import { safeDecodeURIComponent } from '@/lib/url-utils';

export async function GET(
  request: Request,
  { params }: { params: { comicName: string; chapterName: string } }
) {
  try {
    const comicName = safeDecodeURIComponent(params.comicName);
    const chapterName = safeDecodeURIComponent(params.chapterName);
    
    console.log('API: Fetching images for:', { 
      raw: { comicName: params.comicName, chapterName: params.chapterName },
      decoded: { comicName, chapterName }
    });
    
    const imageKeys = await getChapterImages(comicName, chapterName);
    
    console.log('Found image keys:', imageKeys.length, imageKeys);
    
    // 为每张图片生成预签名URL
    const images = await Promise.all(
      imageKeys.map(async (key) => {
        const url = await getImageUrl(key);
        return { key, url };
      })
    );

    return NextResponse.json({ images });
  } catch (error: any) {
    console.error('Error in /api/comics/[comicName]/[chapterName]:', {
      error: error.message,
      stack: error.stack,
      params,
    });
    return NextResponse.json(
      { error: error.message || 'Failed to fetch chapter images' },
      { status: 500 }
    );
  }
}
