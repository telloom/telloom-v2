import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function GET(request: Request) {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'This endpoint is only available in development mode' }, { status: 403 });
    }
    
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }
    
    // Create a Supabase client with the service role key for admin operations
    const adminSupabase = createAdminClient();
    
    const results: Record<string, any> = {};
    
    // Query all invitations using admin client
    const { data: allInvitations, error: allInvitationsError } = await adminSupabase
      .from('Invitation')
      .select('*')
      .limit(10);
      
    results.allInvitations = {
      data: allInvitations,
      error: allInvitationsError
    };
    
    // Try to find the invitation using admin client
    const { data: invitation, error: invitationError } = await adminSupabase
      .from('Invitation')
      .select('*')
      .eq('token', token)
      .single();
      
    results.invitation = {
      data: invitation,
      error: invitationError
    };
    
    // Try case-insensitive search with admin client
    const { data: caseInsensitiveResults, error: caseInsensitiveError } = await adminSupabase
      .from('Invitation')
      .select('*')
      .ilike('token', token);
      
    results.caseInsensitiveResults = {
      data: caseInsensitiveResults,
      error: caseInsensitiveError
    };
    
    // Get the invitation to use
    const invitationToUse = invitation || (caseInsensitiveResults && caseInsensitiveResults[0]);
    
    if (!invitationToUse) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }
    
    // Try to get sharer profile information
    let sharer = {
      firstName: 'Unknown',
      lastName: 'Sharer',
      email: 'unknown@example.com'
    };
    
    if (invitationToUse.sharerId) {
      const { data: sharerData, error: sharerError } = await adminSupabase
        .from('ProfileSharer')
        .select(`
          id,
          profileId,
          Profile (
            firstName,
            lastName,
            email
          )
        `)
        .eq('id', invitationToUse.sharerId)
        .single();
        
      results.sharerData = {
        data: sharerData,
        error: sharerError
      };
      
      if (sharerData && sharerData.Profile) {
        const profileData = Array.isArray(sharerData.Profile) 
          ? sharerData.Profile[0] 
          : sharerData.Profile;
          
        sharer = {
          firstName: profileData.firstName || 'Unknown',
          lastName: profileData.lastName || 'Sharer',
          email: profileData.email || 'unknown@example.com'
        };
      }
    }
    
    // Combine invitation and sharer info
    const invitationWithSharer = {
      ...invitationToUse,
      sharer
    };
    
    results.invitationWithSharer = invitationWithSharer;
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error processing invitation:', error);
    return NextResponse.json({ error: 'Failed to process invitation', details: error }, { status: 500 });
  }
} 