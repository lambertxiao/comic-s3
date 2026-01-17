import { NextResponse } from 'next/server';
import { getComicList } from '@/lib/s3';

export async function GET() {
  try {
    const comics = await getComicList();
    return NextResponse.json({ comics });
  } catch (error) {
    console.error('Error in /api/comics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comics' },
      { status: 500 }
    );
  }
}
