import { createAdminClient } from '@/utils/supabase/admin';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    const supabase = createAdminClient();

    // First get the profile ID
    const { data: profile, error: profileError } = await supabase
      .from('Profile')
      .select('id')
      .eq('email', email)
      .single();

    if (profileError) {
      console.error('Error finding profile:', profileError);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // Then get their roles
    const { data: roles, error: rolesError } = await supabase
      .from('ProfileRole')
      .select('role')
      .eq('profileId', profile.id);

    if (rolesError) {
      console.error('Error checking roles:', rolesError);
      return NextResponse.json({ error: rolesError.message }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        hasSharerRole: roles?.some(r => r.role === 'SHARER'),
        roles: roles?.map(r => r.role)
      }
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 