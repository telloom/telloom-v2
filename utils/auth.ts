import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function getAuthenticatedUser() {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Auth error:', error);
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('Unexpected auth error:', error);
    return null;
  }
}

export async function getUserRole() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      console.log('No authenticated user found');
      return null;
    }
    
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // First check if the user exists in Profile table
    const { data: profile, error: profileError } = await supabase
      .from('Profile')
      .select('id')
      .eq('id', user.id)
      .single();
      
    if (profileError || !profile) {
      console.error('Profile not found:', { error: profileError, userId: user.id });
      return null;
    }
    
    // Then check for SHARER role
    const { data: roles, error: roleError } = await supabase
      .from('ProfileRole')
      .select('*')
      .eq('profileId', user.id);
      
    if (roleError) {
      console.error('Role fetch error:', roleError);
      return null;
    }
    
    console.log('Found roles:', roles);
    
    const hasSharerRole = roles?.some(role => role.role === 'SHARER');
    return hasSharerRole ? 'SHARER' : null;
  } catch (error) {
    console.error('Unexpected role error:', error);
    return null;
  }
} 