// app/api/mux/delete/route.ts
// This endpoint handles deleting Mux assets when video records are deleted

import Mux from '@mux/mux-node';
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  console.log('[API /api/mux/delete] POST handler started.');

  // Check Mux credentials
  const muxTokenId = process.env.MUX_TOKEN_ID;
  const muxTokenSecret = process.env.MUX_TOKEN_SECRET;
  if (!muxTokenId || !muxTokenSecret) {
    console.error('[API /api/mux/delete] Mux Token ID or Secret not configured in environment variables.');
    return NextResponse.json({ error: 'Mux credentials not configured.' }, { status: 500 });
  }
  console.log('[API /api/mux/delete] Mux credentials seem present.');

  let mux: Mux | undefined;
  try {
    mux = new Mux({ tokenId: muxTokenId, tokenSecret: muxTokenSecret });
    console.log('[API /api/mux/delete] Mux client initialized.');
  } catch (initError: any) {
    console.error('[API /api/mux/delete] Failed to initialize Mux client:', initError);
    return NextResponse.json({ error: 'Failed to initialize Mux client.', details: initError.message }, { status: 500 });
  }

  // Create Supabase client
  let supabase;
  try {
    supabase = createClient();
    console.log('[API /api/mux/delete] Supabase server client created.');
  } catch (supabaseError: any) {
    console.error('[API /api/mux/delete] Failed to create Supabase client:', supabaseError);
    return NextResponse.json({ error: 'Failed to create Supabase client.', details: supabaseError.message }, { status: 500 });
  }

  // Authentication Check
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('[API /api/mux/delete] Auth check performed.');
    if (authError || !user) {
      console.warn('[API /api/mux/delete] Authentication failed:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log(`[API /api/mux/delete] User ${user.id.substring(0,8)} authenticated.`);
  } catch (authCheckError: any) {
    console.error('[API /api/mux/delete] Error during authentication check:', authCheckError);
    return NextResponse.json({ error: 'Authentication check failed.', details: authCheckError.message }, { status: 500 });
  }

  let muxAssetId: string;
  try {
    const body = await request.json();
    muxAssetId = body.muxAssetId;
    if (!muxAssetId) {
      throw new Error('muxAssetId is required in the request body.');
    }
    console.log(`[API /api/mux/delete] Received Mux Asset ID: ${muxAssetId}`);
  } catch (parseError: any) {
    console.error('[API /api/mux/delete] Failed to parse request body:', parseError);
    return NextResponse.json({ error: 'Invalid request body.', details: parseError.message }, { status: 400 });
  }

  // Delete Mux Asset
  try {
    console.log(`[API /api/mux/delete] Attempting to delete Mux asset: ${muxAssetId}`);
    await mux.video.assets.delete(muxAssetId);
    console.log(`[API /api/mux/delete] Successfully deleted Mux asset: ${muxAssetId}`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`[API /api/mux/delete] Error deleting Mux asset ${muxAssetId}:`, error);
    // Check for specific Mux error types if needed
    if (error.type === 'not_found') {
        return NextResponse.json({ error: 'Mux asset not found.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete Mux asset.', details: error.message }, { status: 500 });
  }
} 