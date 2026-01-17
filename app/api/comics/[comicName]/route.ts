import { NextResponse } from 'next/server';
import { getChapters } from '@/lib/s3';
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
