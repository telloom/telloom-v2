import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import Mux from '@mux/mux-node';

// Initialize Mux
const { Video } = new Mux();

// Initialize Supabase client with service role key
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Define Supabase type
type Supabase = SupabaseClient<Database>;

/**
 * Creates a Mux upload and a corresponding video record in the database.
 * @param userId - The ID of the user creating the upload.
 * @param promptId - The ID of the prompt associated with the upload.
 * @param supabase - The Supabase client instance.
 * @returns The upload URL for the Mux uploader.
 */
export async function createMuxUpload(
  userId: string,
  promptId: string,
  supabase: Supabase
): Promise<string> {
  try {
    // Create a new Mux direct upload
    const upload = await Video.Uploads.create({
      cors_origin: '*',
      new_asset_settings: {
        playback_policy: 'public',
      },
    });

    // Insert a new video record into the database
    const { error } = await supabase
      .from('videos')
      .insert({
        user_id: userId,
        mux_upload_id: upload.id,
        prompt_id: promptId,
        status: 'waiting',
      });

    if (error) {
      console.error('Error inserting video record:', error);
      throw new Error('Database insertion failed');
    }

    return upload.url;
  } catch (error) {
    console.error('Error creating Mux upload:', error);
    throw error;
  }
}

/**
 * Finalizes a Mux upload (if needed) and updates the video record in the database.
 * @param uploadId - The Mux upload ID.
 * @returns The finalized asset ID.
 */
export async function finalizeVideoUpload(uploadId: string): Promise<string> {
  try {
    // Finalize the upload (if needed)
    const upload = await Video.Uploads.get(uploadId);

    if (upload.status !== 'asset_created') {
      await Video.Uploads.cancel(uploadId);
    }

    // Get the asset ID
    const assetId = upload.asset_id;

    // Update the video record in the database
    const { error } = await supabaseAdmin
      .from('videos')
      .update({ mux_asset_id: assetId, status: 'asset_created' })
      .eq('mux_upload_id', uploadId);

    if (error) {
      console.error('Error updating video record:', error);
      throw new Error('Database update failed');
    }

    return assetId!;
  } catch (error) {
    console.error('Error finalizing video upload:', error);
    throw error;
  }
}
