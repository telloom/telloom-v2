// app/api/auth/user/route.ts

import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createClient();

  try {
    // Use getUser for secure authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Fetch user profile with roles
    const { data: profile, error: profileError } = await supabase
      .from('Profile')
      .select(`
        id,
        firstName,
        lastName,
        email,
        avatarUrl,
        roles:ProfileRole (
          role
        )
      `)
      .eq('id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        ...profile,
        roles: profile.roles?.map((r: any) => r.role) || []
      }
    });

  } catch (error) {
    console.error('Error in auth/user route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}