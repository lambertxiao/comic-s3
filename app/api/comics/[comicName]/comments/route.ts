import { NextRequest, NextResponse } from 'next/server';
import { safeDecodeURIComponent } from '@/lib/url-utils';
import { getComments, addComment } from '@/lib/comments';

// 启用缓存（30秒）
export const revalidate = 30;

// GET: 获取漫画级别的评论
export async function GET(
  request: NextRequest,
  { params }: { params: { comicName: string } }
) {
  try {
    const comicName = safeDecodeURIComponent(params.comicName);
    
    // 获取漫画级别评论（chapterName为null）
    const comments = await getComments(comicName, null);
    
    return NextResponse.json({ comments });
  } catch (error: any) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: error.message || '获取评论失败' },
      { status: 500 }
    );
  }
}

// POST: 发表漫画级别的评论
export async function POST(
  request: NextRequest,
  { params }: { params: { comicName: string } }
) {
  try {
    const comicName = safeDecodeURIComponent(params.comicName);
    const body = await request.json();
    
    const { userName, content, parentId } = body;
    
    if (!userName || !content) {
      return NextResponse.json(
        { error: '用户名和评论内容不能为空' },
        { status: 400 }
      );
    }
    
    // 添加评论（chapterName为null表示漫画级别评论）
    const newComment = await addComment(comicName, null, userName, content, parentId || null);
    
    return NextResponse.json({ comment: newComment });
  } catch (error: any) {
    console.error('Error adding comment:', error);
    return NextResponse.json(
      { error: error.message || '发表评论失败' },
      { status: 500 }
    );
  }
}
