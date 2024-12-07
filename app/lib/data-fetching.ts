// app/lib/data-fetching.ts
// Server-side data fetching functions

import { createClient } from '@/utils/supabase/server';
import { PromptCategory, Prompt, Profile } from '@/types/models';

export async function fetchPromptCategories(): Promise<PromptCategory[]> {
  const supabase = createClient();

  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      console.log('fetchPromptCategories - No authenticated user');
      return [];
    }

    const { data: categories, error } = await supabase
      .from('PromptCategory')
      .select(`
        id,
        category,
        description,
        theme,
        Prompt:Prompt (
          id,
          promptText,
          promptType,
          isContextEstablishing,
          promptCategoryId,
          Video:Video (
            id
          ),
          PromptResponse:PromptResponse (
            id
          )
        )
      `)
      .order('category');

    if (error) {
      console.error('fetchPromptCategories - Supabase error:', error);
      return [];
    }

    return categories.map(category => ({
      ...category,
      prompts: category.Prompt.map(prompt => ({
        ...prompt,
        videos: prompt.Video || [],
        promptResponses: prompt.PromptResponse || []
      }))
    }));
  } catch (error) {
    console.error('fetchPromptCategories - Unexpected error:', error);
    return [];
  }
}

export async function fetchSharer(): Promise<Profile | null> {
  const supabase = createClient();

  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      console.log('fetchSharer - No authenticated user');
      return null;
    }

    const { data: profileData, error: profileError } = await supabase
      .from('Profile')
      .select(`
        id,
        firstName,
        lastName,
        email,
        avatarUrl,
        createdAt,
        updatedAt,
        roles:ProfileRole (
          profileId,
          role
        )
      `)
      .eq('id', session.user.id)
      .single();

    if (profileError || !profileData) {
      console.error('fetchSharer - Profile error:', profileError);
      return null;
    }

    const hasSharerRole = profileData.roles?.some(r => r.role === 'SHARER');
    if (!hasSharerRole) {
      console.log('fetchSharer - User does not have SHARER role');
      return null;
    }

    return {
      id: profileData.id,
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      email: profileData.email,
      avatarUrl: profileData.avatarUrl,
      roles: (profileData.roles || []).map(role => ({
        profileId: role.profileId,
        role: role.role as 'SHARER' | 'LISTENER' | 'EXECUTOR' | 'ADMIN'
      })),
      createdAt: new Date(profileData.createdAt),
      updatedAt: new Date(profileData.updatedAt)
    };
  } catch (error) {
    console.error('fetchSharer - Unexpected error:', error);
    return null;
  }
} 