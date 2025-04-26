import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the session
    const { data: { session }, error } = await supabase.auth.getSession();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user roles
    const { data: roles, error: rolesError } = await supabase
      .from('ProfileRole')
      .select('role')
      .eq('profileId', user.id);

    if (rolesError) {
      return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
    }

    return NextResponse.json({ user, roles });
  } catch (error) {
    console.error('Error in auth check:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 