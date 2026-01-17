import { NextRequest, NextResponse } from 'next/server';
import { uploadFile } from '@/lib/s3';
import { safeDecodeURIComponent } from '@/lib/url-utils';

export async function POST(
  request: NextRequest,
  { params }: { params: { comicName: string } }
) {
  try {
    const comicName = safeDecodeURIComponent(params.comicName);
    const formData = await request.formData();
    const coverFile = formData.get('cover') as File | null;

    if (!coverFile) {
      return NextResponse.json(
        { error: '请选择封面图' },
        { status: 400 }
      );
    }

    if (!coverFile.type.startsWith('image/')) {
      return NextResponse.json(
        { error: '封面图必须是有效的图片文件' },
        { status: 400 }
      );
    }

    try {
      const arrayBuffer = await coverFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // 获取文件扩展名
      const fileExtension = coverFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const coverFileName = `cover.${fileExtension}`;
      
      // 上传封面图到 comic/漫画名/cover.jpg
      const coverKey = await uploadFile(
        comicName,
        '', // 封面图不需要章节名
        coverFileName,
        buffer,
        coverFile.type
      );
      
      return NextResponse.json({
        success: true,
        coverKey,
        message: '封面图上传成功',
      });
    } catch (error: any) {
      console.error('Error uploading cover:', error);
      return NextResponse.json(
        { error: `上传失败: ${error.message}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error in /api/comics/[comicName]/cover:', error);
    return NextResponse.json(
      { error: error.message || '上传失败' },
      { status: 500 }
    );
  }
}
