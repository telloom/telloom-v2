// app/api/videos/upload-url/route.ts
import { NextResponse } from 'next/server';
import { createUploadUrl } from '@/utils/muxClient';

export async function GET() {
  console.log('MUX_ACCESS_TOKEN_ID:', process.env.MUX_ACCESS_TOKEN_ID ? 'Set' : 'Not set');
  console.log('MUX_SECRET_KEY:', process.env.MUX_SECRET_KEY ? 'Set' : 'Not set');
  
  try {
    const { uploadUrl, uploadId } = await createUploadUrl();
    return NextResponse.json({ uploadUrl, uploadId });
  } catch (error) {
    console.error('Error in upload-url route:', error);
    return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 });
  }
}