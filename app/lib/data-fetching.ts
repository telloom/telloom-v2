// app/lib/data-fetching.ts
// Server-side data fetching functions

import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { getAuthenticatedUser } from '@/utils/auth';

export async function fetchUserData() {
  const user = await getAuthenticatedUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Now use the verified user.id for queries
  const { data, error } = await supabase
    .from('your_table')
    .select('*')
    .eq('user_id', user.id);

  if (error) throw error;
  return data;
}

export async function fetchPromptCategories(): Promise<PromptCategory[]> {
  console.log('\n[SERVER] ====== fetchPromptCategories START ======');
  
  const supabase = createClient();
  console.log('[SERVER] Created Supabase client');

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('[SERVER] Auth check:', { 
      hasUser: !!user,
      userId: user?.id,
      error: userError 
    });
    
    if (userError || !user) {
      console.log('[SERVER] No authenticated user');
      return [];
    }

    console.log('[SERVER] Fetching categories for user:', user.id);

    // First, get the user's favorites and queue items
    const [{ data: favorites }, { data: queueItems }] = await Promise.all([
      supabase
        .from('TopicFavorite')
        .select('promptCategoryId')
        .eq('profileId', user.id),
      supabase
        .from('TopicQueueItem')
        .select('promptCategoryId')
        .eq('profileId', user.id)
    ]);

    console.log('[SERVER] User preferences:', {
      favorites: favorites?.map(f => f.promptCategoryId),
      queueItems: queueItems?.map(q => q.promptCategoryId)
    });

    // Create Sets for efficient lookup
    const favoritedIds = new Set(favorites?.map(f => f.promptCategoryId) || []);
    const queuedIds = new Set(queueItems?.map(q => q.promptCategoryId) || []);

    const { data: categories, error } = await supabase
      .from('PromptCategory')
      .select(`
        id,
        category,
        description,
        theme,
        prompts:Prompt (
          id,
          promptText,
          promptType,
          isContextEstablishing,
          promptCategoryId,
          videos:Video (
            id,
            profileSharerId,
            muxPlaybackId,
            duration
          ),
          promptResponses:PromptResponse (
            id,
            profileSharerId,
            videoId,
            responseNotes,
            privacyLevel,
            createdAt,
            updatedAt
          )
        )
      `)
      .order('category');

    if (error) {
      console.error('[SERVER] Supabase error:', error);
      return [];
    }

    console.log('[SERVER] Raw categories data:', JSON.stringify(categories, null, 2));

    const transformedCategories = categories.map(category => ({
      id: category.id,
      category: category.category,
      description: category.description,
      theme: category.theme,
      isFavorite: favoritedIds.has(category.id),
      isInQueue: queuedIds.has(category.id),
      prompts: (category.prompts || []).map(prompt => ({
        id: prompt.id,
        promptText: prompt.promptText,
        promptType: prompt.promptType,
        isContextEstablishing: prompt.isContextEstablishing,
        promptCategoryId: prompt.promptCategoryId,
        videos: prompt.videos || [],
        promptResponses: prompt.promptResponses || []
      }))
    }));

    console.log('[SERVER] Transformed categories:', 
      transformedCategories.map(c => ({
        id: c.id,
        category: c.category,
        isFavorite: c.isFavorite,
        isInQueue: c.isInQueue,
        promptCount: c.prompts.length
      }))
    );

    console.log('[SERVER] ====== fetchPromptCategories END ======\n');
    return transformedCategories;
  } catch (error) {
    console.error('[SERVER] Unexpected error:', error);
    return [];
  }
}

