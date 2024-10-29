// Route: /api/avatars/get-avatar
// Generates a signed URL for accessing avatar images from Supabase storage

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/utils/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createClient();

  const { path } = req.query;

  if (!path || typeof path !== 'string') {
    return res.status(400).json({ error: 'Invalid path' });
  }

  // Get the authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Generate a signed URL
  const { data, error } = await supabase.storage
    .from('avatars')
    .createSignedUrl(path, 60); // URL valid for 60 seconds

  if (error || !data) {
    return res.status(500).json({ error: 'Error generating signed URL' });
  }

  // Redirect to the signed URL
  res.redirect(data.signedUrl);
}