import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
    
    // Verify the user after exchange
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.redirect(new URL('/', request.url));
} 