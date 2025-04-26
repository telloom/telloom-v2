// app/api/auth/login/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/utils/supabase/route-handler';

export async function POST(request: NextRequest) {
  try {
    console.log('[API] Login route called');
    
    // Parse request body
    let email, password;
    try {
      const body = await request.json();
      email = body.email;
      password = body.password;
      
      if (!email || !password) {
        return NextResponse.json({ 
          error: 'Missing required fields', 
          details: 'Email and password are required' 
        }, { status: 400 });
      }
    } catch (parseError) {
      console.error('[API] Error parsing request body:', parseError);
      return NextResponse.json({ 
        error: 'Invalid request format', 
        details: String(parseError) 
      }, { status: 400 });
    }

    // Create route handler client
    const supabase = await createRouteHandlerClient();

    // Attempt to sign in
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('[API] Login error:', error.message);
        return NextResponse.json({ 
          error: error.message, 
          code: error.code 
        }, { status: 401 });
      }

      // Verify the user is authenticated
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          console.error('[API] Authentication verification failed:', userError?.message);
          return NextResponse.json({ 
            error: 'Authentication failed', 
            details: userError?.message 
          }, { status: 401 });
        }

        console.log('[API] Login successful for user:', user.email);
        return NextResponse.json({ 
          success: true,
          userId: user.id,
          timestamp: new Date().toISOString() 
        });
      } catch (userError) {
        console.error('[API] Error verifying user after login:', userError);
        return NextResponse.json({ 
          error: 'Error verifying user', 
          details: String(userError) 
        }, { status: 500 });
      }
    } catch (authError) {
      console.error('[API] Auth error in login:', authError);
      return NextResponse.json({ 
        error: 'Authentication service error', 
        details: String(authError) 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[API] Unhandled error in login route:', error);
    return NextResponse.json(
      { error: 'Server error', details: String(error) },
      { status: 500 }
    );
  }
}