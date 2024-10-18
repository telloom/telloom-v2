// File: utils/supabase/admin.ts
// This module exports a function to create a Supabase admin client for server-side operations.

import { createClient } from '@supabase/supabase-js';

export function supabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createClient(supabaseUrl, serviceRoleKey);
}