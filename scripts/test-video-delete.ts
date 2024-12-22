import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );

  console.log('Checking video record...');
  const { data: video, error: videoError } = await supabase
    .from('Video')
    .select('*')
    .eq('id', '493e1ac6-93d2-43a7-805b-48f989ccd1e5')
    .single();

  if (videoError) {
    console.error('Error fetching video:', videoError);
  } else {
    console.log('Video record:', video);
  }

  // Try deleting the record
  console.log('Attempting to delete video...');
  const { error: deleteError } = await supabase
    .from('Video')
    .delete()
    .eq('id', '493e1ac6-93d2-43a7-805b-48f989ccd1e5');

  if (deleteError) {
    console.error('Error deleting video:', deleteError);
  } else {
    console.log('Video deleted successfully');
  }
}

main().catch(console.error); 