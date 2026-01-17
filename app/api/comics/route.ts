import { NextResponse } from 'next/server';
import { getComicList, getComicCover } from '@/lib/s3';

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
  } catch (error) {
    console.error('Error in /api/comics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comics' },
      { status: 500 }
    );
  }
}
