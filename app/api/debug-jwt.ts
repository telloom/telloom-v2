// pages/api/debug-jwt.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Create a Supabase server client with the current request's cookies.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookies().get(name)?.value;
        },
        set(name, value, options) {
          cookies().set({ name, value, ...options });
        },
      },
    }
  );

  try {
    // Use the auth.jwt() function to get the JWT payload.
    const { data: jwtPayload, error } = await supabase.rpc('auth.jwt');
    
    if (error) {
      throw error;
    }
    
    res.status(200).json({ jwt: jwtPayload });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}