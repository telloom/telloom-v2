import { createAdminClient } from '@/utils/supabase/admin';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    const supabase = createAdminClient();

    const { data: profile, error } = await supabase
      .from('Profile')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      console.error('Error checking profile:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: profile });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 