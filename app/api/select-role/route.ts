// app/api/select-role/route.ts
// This component handles the API route for selecting a user role

import { createRouteHandlerClient } from '@/utils/supabase/route-handler';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';

const roleSchema = z.object({
  role: z.enum(['LISTENER', 'SHARER', 'EXECUTOR']),
});

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient();

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parseResult = roleSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { role } = parseResult.data;

    // Check if the user has this role
    const { data: existingRole } = await supabase
      .from('ProfileRole')
      .select('role')
      .eq('profileId', user.id)
      .eq('role', role)
      .single();

    if (!existingRole) {
      return NextResponse.json(
        { error: 'You do not have access to this role' },
        { status: 403 }
      );
    }

    // Create response with redirect URL
    const response = NextResponse.json({ 
      success: true, 
      redirectUrl: `/role-${role.toLowerCase()}`
    });

    // Set the activeRole cookie
    const cookieStore = await cookies();
    await cookieStore.set('activeRole', role, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return response;
  } catch (error) {
    console.error('Error in select-role route:', error);
    return NextResponse.json({ error: 'Failed to set role' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = createRouteHandlerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ roles: [] });
    }

    // Get all roles for the user
    const { data: roles, error: rolesError } = await supabase
      .from('ProfileRole')
      .select('role')
      .eq('profileId', user.id);

    if (rolesError) {
      console.error('Error fetching roles:', rolesError);
      return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
    }

    return NextResponse.json({ 
      roles: roles?.map(r => r.role) || []
    });
  } catch (error) {
    console.error('Error in get role route:', error);
    return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
  }
}