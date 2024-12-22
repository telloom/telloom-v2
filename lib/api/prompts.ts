import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function getPrompts() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (!user || userError) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('Prompt')
    .select(`
      id,
      promptText,
      promptType,
      isContextEstablishing,
      promptCategoryId,
      videos (
        id,
        profileSharerId,
        muxPlaybackId
      ),
      promptResponses (
        id,
        profileSharerId,
        responseText
      )
    `);

  if (error) throw error;
  return data;
} 