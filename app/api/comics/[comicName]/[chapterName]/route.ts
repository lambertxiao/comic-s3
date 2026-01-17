import { NextRequest, NextResponse } from 'next/server';
import { safeDecodeURIComponent } from '@/lib/url-utils';
import { deleteChapter, getChapterImages, getImageUrl } from '@/lib/s3';

// GET: 获取章节图片列表
export async function GET(
  request: NextRequest,
  { params }: { params: { comicName: string; chapterName: string } }
) {
  try {
    const comicName = safeDecodeURIComponent(params.comicName);
    const chapterName = safeDecodeURIComponent(params.chapterName);
    
    const imageKeys = await getChapterImages(comicName, chapterName);
    
    // 为每个图片生成预签名URL
    const images = await Promise.all(
      imageKeys.map(async (key) => ({
        key,
        url: await getImageUrl(key),
      }))
    );
    
    return NextResponse.json({ images });
  } catch (error: any) {
    console.error('Error fetching chapter images:', error);
    return NextResponse.json(
      { error: error.message || '获取章节图片失败' },
      { status: 500 }
    );
  }
}

// DELETE: 删除章节
export async function DELETE(
  request: NextRequest,
  { params }: { params: { comicName: string; chapterName: string } }
) {
  try {
    const comicName = safeDecodeURIComponent(params.comicName);
    const chapterName = safeDecodeURIComponent(params.chapterName);
    
    const deletedCount = await deleteChapter(comicName, chapterName);
    
    return NextResponse.json({ 
      success: true,
      message: `成功删除章节，共删除 ${deletedCount} 个文件`,
      deletedCount 
    });
  } catch (error: any) {
    console.error('Error deleting chapter:', error);
    return NextResponse.json(
      { error: error.message || '删除章节失败' },
      { status: 500 }
    );
  }
}
