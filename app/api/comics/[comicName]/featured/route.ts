import { NextRequest, NextResponse } from 'next/server';
import { safeDecodeURIComponent } from '@/lib/url-utils';
import { getFeaturedImages, addFeaturedImage, removeFeaturedImage, isFeatured } from '@/lib/favorites';
import { getImageUrl } from '@/lib/s3';

// 启用缓存（30秒）
export const revalidate = 30;

// GET: 获取漫画的精选图片列表
export async function GET(
  request: NextRequest,
  { params }: { params: { comicName: string } }
) {
  try {
    const comicName = safeDecodeURIComponent(params.comicName);
    const featuredImages = await getFeaturedImages(comicName);
    
    // 为每个精选图片生成URL
    const imagesWithUrls = await Promise.all(
      featuredImages.map(async (image) => {
        try {
          const imageUrl = await getImageUrl(image.imageKey);
          return {
            ...image,
            imageUrl,
          };
        } catch (error) {
          console.error(`Error generating URL for ${image.imageKey}:`, error);
          return {
            ...image,
            imageUrl: null,
          };
        }
      })
    );
    
    return NextResponse.json({ images: imagesWithUrls });
  } catch (error: any) {
    console.error('Error fetching featured images:', error);
    return NextResponse.json(
      { error: error.message || '获取精选图片失败' },
      { status: 500 }
    );
  }
}

// POST: 添加精选图片
export async function POST(
  request: NextRequest,
  { params }: { params: { comicName: string } }
) {
  try {
    const comicName = safeDecodeURIComponent(params.comicName);
    const body = await request.json();
    const { chapterName, imageKey, imageIndex } = body;
    
    if (!chapterName || !imageKey || imageIndex === undefined) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }
    
    // 检查是否已经精选过
    const alreadyFeatured = await isFeatured(comicName, imageKey);
    if (alreadyFeatured) {
      return NextResponse.json(
        { error: '该图片已被精选', alreadyFeatured: true },
        { status: 400 }
      );
    }
    
    const featuredImage = await addFeaturedImage(
      comicName,
      chapterName,
      imageKey,
      imageIndex
    );
    
    if (!featuredImage) {
      return NextResponse.json(
        { error: '添加失败，该图片可能已被精选' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ featuredImage });
  } catch (error: any) {
    console.error('Error adding featured image:', error);
    return NextResponse.json(
      { error: error.message || '添加精选失败' },
      { status: 500 }
    );
  }
}

// DELETE: 删除精选图片
export async function DELETE(
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
    
    await removeFeaturedImage(comicName, imageKey);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error removing featured image:', error);
    return NextResponse.json(
      { error: error.message || '删除精选失败' },
      { status: 500 }
    );
  }
}
