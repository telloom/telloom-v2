// app/api/auth/user/route.ts

import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  try {
    console.log('Getting authenticated user...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log('No authenticated user found:', userError);
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    console.log('Found user:', user.id);

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
          id,
          role
        )
      `)
      .eq('id', user.id)
      .single();

    console.log('Profile query result:', { profile, error: profileError });

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check for SHARER role
    const hasSharerRole = profile.roles?.some(r => r.role === 'SHARER');
    console.log('Has SHARER role:', hasSharerRole);

    return NextResponse.json({
      user: {
        ...user,
        profile: {
          ...profile,
          roles: profile.roles?.map((r: any) => r.role) || []
        }
      }
    });

  } catch (error) {
    console.error('Error in auth/user route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}