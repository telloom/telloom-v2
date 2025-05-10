export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createDirectClient } from '@/utils/supabase/direct-client';
import { validateJwtClaims } from '@/utils/supabase/jwt-helpers';

// Simple function to decode JWT without verification
function decodeJwt(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { error: 'Invalid JWT format' };
    }
    
    // Decode header and payload
    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    
    return { header, payload };
  } catch (error) {
    return { error: `Failed to decode JWT: ${error}` };
  }
}

export async function GET(request: Request) {
  try {
    // Use the direct client for API routes
    const supabase = createDirectClient();
    
    // Extract authorization header from the request
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
    }
    
    // Extract token and use it for auth
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized', details: authError?.message }, { status: 401 });
    }
    
    // Get role data from JWT claims via RPC 
    const { data: roleData, error: roleError } = await supabase.rpc('get_user_role_data');
    
    // Validate JWT claims against database data
    const validationResult = await validateJwtClaims();
    
    // Decode raw JWT token
    const decodedJwt = decodeJwt(token);
    
    // Return all JWT information
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        email_confirmed_at: user.email_confirmed_at,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      app_metadata: user.app_metadata,
      user_metadata: user.user_metadata,
      jwt_claims: roleData,
      full_jwt_data: roleData,
      jwt_validation: validationResult,
      decoded_jwt: decodedJwt,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[DEBUG JWT] Error:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
} 