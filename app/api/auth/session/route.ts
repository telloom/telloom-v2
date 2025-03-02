import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/utils/supabase/route-handler';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    console.log('[API] GET /api/auth/session - Checking server-side session');
    const supabase = createRouteHandlerClient({ cookies });
    
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        // Check if this is an auth session missing error
        if (error.name === 'AuthSessionMissingError' || error.message?.includes('Auth session missing')) {
          console.log('[API] No auth session found, returning null session');
          return NextResponse.json({ session: null });
        }
        
        // For other errors, log and return 500
        console.error('[API] Error getting user:', error);
        return NextResponse.json({ error: 'Error getting user' }, { status: 500 });
      }
      
      console.log('[API] User check result:', { hasUser: !!user });
      
      return NextResponse.json({ 
        session: user ? {
          user: {
            id: user.id,
            email: user.email,
          }
        } : null 
      });
    } catch (authError: any) {
      // Catch any auth errors and return null session for auth session missing errors
      if (authError.name === 'AuthSessionMissingError' || authError.message?.includes('Auth session missing')) {
        console.log('[API] Auth session missing error caught:', authError.message);
        return NextResponse.json({ session: null });
      }
      
      // For other errors, rethrow to be caught by the outer try/catch
      throw authError;
    }
  } catch (error) {
    console.error('[API] Unexpected error in session endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 