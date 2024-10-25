// app/api/auth/logout.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server'; // Server-side Supabase client

export async function POST() {
  const supabase = createClient();

  // Sign out the user
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Error signing out:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.redirect('/login');
}