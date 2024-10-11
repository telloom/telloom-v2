// app/api/select-role/route.ts
// This component handles the API route for selecting a user role

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const roleSchema = z.object({
  role: z.enum(['LISTENER', 'SHARER']),
});

export async function POST(req: NextRequest) {
  const access_token = req.cookies.get('sb-access-token')?.value;

  if (!access_token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    global: {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parseResult = roleSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json(
      { error: parseResult.error.errors[0].message },
      { status: 400 }
    );
  }

  const { role } = parseResult.data;

  // Insert into ProfileRole table
  const { error } = await supabase.from('ProfileRole').insert({
    profileId: user.id,
    role,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (role === 'SHARER') {
    // Create a ProfileSharer record
    const { error: sharerError } = await supabase.from('ProfileSharer').insert({
      profileId: user.id,
      subscriptionStatus: false,
    });

    if (sharerError) {
      return NextResponse.json({ error: sharerError.message }, { status: 400 });
    }
  }

  return NextResponse.json({ success: true }, { status: 200 });
}