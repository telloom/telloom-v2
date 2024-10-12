// app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const signupSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  password: z.string(),
  phone: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const parseResult = signupSchema.safeParse(await req.json());

  if (!parseResult.success) {
    return NextResponse.json(
      { error: parseResult.error.errors[0].message },
      { status: 400 }
    );
  }

  const { firstName, lastName, email, password, phone } = parseResult.data;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
      data: {
        firstName,
        lastName,
        phone,
      },
    },
  });

  if (signUpError) {
    return NextResponse.json({ error: signUpError.message }, { status: 400 });
  }

  const user = signUpData.user;

  if (user) {
    // Create a profile record
    const { error: profileError } = await supabase.from('Profile').insert({
      id: user.id,
      email: user.email,
      firstName,
      lastName,
      phone,
    });

    if (profileError) {
      console.error('Error inserting into Profile:', profileError);
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }
  }

  return NextResponse.json({ success: true }, { status: 200 });
}