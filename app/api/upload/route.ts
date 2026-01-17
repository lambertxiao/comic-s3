import { NextRequest, NextResponse } from 'next/server';
import { uploadFile } from '@/lib/s3';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const comicName = formData.get('comicName') as string;
    const chapterName = formData.get('chapterName') as string;
    const files = formData.getAll('files') as File[];

    if (!comicName || !chapterName) {
      return NextResponse.json(
        { error: '漫画名和章节名不能为空' },
        { status: 400 }
      );
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: '请至少选择一个文件' },
        { status: 400 }
      );
    }

    const uploadedFiles: string[] = [];
    const errors: string[] = [];

    // 上传所有文件
    for (const file of files) {
      try {
        // 验证文件类型
        if (!file.type.startsWith('image/')) {
          errors.push(`${file.name}: 不是有效的图片文件`);
          continue;
        }

        // 读取文件内容
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 获取文件扩展名
        const fileExtension = file.name.split('.').pop() || 'jpg';
        // 使用原始文件名，或者可以按序号重命名
        const fileName = file.name;

        // 上传到S3
        const key = await uploadFile(
          comicName,
          chapterName,
          fileName,
          buffer,
          file.type
        );

        uploadedFiles.push(key);
      } catch (error: any) {
        errors.push(`${file.name}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      uploaded: uploadedFiles.length,
      total: files.length,
      files: uploadedFiles,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Error in /api/upload:', error);
    return NextResponse.json(
      { error: error.message || '上传失败' },
      { status: 500 }
    );
  }
}
