import { NextRequest, NextResponse } from 'next/server';
import { safeDecodeURIComponent } from '@/lib/url-utils';
import { isFeatured } from '@/lib/favorites';

// GET: 检查图片是否已被精选
export async function GET(
  request: NextRequest,
  { params }: { params: { comicName: string } }
) {
  try {
    const comicName = safeDecodeURIComponent(params.comicName);
    const { searchParams } = new URL(request.url);
    const imageKey = searchParams.get('imageKey');
    
    if (!imageKey) {
      return NextResponse.json(
        { error: '缺少图片key' },
        { status: 400 }
      );
    }
    
    const featured = await isFeatured(comicName, imageKey);
    
    return NextResponse.json({ featured });
  } catch (error: any) {
    console.error('Error checking featured:', error);
    return NextResponse.json(
      { error: error.message || '检查精选状态失败' },
      { status: 500 }
    );
  }
}
