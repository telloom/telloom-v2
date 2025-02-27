/**
 * File: app/api/auth/forgot-password/route.ts
 * Description: API route for handling password reset requests using Supabase and Loops.so
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { sendPasswordResetEmail } from '@/utils/loops';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    console.log(`[API] Processing password reset request for email: ${email.substring(0, 3)}...`);

    // Create Supabase client
    const supabase = createClient();
    
    // First, check if the user exists using the admin client
    const adminClient = createAdminClient();
    
    // Use the correct method to check if the user exists
    const { data, error: userError } = await adminClient
      .from('Profile')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    
    // For security reasons, we always return success regardless of whether the user exists
    // This prevents user enumeration attacks
    
    // Generate a password reset token only if the user exists
    if (data) {
      console.log(`[API] User found, generating password reset token`);
      
      // For PKCE flow, we need to ensure the redirectTo URL is properly formatted
      // The URL should point to our reset-password page
      const resetUrl = new URL('/reset-password', process.env.NEXT_PUBLIC_SITE_URL);
      
      // Use Supabase's built-in email service with PKCE flow
      const { data: resetData, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: resetUrl.toString(),
      });

      if (error) {
        console.error('[API] Supabase reset password error:', error);
        // Still return success for security reasons
      } else {
        console.log('[API] Password reset email sent successfully via Supabase');
        
        // Option 2: Use Loops.so for sending the email
        // Note: You would need to disable Supabase Auth emails in the Supabase dashboard
        // and uncomment the code below to use Loops.so
        
        /*
        // For PKCE flow, Supabase will generate a token_hash that will be included in the email
        // We can extract this from the resetData if needed for custom emails
        
        // Construct the reset link - for PKCE flow, Supabase will handle the token_hash
        const resetLink = resetUrl.toString();
        
        // Send the email using Loops.so
        await sendPasswordResetEmail(
          email, 
          resetLink
        );
        
        console.log('[API] Password reset email sent successfully via Loops.so');
        */
      }
    } else {
      console.log(`[API] No user found with email ${email.substring(0, 3)}..., skipping password reset`);
    }

    // Always return success to prevent user enumeration
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('[API] Forgot password error:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    );
  }
}