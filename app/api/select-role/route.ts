// app/api/select-role/route.ts
// This component handles the API route for selecting a user role

import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';

const roleSchema = z.object({
  role: z.enum(['LISTENER', 'SHARER', 'EXECUTOR']),
});

export async function POST(request: Request) {
  const supabase = createClient();

  // Get the authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parseResult = roleSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { role } = parseResult.data;

    // Verify user has the requested role
    const { data: userRoles, error: roleCheckError } = await supabase
      .from('ProfileRole')
      .select('role')
      .eq('profileId', user.id);

    if (roleCheckError) {
      console.error('Error checking roles:', roleCheckError);
      return NextResponse.json(
        { error: 'Failed to verify roles' },
        { status: 500 }
      );
    }

    // Check if user has the requested role
    const hasRole = userRoles?.some(r => r.role === role);
    if (!hasRole) {
      return NextResponse.json(
        { error: 'You do not have access to this role' },
        { status: 403 }
      );
    }

    // Set the active role in a cookie
    const cookieStore = cookies();
    cookieStore.set('activeRole', role, {
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return NextResponse.json({ success: true, role });
  } catch (error) {
    console.error('Error setting active role:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function GET() {
  const cookieStore = cookies();
  const activeRole = cookieStore.get('activeRole')?.value;

  if (!activeRole) {
    return NextResponse.json({ role: null });
  }

  return NextResponse.json({ role: activeRole });
}