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

  console.log('Querying video record...');
  const { data, error } = await supabase
    .from('Video')
    .select('*')
    .eq('muxUploadId', 'WhXBKNEC6dDqMJBpR012vyZzt2PnxwCpemJ77tQCTY3E')
    .single();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Video record:', data);
  }

  // Try updating the record
  console.log('Updating video record...');
  const { data: updateData, error: updateError } = await supabase
    .from('Video')
    .update({
      muxAssetId: 'Akhw0102ougP1drMwFCLNowxWbk9DHl6n3x7bVCffDsj4',
      updatedAt: new Date().toISOString()
    })
    .eq('muxUploadId', 'WhXBKNEC6dDqMJBpR012vyZzt2PnxwCpemJ77tQCTY3E')
    .select()
    .single();

  if (updateError) {
    console.error('Update error:', updateError);
  } else {
    console.log('Updated record:', updateData);
  }
}

main().catch(console.error); 