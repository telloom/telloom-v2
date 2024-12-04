// app/api/select-role/route.ts
// This component handles the API route for selecting a user role

import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const roleSchema = z.object({
  role: z.enum(['LISTENER', 'SHARER']),
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

    // Upsert the role (insert if not exists, update if exists)
    const { error: roleError } = await supabase
      .from('ProfileRole')
      .upsert(
        { profileId: user.id, role },
        { 
          onConflict: 'profileId',
          ignoreDuplicates: false 
        }
      );

    if (roleError) {
      console.error('Role operation error:', roleError);
      return NextResponse.json(
        { error: 'Failed to set role. Please try again.' },
        { status: 500 }
      );
    }

    // For SHARER role, ensure ProfileSharer record exists
    if (role === 'SHARER') {
      const { error: sharerError } = await supabase
        .from('ProfileSharer')
        .upsert(
          { 
            profileId: user.id,
            subscriptionStatus: false 
          },
          { 
            onConflict: 'profileId',
            ignoreDuplicates: true 
          }
        );

      if (sharerError) {
        console.error('Error creating ProfileSharer record:', sharerError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating role:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}