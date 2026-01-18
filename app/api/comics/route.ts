import { NextResponse } from 'next/server';
import { getComicList, getComicCover } from '@/lib/s3';
import { isS3ConnectionError, getFriendlyErrorMessage } from '@/lib/error-utils';

export async function GET() {
  try {
    const comics = await getComicList();
    
    // 为每个漫画获取封面图
    const comicsWithCovers = await Promise.all(
      comics.map(async (comic) => {
        const coverUrl = await getComicCover(comic);
        return {
          name: comic,
          coverUrl,
        };
      })
    );

    return NextResponse.json({ comics: comicsWithCovers });
  } catch (error: any) {
    console.error('Error in /api/comics:', error);
    
    const isS3Err = isS3ConnectionError(error);
    const friendlyMessage = getFriendlyErrorMessage(error);
    
    return NextResponse.json(
      { 
        error: friendlyMessage,
        isS3Error: isS3Err,
        originalError: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: isS3Err ? 503 : 500 }
    );
  }
}
