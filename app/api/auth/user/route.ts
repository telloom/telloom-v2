// app/api/auth/user/route.ts

import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('Getting authenticated user...');
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log('No authenticated user found:', userError);
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    console.log('Found user:', user.id);

    // Fetch user roles
    const { data: roles, error: rolesError } = await supabase
      .from('ProfileRole')
      .select('role')
      .eq('profileId', user.id);

    console.log('Roles query result:', { roles, error: rolesError });

    if (rolesError) {
      console.error('Error fetching roles:', rolesError);
      return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
    }

    return NextResponse.json({
      user: {
        ...user,
        roles: roles?.map(r => r.role) || []
      }
    });

  } catch (error) {
    console.error('Error in auth/user route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}