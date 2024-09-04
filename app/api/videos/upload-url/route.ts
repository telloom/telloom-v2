// app/api/videos/upload-url/route.ts
import { NextResponse } from 'next/server';
import { createUploadUrl } from '@/utils/muxClient';

export async function GET() {
  try {
    const uploadUrl = await createUploadUrl();
    return NextResponse.json({ uploadUrl });
  } catch (error) {
    console.error('Error in upload-url route:', error);
    return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 });
  }
}