export async function fetchSharer(): Promise<Profile | null> {
  const supabase = createClient();

  // Verify authentication
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  console.log('fetchSharer - user:', user, 'error:', userError);

  if (userError || !user) {
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

export async function fetchRandomPrompt(): Promise<Prompt | null> {
  const supabase = createClient();

  // Verify authentication
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  console.log('fetchRandomPrompt - user:', user, 'error:', userError);

  if (userError || !user) {
    console.log('fetchRandomPrompt - No authenticated user');
    return null;
  }

  try {
    // Get all prompts and responses in one query
    const { data: prompts, error: promptError } = await supabase
      .from('Prompt')
      .select(`
        id,
        promptText,
        promptType,
        isContextEstablishing,
        promptCategoryId,
        promptResponses!inner (
          id,
          profileSharerId
        )
      `)
      .neq('promptResponses.profileSharerId', user.id)
      .limit(50);

    if (promptError) {
      console.error('fetchRandomPrompt - Error fetching prompts:', promptError);
      
      // If the error is because there are no responses yet, try getting any prompt
      const { data: anyPrompts, error: anyPromptsError } = await supabase
        .from('Prompt')
        .select(`
          id,
          promptText,
          promptType,
          isContextEstablishing,
          promptCategoryId
        `)
        .limit(50);

      if (anyPromptsError) {
        console.error('fetchRandomPrompt - Error fetching any prompts:', anyPromptsError);
        return null;
      }

      if (!anyPrompts || anyPrompts.length === 0) {
        console.log('fetchRandomPrompt - No prompts found at all');
        return null;
      }

      // Select a random prompt from all available prompts
      const randomIndex = Math.floor(Math.random() * anyPrompts.length);
      const prompt = anyPrompts[randomIndex];

      console.log('fetchRandomPrompt - Selected prompt from all:', prompt.id);

      return {
        id: prompt.id,
        promptText: prompt.promptText,
        promptType: prompt.promptType,
        isContextEstablishing: prompt.isContextEstablishing,
        promptCategoryId: prompt.promptCategoryId,
        promptResponses: [],
        videos: []
      };
    }

    if (!prompts || prompts.length === 0) {
      // If no unanswered prompts found, get any prompt
      const { data: anyPrompts, error: anyPromptsError } = await supabase
        .from('Prompt')
        .select(`
          id,
          promptText,
          promptType,
          isContextEstablishing,
          promptCategoryId
        `)
        .limit(50);

      if (anyPromptsError || !anyPrompts || anyPrompts.length === 0) {
        console.log('fetchRandomPrompt - No prompts found at all');
        return null;
      }

      // Select a random prompt from all available prompts
      const randomIndex = Math.floor(Math.random() * anyPrompts.length);
      const prompt = anyPrompts[randomIndex];

      console.log('fetchRandomPrompt - Selected prompt from all:', prompt.id);

      return {
        id: prompt.id,
        promptText: prompt.promptText,
        promptType: prompt.promptType,
        isContextEstablishing: prompt.isContextEstablishing,
        promptCategoryId: prompt.promptCategoryId,
        promptResponses: [],
        videos: []
      };
    }

    // Select a random prompt from unanswered ones
    const randomIndex = Math.floor(Math.random() * prompts.length);
    const prompt = prompts[randomIndex];

    console.log('fetchRandomPrompt - Selected unanswered prompt:', prompt.id);

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

export async function getTopicFavorites() {
  const supabase = createClient(cookies());
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { favorites: [], queueItems: [] };

  const { data: favorites } = await supabase
    .from('TopicFavorite')
    .select('promptCategoryId')
    .eq('profileId', user.id);

  const { data: queueItems } = await supabase
    .from('TopicQueueItem')
    .select('promptCategoryId')
    .eq('profileId', user.id);

  return {
    favorites: favorites?.map(f => f.promptCategoryId),
    queueItems: queueItems?.map(q => q.promptCategoryId)
  };
}

export async function getPromptResponses() {
  const supabase = createClient(cookies());
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return [];

  const { data: responses } = await supabase
    .from('PromptResponse')
    .select('*')
    .eq('profileId', user.id);

  return responses || [];
}

export async function getVideos() {
  const supabase = createClient(cookies());
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return [];

  const { data: videos } = await supabase
    .from('Video')
    .select('*')
    .eq('profileId', user.id);

  return videos || [];
} 