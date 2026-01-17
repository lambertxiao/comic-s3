import { NextRequest, NextResponse } from 'next/server';
import { getChapters, deleteComic } from '@/lib/s3';
import { safeDecodeURIComponent } from '@/lib/url-utils';

export async function GET(
  request: Request,
  { params }: { params: { comicName: string } }
) {
  try {
    const comicName = safeDecodeURIComponent(params.comicName);
    console.log('API: Decoded comicName:', comicName);
    const chapters = await getChapters(comicName);
    return NextResponse.json({ chapters });
  } catch (error: any) {
    console.error('Error in /api/comics/[comicName]:', {
      error: error.message,
      params: params.comicName,
    });
    return NextResponse.json(
      { error: error.message || 'Failed to fetch chapters' },
      { status: 500 }
    );
  }
}

// DELETE: 删除漫画
export async function DELETE(
  request: NextRequest,
  { params }: { params: { comicName: string } }
) {
  try {
    const comicName = safeDecodeURIComponent(params.comicName);
    
    const deletedCount = await deleteComic(comicName);
    
    return NextResponse.json({ 
      success: true,
      message: `成功删除漫画，共删除 ${deletedCount} 个文件`,
      deletedCount 
    });
  } catch (error: any) {
    console.error('Error deleting comic:', error);
    return NextResponse.json(
      { error: error.message || '删除漫画失败' },
      { status: 500 }
    );
  }
}
