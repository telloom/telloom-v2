// app/api/auth/user/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('supabase-access-token')?.value ?? '';
    console.log('Auth user endpoint - Access token present:', !!accessToken);
    
    const supabase = createClient(accessToken);

    // Directly get the user
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    console.log('Auth user endpoint - Get user result:', { 
      hasUser: !!user,
      error: error?.message,
      userId: user?.id,
    });

    if (error || !user) {
      console.error('Auth user endpoint - Error getting user:', error);
      return NextResponse.json(
        { error: error?.message || 'Not authenticated' },
        { status: 401 }
      );
    }

    // Fetch the user's profile from the 'Profile' table
    const { data: profile, error: profileError } = await supabase
      .from('Profile')
      .select('*')
      .eq('id', user.id)
      .single();

    console.log('Auth user endpoint - Get profile result:', {
      hasProfile: !!profile,
      error: profileError?.message,
      profileId: profile?.id,
    });

    if (profileError) {
      console.error('Auth user endpoint - Error getting profile:', profileError);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // Include access token in response for client auth
    const response = { 
      user: {
        ...user,
        access_token: accessToken,
      }, 
      profile 
    };

    console.log('Auth user endpoint - Successful response:', {
      hasUser: !!response.user,
      hasProfile: !!response.profile,
      hasAccessToken: !!response.user.access_token,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Auth user endpoint - Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}