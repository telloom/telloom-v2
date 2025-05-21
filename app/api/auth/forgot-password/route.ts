/**
 * File: app/api/auth/forgot-password/route.ts
 * Description: API route for handling password reset requests using Supabase and Loops.so
 */

import { NextRequest, NextResponse } from 'next/server';
// Remove the import of createClient from '@/utils/supabase/server'
// import { createClient } from '@/utils/supabase/server'; 
// import { sendPasswordResetEmail } from '@/utils/loops';
import { createAdminClient } from '@/utils/supabase/admin';

// Import createServerClient directly from @supabase/ssr
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    // Log environment variables at the very beginning
    console.log('[API Env Check] NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('[API Env Check] NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    console.log(`[API] Processing password reset request for email: ${email.substring(0, 3)}...`);

    // Create Supabase client by calling createServerClient directly
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    console.log('[API Raw Env Before Direct Call] URL:', supabaseUrl);
    console.log('[API Raw Env Before Direct Call] Key:', supabaseAnonKey);

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[API] Supabase URL or Anon Key is missing directly from process.env for direct call!');
      return NextResponse.json({ error: 'Internal server configuration error (env missing for direct call).' }, { status: 500 });
    }

    const cookieStore = cookies();
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get: async (name: string) => {
            const store = await cookieStore; // Await the captured cookieStore
            return store.get(name)?.value;
          },
          set: async (name: string, value: string, options: CookieOptions) => {
            const store = await cookieStore; // Await the captured cookieStore
            try {
              store.set({ name, value, ...options });
            } catch {
              // The `set` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
          remove: async (name: string, options: CookieOptions) => {
            const store = await cookieStore; // Await the captured cookieStore
            try {
              store.set({ name, value: '', ...options });
            } catch {
              // The `remove` (via set) method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );

    console.log('[API Direct Create] Supabase client created in POST route.');
    console.log('[API Direct Create] typeof supabase:', typeof supabase);
    if (supabase) {
      console.log('[API Direct Create] supabase keys:', Object.keys(supabase));
      console.log('[API Direct Create] typeof supabase.auth:', typeof supabase.auth);
      if (supabase.auth) {
        console.log('[API Direct Create] supabase.auth keys:', Object.keys(supabase.auth));
      } else {
        console.error('[API Direct Create] supabase.auth is undefined or null.');
      }
    } else {
      console.error('[API Direct Create] supabase client is undefined or null after createServerClient() call.');
    }
    
    // First, check if the user exists using the admin client
    const adminClient = createAdminClient();
    
    // Use the correct method to check if the user exists
    const { data } = await adminClient
      .from('Profile')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    
    // For security reasons, we always return success regardless of whether the user exists
    // This prevents user enumeration attacks
    
    // Generate a password reset token only if the user exists
    if (data) {
      console.log(`[API] User found, generating password reset token`);
      
      // Log NEXT_PUBLIC_SITE_URL before using it
      console.log(`[API Check Env] NEXT_PUBLIC_SITE_URL for resetUrl: ${process.env.NEXT_PUBLIC_SITE_URL}`);

      // For PKCE flow, we need to ensure the redirectTo URL is properly formatted
      // The URL should point to our reset-password page
      const resetUrl = new URL('/reset-password', process.env.NEXT_PUBLIC_SITE_URL);
      
      console.log(`[API] Reset URL for email will be: ${resetUrl.toString()}`);

      // Use Supabase's built-in email service with PKCE flow
      // Ensure supabase and supabase.auth are defined before calling this
      if (!supabase || !supabase.auth) {
          console.error('[API] Critical error: supabase or supabase.auth is not initialized before calling resetPasswordForEmail.');
          return NextResponse.json({ error: 'Internal server configuration error (auth module).' }, { status: 500 });
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
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