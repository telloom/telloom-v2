// app/api/videos/upload-url/route.ts
import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
  try {
    const MUX_TOKEN_ID = process.env.MUX_ACCESS_TOKEN_ID;
    const MUX_TOKEN_SECRET = process.env.MUX_SECRET_KEY;

    if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
      throw new Error('Mux credentials are not set');
    }

    const muxClient = axios.create({
      baseURL: 'https://api.mux.com',
      auth: {
        username: MUX_TOKEN_ID,
        password: MUX_TOKEN_SECRET,
      },
    });

    const response = await muxClient.post('/video/v1/uploads', {
      cors_origin: process.env.NEXT_PUBLIC_APP_URL || '*',
      new_asset_settings: {
        playback_policy: ['public'],
      },
    });

    return NextResponse.json({ uploadUrl: response.data.data.url });
  } catch (error) {
    console.error('Error creating upload URL:', error);
    return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 });
  }
}