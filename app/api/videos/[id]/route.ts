import { NextResponse } from 'next/server';
import Mux from '@mux/mux-node';
import { createAdminClient } from '@/utils/supabase/admin';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log('Starting delete process for video:', params.id);

  // Initialize Supabase admin client
  const supabase = createAdminClient();

  // Initialize Mux client
  const muxClient = new Mux({
    tokenId: process.env.MUX_TOKEN_ID || '',
    tokenSecret: process.env.MUX_TOKEN_SECRET || '',
  });

  try {
    // First get the video details
    const { data: video, error: getError } = await supabase
      .from('Video')
      .select('*')
      .eq('id', params.id)
      .single();

    if (getError) {
      console.error('Error getting video:', getError);
      return NextResponse.json({ 
        error: 'Video not found', 
        details: getError 
      }, { status: 404 });
    }

    if (!video) {
      return NextResponse.json({ 
        error: 'Video not found'
      }, { status: 404 });
    }

    console.log('Found video record:', video);

    // If there's a Mux asset ID, try to delete it from Mux
    let muxDeletionError = null;
    if (video.muxAssetId) {
      try {
        console.log('Attempting to delete Mux asset:', video.muxAssetId);
        await muxClient.video.assets.delete(video.muxAssetId);
        console.log('Successfully deleted Mux asset');
      } catch (muxError: any) {
        // If it's a 404, the asset is already gone which is fine
        if (muxError.status === 404) {
          console.log('Mux asset already deleted or not found:', video.muxAssetId);
        } else {
          console.error('Error deleting Mux asset:', muxError);
          muxDeletionError = muxError;
        }
      }
    }

    // Delete the video record
    const { error: deleteError } = await supabase
      .from('Video')
      .delete()
      .eq('id', params.id);

    if (deleteError) {
      console.error('Error deleting video:', deleteError);
      return NextResponse.json({ 
        error: 'Failed to delete video',
        details: deleteError
      }, { status: 500 });
    }

    // If we had a Mux error but database deletion succeeded, include it in the response
    if (muxDeletionError) {
      return NextResponse.json({
        success: true,
        warning: 'Database record deleted but Mux asset deletion failed',
        muxError: muxDeletionError instanceof Error ? muxDeletionError.message : String(muxDeletionError)
      });
    }

    console.log('Successfully deleted video record');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in delete video endpoint:', error);
    return NextResponse.json({
      error: 'Failed to delete video',
      details: error instanceof Error ? {
        message: error.message,
        stack: error.stack
      } : String(error)
    }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log('Starting GET request for video:', params.id);

  // Initialize Supabase admin client
  const supabase = createAdminClient();

  try {
    // Get the video record
    const { data: video, error: getError } = await supabase
      .from('Video')
      .select('*')
      .eq('id', params.id)
      .single();

    if (getError) {
      console.error('Error getting video:', getError);
      return NextResponse.json({ 
        error: 'Video not found', 
        details: getError 
      }, { status: 404 });
    }

    if (!video) {
      return NextResponse.json({ 
        error: 'Video not found'
      }, { status: 404 });
    }

    console.log('Found video record:', video);
    return NextResponse.json(video);
  } catch (error) {
    console.error('Error in get video endpoint:', error);
    return NextResponse.json({
      error: 'Failed to get video',
      details: error instanceof Error ? {
        message: error.message,
        stack: error.stack
      } : String(error)
    }, { status: 500 });
  }
} 