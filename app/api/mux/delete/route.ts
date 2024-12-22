// app/api/mux/delete/route.ts
// This endpoint handles deleting Mux assets when video records are deleted

import { NextResponse } from 'next/server';
import Mux from '@mux/mux-node';

const muxClient = new Mux({
  tokenId: process.env.MUX_TOKEN_ID || '',
  tokenSecret: process.env.MUX_TOKEN_SECRET || '',
});

export async function POST(request: Request) {
  try {
    const { muxAssetId } = await request.json();

    if (!muxAssetId) {
      return NextResponse.json({ error: 'Missing muxAssetId' }, { status: 400 });
    }

    // Delete the asset from Mux
    await muxClient.video.assets.delete(muxAssetId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting Mux asset:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete Mux asset' },
      { status: 500 }
    );
  }
} 