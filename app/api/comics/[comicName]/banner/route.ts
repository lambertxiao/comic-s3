import { NextRequest, NextResponse } from 'next/server';
import { safeDecodeURIComponent } from '@/lib/url-utils';
import { uploadFile, getComicBanner } from '@/lib/s3';

// GET: 获取Banner图
export async function GET(
  request: NextRequest,
  { params }: { params: { comicName: string } }
) {
  try {
    const comicName = safeDecodeURIComponent(params.comicName);
    const bannerUrl = await getComicBanner(comicName);
    
    return NextResponse.json({ bannerUrl });
  } catch (error: any) {
    console.error('Error fetching banner:', error);
    return NextResponse.json(
      { error: error.message || '获取Banner图失败' },
      { status: 500 }
    );
  }
}

// POST: 上传Banner图
export async function POST(
  request: NextRequest,
  { params }: { params: { comicName: string } }
) {
  try {
    const comicName = safeDecodeURIComponent(params.comicName);
    const formData = await request.formData();
    const bannerFile = formData.get('banner') as File;

    if (!bannerFile) {
      return NextResponse.json(
        { error: '请选择Banner图片文件' },
        { status: 400 }
      );
    }

    if (!bannerFile.type.startsWith('image/')) {
      return NextResponse.json(
        { error: '请选择有效的图片文件' },
        { status: 400 }
      );
    }

    // 读取文件内容
    const arrayBuffer = await bannerFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 获取文件扩展名
    const originalName = bannerFile.name;
    const extension = originalName.split('.').pop()?.toLowerCase() || 'jpg';
    const bannerFileName = `banner.${extension}`;

    // 上传Banner图（chapterName为null表示是Banner图）
    await uploadFile(comicName, null, bannerFileName, buffer, bannerFile.type);

    return NextResponse.json({
      success: true,
      message: 'Banner图上传成功',
    });
  } catch (error: any) {
    console.error('Error uploading banner:', error);
    return NextResponse.json(
      { error: error.message || '上传Banner图失败' },
      { status: 500 }
    );
  }
}
