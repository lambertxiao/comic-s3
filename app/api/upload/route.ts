import { NextRequest, NextResponse } from 'next/server';
import { uploadFile } from '@/lib/s3';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const comicName = formData.get('comicName') as string;
    const chapterName = formData.get('chapterName') as string;
    const files = formData.getAll('files') as File[];
    const coverFile = formData.get('cover') as File | null;

    if (!comicName || !chapterName) {
      return NextResponse.json(
        { error: '漫画名和章节名不能为空' },
        { status: 400 }
      );
    }

    if ((!files || files.length === 0) && !coverFile) {
      return NextResponse.json(
        { error: '请至少选择一个文件或封面图' },
        { status: 400 }
      );
    }

    const uploadedFiles: string[] = [];
    const errors: string[] = [];
    let coverUploaded = false;

    // 先上传封面图（如果存在）
    if (coverFile) {
      try {
        if (!coverFile.type.startsWith('image/')) {
          errors.push(`封面图 ${coverFile.name}: 不是有效的图片文件`);
        } else {
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
          
          uploadedFiles.push(coverKey);
          coverUploaded = true;
        }
      } catch (error: any) {
        errors.push(`封面图: ${error.message}`);
      }
    }

    // 上传所有章节图片文件
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
      total: files.length + (coverFile ? 1 : 0),
      files: uploadedFiles,
      coverUploaded,
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
