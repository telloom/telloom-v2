import { createClient } from '@/utils/supabase/server';

export async function getPrompts() {
  const supabase = createClient();
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (!user || userError) {
    throw new Error('Not authenticated');
  }

  // Rest of your code...
} 