/**
 * File: app/api/auth/reset-password/route.ts
 * Description: API route for handling password reset requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';

// Password validation schema
const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-zA-Z]/, 'Password must include at least one letter')
    .regex(/[0-9]/, 'Password must include at least one number'),
  access_token: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate request body
    const result = resetPasswordSchema.safeParse(body);
    if (!result.success) {
      const errorMessage = result.error.issues.map(issue => issue.message).join(', ');
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    
    const { password, access_token } = result.data;
    
    // Create Supabase client
    const supabase = createClient();
    
    // Set the access token in the session
    const { error: sessionError } = await supabase.auth.setSession({
      access_token,
      refresh_token: '', // Not needed for password reset
    });

    if (sessionError) {
      console.error('Session error:', sessionError);
      return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 401 });
    }
    
    // Update user's password
    const { error } = await supabase.auth.updateUser({ 
      password 
    });

    if (error) {
      console.error('Reset password error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    );
  }
}