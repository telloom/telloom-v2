/**
 * File: app/api/test/create-invitation/route.ts
 * Description: Test API endpoint to create a test invitation for debugging purposes
 * This endpoint is only available in development mode
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
  // Only allow in development mode
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'This endpoint is only available in development mode' }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const email = url.searchParams.get('email') || 'test@example.com';
    const role = url.searchParams.get('role') || 'LISTENER';
    
    // Create admin client to bypass RLS
    const adminSupabase = createAdminClient();
    
    // Get a sharer to use for the invitation
    const { data: sharers, error: sharerError } = await adminSupabase
      .from('ProfileSharer')
      .select('id, Profile!inner(id, firstName, lastName, email)')
      .limit(1);
      
    if (sharerError || !sharers || sharers.length === 0) {
      return NextResponse.json({ 
        error: 'No sharers found in the database',
        details: sharerError
      }, { status: 404 });
    }
    
    const sharer = sharers[0];
    
    // Create a new invitation
    const token = uuidv4();
    const now = new Date().toISOString();
    
    const { data: invitation, error: invitationError } = await adminSupabase
      .from('Invitation')
      .insert({
        sharerId: sharer.id,
        inviterId: sharer.Profile.id,
        inviteeEmail: email,
        role: role as 'LISTENER' | 'EXECUTOR',
        status: 'PENDING',
        token: token,
        createdAt: now,
        updatedAt: now,
        emailSent: true
      })
      .select()
      .single();
      
    if (invitationError) {
      return NextResponse.json({ 
        error: 'Failed to create invitation',
        details: invitationError
      }, { status: 500 });
    }
    
    // Generate invitation URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const invitationUrl = `${baseUrl}/invitation/accept?token=${token}`;
    
    return NextResponse.json({
      success: true,
      invitation,
      sharer: {
        id: sharer.id,
        firstName: sharer.Profile.firstName,
        lastName: sharer.Profile.lastName,
        email: sharer.Profile.email
      },
      invitationUrl
    });
  } catch (error) {
    console.error('Error creating test invitation:', error);
    return NextResponse.json({ 
      error: 'Failed to create test invitation',
      details: error
    }, { status: 500 });
  }
} 