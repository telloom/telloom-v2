// lib/data-fetching.ts
/**
 * This module contains server-side functions for fetching data from Supabase.
 * It uses the Supabase server client configured for server-side operations.
 * 
 * As the app evolves, you can expand this module by adding more data fetching functions.
 */

import { createClient } from '@/utils/supabase/server'; // Updated import path
import { PromptCategory, Prompt, Profile } from '@/types/models'; // Adjusted the import to use 'models'

/**
 * Fetches prompt categories from Supabase, including related prompts and responses.
 * @returns {Promise<PromptCategory[]>} An array of prompt categories.
 */
export async function fetchPromptCategories(): Promise<PromptCategory[]> {
  const supabase = createClient();

  // Verify authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  console.log('fetchPromptCategories - user:', user, 'error:', authError);

  if (authError || !user) {
    console.log('fetchPromptCategories - No authenticated user');
    return []; // Return empty array instead of throwing
  }

  try {
    const { data: categories, error } = await supabase
      .from('PromptCategory')
      .select(`
        id,
        category,
        description,
        prompts:Prompt (
          id,
          promptText,
          promptType,
          isContextEstablishing,
          promptCategoryId,
          promptResponses:PromptResponse (
            id,
            profileSharerId,
            videoId,
            responseText,
            privacyLevel,
            createdAt,
            updatedAt,
            video:Video (
              id,
              profileSharerId,
              muxPlaybackId,
              duration
            )
          )
        )
      `);

    if (error) {
      console.error('fetchPromptCategories - Supabase error:', error);
      return []; // Return empty array instead of throwing
    }

    return (categories || []).map(category => ({
      id: category.id,
      category: category.category,
      description: category.description,
      prompts: (category.prompts || []).map(prompt => ({
        id: prompt.id,
        promptText: prompt.promptText,
        promptType: prompt.promptType,
        isContextEstablishing: prompt.isContextEstablishing,
        promptCategoryId: prompt.promptCategoryId,
        promptResponses: (prompt.promptResponses || []).map(response => ({
          id: response.id,
          profileSharerId: response.profileSharerId,
          videoId: response.videoId,
          responseText: response.responseText,
          privacyLevel: response.privacyLevel,
          createdAt: response.createdAt ? new Date(response.createdAt) : undefined,
          updatedAt: response.updatedAt ? new Date(response.updatedAt) : undefined,
          video: response.video && {
            id: (response.video as any).id,
            profileSharerId: (response.video as any).profileSharerId,
            muxPlaybackId: (response.video as any).muxPlaybackId,
            duration: (response.video as any).duration,
            promptResponses: [],
            profileSharer: null,
            viewedBy: []
          },
        })),
        videos: (prompt.promptResponses || [])
          .map(r => r.video)
          .filter((v): v is NonNullable<typeof v> => v != null)
          .map(v => ({
            id: (v as any).id,
            profileSharerId: (v as any).profileSharerId,
            muxPlaybackId: (v as any).muxPlaybackId,
            duration: (v as any).duration,
            promptResponses: [],
            profileSharer: null,
            viewedBy: []
          }))
      }))
    }));
  } catch (error) {
    console.error('fetchPromptCategories - Unexpected error:', error);
    return [];
  }
}

/**
 * Fetches the sharer (current authenticated user) information.
 * @returns {Promise<Profile | null>} The sharer's information or null if not authenticated.
 */
export async function fetchSharer(): Promise<Profile | null> {
  const supabase = createClient();

  // Verify authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  console.log('fetchSharer - user:', user, 'error:', authError);

  if (authError || !user) {
    console.log('fetchSharer - No authenticated user');
    return null;
  }

  try {
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
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('fetchSharer - Profile error:', profileError);
      return null;
    }

    if (!profileData) {
      console.log('fetchSharer - No profile found');
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

/**
 * Fetches a random prompt from the database that hasn't been answered by the user.
 * @returns {Promise<Prompt | null>} A random prompt or null if none are available.
 */
export async function fetchRandomPrompt(): Promise<Prompt | null> {
  const supabase = createClient();

  // Verify authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  console.log('fetchRandomPrompt - user:', user, 'error:', authError);

  if (authError || !user) {
    console.log('fetchRandomPrompt - No authenticated user');
    return null;
  }

  try {
    // Fetch prompts that the user hasn't responded to
    const { data: prompts, error } = await supabase
      .from('Prompt')
      .select(`
        id,
        promptText,
        promptType,
        isContextEstablishing,
        promptCategoryId
      `)
      .not('id', 'in', supabase
        .from('PromptResponse')
        .select('promptId')
        .eq('profileSharerId', user.id)
      )
      .limit(50);

    if (error) {
      console.error('fetchRandomPrompt - Supabase error:', error);
      return null;
    }

    if (!prompts || prompts.length === 0) {
      console.log('fetchRandomPrompt - No prompts found');
      return null;
    }

    // Select a random prompt
    const randomIndex = Math.floor(Math.random() * prompts.length);
    const prompt = prompts[randomIndex];

    return {
      id: prompt.id,
      promptText: prompt.promptText,
      promptType: prompt.promptType,
      isContextEstablishing: prompt.isContextEstablishing,
      promptCategoryId: prompt.promptCategoryId,
      promptResponses: [],
      videos: []
    };
  } catch (error) {
    console.error('fetchRandomPrompt - Unexpected error:', error);
    return null;
  }
}