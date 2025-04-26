import { createDirectClient } from '@/utils/supabase/direct-client';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    console.log('[API] Session route called');
    
    // Extract the authorization header
    const authHeader = request.headers.get('Authorization');
    console.log('[API] Authorization header:', authHeader ? 'present' : 'missing');
    
    // Create a direct client
    const supabase = createDirectClient();
    
    // If we have a token, use it
    let sessionResult;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      console.log('[API] Using token from Authorization header');
      sessionResult = await supabase.auth.getSession();
    } else {
      // Try getting the session without a token
      console.log('[API] No token provided, trying to get session');
      sessionResult = await supabase.auth.getSession();
    }
    
    const { data: { session }, error } = sessionResult;

    if (error) {
      console.error('[API] Error getting session:', error.message);
      return NextResponse.json(
        { error: 'Failed to get session', details: error.message },
        { status: 500 }
      );
    }

    console.log('[API] Session retrieved successfully:', { hasSession: !!session });
    return NextResponse.json({ 
      session,
      source: 'api/auth/session',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[API] Error in session route:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
} 