/**
 * API endpoint to debug JWT claims
 * This endpoint lets you verify if JWT claims are working correctly
 */
import { createClient } from '@/utils/supabase/server';
import { validateJwtClaims } from '@/utils/supabase/jwt-helpers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Verify user is authenticated
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Validate JWT claims against database
    const validationResult = await validateJwtClaims();
    
    // Return validation results
    return NextResponse.json({
      status: 'success',
      userId: user.id,
      email: user.email,
      validation: validationResult,
      // Add sensitive debug info only in development
      user: process.env.NODE_ENV === 'development' ? user : undefined
    });
  } catch (error) {
    console.error('Error in JWT claims debug endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to validate JWT claims' },
      { status: 500 }
    );
  }
} 