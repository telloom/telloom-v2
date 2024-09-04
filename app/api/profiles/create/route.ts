import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  const supabase = createClient();
  const { user_id, email } = await request.json();

  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: user_id,
        email: email,
        // Add any other default fields you want to set
      })
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, profile: data });
  } catch (error) {
    console.error('Error creating profile:', error);
    return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
  }
}