// app/(authenticated)/role-sharer/prompts/[id]/page.tsx
// Remove 'use client' directive
// 'use client';

// Remove client-side hook imports
// import { useEffect, useState } from 'react';
// import { useParams, useRouter } from 'next/navigation';
import { notFound, redirect } from 'next/navigation'; // Keep notFound, add redirect
import { createClient } from '@/utils/supabase/server'; // Use server client
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button"; // Keep for potential use or move later
import { ArrowLeft, Loader2 } from 'lucide-react'; // Keep for potential use or move later
import { VideoResponseSection } from '@/components/prompt-response-section/video-response-section';
// Ensure Profile is imported if used explicitly, otherwise remove if only needed for the type ProfileSharer
import { GetPromptDataResult, GetPromptDataError, Prompt, ProfileSharer, Profile, PromptResponse, Video, PromptResponseAttachment as ModelAttachment, Prompt as ModelPrompt, PromptResponse as ModelPromptResponse, Video as ModelVideo, PromptCategory as ModelPromptCategory } from '@/types/models'; // Keep type imports, added Profile
// Remove useAuth hook import
// import { useAuth } from '@/hooks/useAuth';
import { getUserWithRoleData } from '@/utils/supabase/jwt-helpers'; // Import JWT helper
import { Suspense } from 'react';
import { PageTitle } from '@/components/PageTitle';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
// Import the new client component
import { PromptDisplayClient } from '@/components/prompt-response-section/PromptDisplayClient';
// Add import for the moved ErrorDisplay component
import { ErrorDisplay } from '@/components/ErrorDisplay';

// Remove client-side interface for page data
// interface PromptPageData {
//   prompt: Prompt;
//   profileSharer: ProfileSharer;
//   siblingPrompts?: {
//     previousPrompt: Prompt | null;
//     nextPrompt: Prompt | null;
//   };
// }

// Define interfaces for component props and params
interface PromptPageProps {
  params: {
    id: string; // promptId
  };
}

// Define the detailed Prompt type required by this page and its components
// This composes properties from ModelPrompt but uses the full ModelPromptResponse
// and ModelAttachment types for compatibility with PromptDisplayClient.
interface PromptWithDetails extends Omit<ModelPrompt, 'profileSharerId'> { // Omit the non-existent field
  id: string;
  promptText: string;
  promptTitle: string;
  status: string;
  profileSharerId: string;
  // profileSharerId is NOT directly on Prompt
  promptCategoryId?: string | null;
  createdAt: string;
  updatedAt: string;
  promptType: string;
  isContextEstablishing: boolean;

  // Use the imported full types for relations
  PromptCategory?: ModelPromptCategory | null;
  PromptResponse: Array<ModelPromptResponse & {
    // Add profileSharerId here as it's part of PromptResponse
    profileSharerId: string;
    Video?: ModelVideo & {
      VideoTranscript?: { transcript: string | null }[] | null;
    } | null;
    PromptResponseAttachment?: ModelAttachment[] | null;
  }>;
}

// Placeholder Loading Component
function Loading() {
  return (
    <div className="flex justify-center items-center min-h-screen">
      <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
    </div>
  );
}

// Change function signature to async and accept params directly
export default async function PromptPage({ params }: PromptPageProps) {
  const resolvedParams = await Promise.resolve(params);
  const promptId = resolvedParams.id;

  // console.log(`[PromptPage Server] Rendering prompt page for ID: ${promptId}`);

  // Re-add await because createClient is wrapped in cache(async () => ...)
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    // console.log('[PromptPage Server] No user found or error fetching user. Redirecting to login.');
    redirect('/login');
  }
  // console.log(`[PromptPage Server] User ${user.id.substring(0,8)} authenticated.`);

  const { roleData } = await getUserWithRoleData();

  if (!roleData.roles.includes('SHARER')) {
      // console.log('[PromptPage Server] User does not have SHARER role. Roles:', roleData.roles);
      redirect('/select-role?error=unauthorized');
  }
  // console.log('[PromptPage Server] User has SHARER role.');

  const sharerId = roleData.sharerId;
  if (!sharerId) {
    console.error('[PromptPage Server] Could not find sharer_id for the user.');
     return <ErrorDisplay message="Could not determine your Sharer profile ID." showBackButton={false} />;
  }
  // console.log('[PromptPage Server] Effective Sharer ID:', sharerId);

  if (!promptId || typeof promptId !== 'string') {
    // console.log('[PromptPage Server] Invalid or missing prompt ID in params:', params);
    notFound();
  }
  // console.log('[PromptPage Server] Target prompt ID:', promptId);

  try {
    // --- Fetch Sharer Profile FIRST ---
    let sharerProfile: Profile | null = null;
    try {
      const { data: profileData, error: profileError } = await supabase
        .rpc('get_profile_safe');

      if (profileError) throw new Error(`Sharer profile fetch failed via RPC: ${profileError.message}`);
      if (!profileData) throw new Error('No profile data returned from get_profile_safe RPC.');

      sharerProfile = profileData as Profile;
      // console.log('[PromptPage Server] Successfully fetched sharer profile via RPC.');
    } catch (error: any) {
      console.error('[PromptPage Server] Profile data fetching error via RPC:', error);
      return <ErrorDisplay message={error.message || 'An unexpected error occurred while fetching profile data.'} />;
    }
    
    // Ensure sharerProfile is not null before proceeding (already fetched via RPC)
    if (!sharerProfile) {
        // This case should technically not be hit if the RPC succeeded, but safety first.
        return <ErrorDisplay message="Sharer profile data is missing after successful fetch." />;
  }

    // --- Fetch Prompt Data and Siblings ---
    const { data: prompt, error: promptError } = await supabase
      .from('Prompt')
      // Remove profileSharerId from select - it doesn't exist here
      .select('*, PromptCategory(id, category), PromptResponse(*, profileSharerId, Video(*, VideoTranscript(*)), PromptResponseAttachment(*))')
      .eq('id', promptId)
      .single();

    // Remove the direct log for prompt.profileSharerId as it caused the error
    // console.log(`[PromptPage Server] Fetched prompt.profileSharerId: ${prompt?.profileSharerId}`);

    if (promptError || !prompt) {
      console.error('Error fetching prompt:', promptError);
      // Log the actual error if it exists
      if (promptError) {
        console.error(`Supabase Error: ${promptError.message} (Code: ${promptError.code})`);
      }
      return <ErrorDisplay message="Failed to load prompt details." />;
    }

    // Get the sharer ID from the *first response* if available
    const sharerIdFromResponse = prompt.PromptResponse?.[0]?.profileSharerId;
    console.log(`[PromptPage Server] Derived sharerId from first response: ${sharerIdFromResponse}`);

    // Construct the promptWithDetails object explicitly
    const promptWithDetails: PromptWithDetails = {
      id: prompt.id,
      promptText: prompt.promptText,
      promptTitle: prompt.promptTitle,
      status: prompt.status,
      profileSharerId: sharerId,
      // No profileSharerId here
      promptCategoryId: prompt.promptCategoryId,
      createdAt: prompt.createdAt,
      updatedAt: prompt.updatedAt,
      promptType: prompt.promptType,
      isContextEstablishing: prompt.isContextEstablishing,
      PromptCategory: prompt.PromptCategory as ModelPromptCategory | null,
      PromptResponse: prompt.PromptResponse as Array<ModelPromptResponse & {
        profileSharerId: string; // Ensure this is typed correctly
        Video?: ModelVideo & {
          VideoTranscript?: { transcript: string | null }[] | null;
        } | null;
        PromptResponseAttachment?: ModelAttachment[] | null;
      }>,
    };

    // Construct sharerName from the profile fetched via RPC earlier
    const sharerName = `${sharerProfile.firstName ?? 'Sharer'} ${sharerProfile.lastName ?? ''}`.trim();
    
    // Extract the prompt category name
    const promptCategoryName = prompt.PromptCategory?.category ?? 'Unknown Topic'; // Default name
    console.log('[PromptPage Server] Prompt Category Name:', promptCategoryName); // Log extracted name

    // Fetch sibling prompts (Simplified)
    let previousPromptId: string | null = null;
    let nextPromptId: string | null = null;

    if (promptWithDetails.promptCategoryId) {
  const { data: siblingPrompts, error: siblingError } = await supabase
    .from('Prompt')
          .select('id') // Only select ID
          .eq('promptCategoryId', promptWithDetails.promptCategoryId)
    .order('isContextEstablishing', { ascending: false })
          .order('id'); // Ensure consistent ordering

  if (siblingError) {
          // console.warn('[PromptPage Server] Error fetching sibling prompts:', siblingError);
        } else if (siblingPrompts) {
            const currentIndex = siblingPrompts.findIndex((p) => p.id === promptId);
            if (currentIndex > 0) {
                previousPromptId = siblingPrompts[currentIndex - 1].id;
            }
            if (currentIndex < siblingPrompts.length - 1) {
                nextPromptId = siblingPrompts[currentIndex + 1].id;
            }
            // console.log(`[PromptPage Server] Found sibling IDs: Prev=${previousPromptId}, Next=${nextPromptId}`);
        }
    } else {
        // console.log('[PromptPage Server] Prompt has no category ID, skipping sibling fetch.');
    }

    // --- Rendering Logic --- Pass the derived sharerId to client
    return (
       <Suspense fallback={<Loading />}>
         <PromptDisplayClient
            initialPrompt={promptWithDetails}
            sharerName={sharerName}
            promptCategoryName={promptCategoryName}
            previousPromptId={previousPromptId}
            nextPromptId={nextPromptId}
            sharerIdFromResponse={sharerIdFromResponse} // Pass the ID from the response
            roleContext="SHARER" // Add the missing prop with value "SHARER"
         />
       </Suspense>
    );

  } catch (error) {
    console.error('[PromptPage Server] General error during data fetching or processing:', error);
    // Use the imported ErrorDisplay component
    return <ErrorDisplay message={error instanceof Error ? error.message : 'An unknown error occurred'} />;
  }

  // Remove old client-side rendering logic
  // if (isLoading || authLoading) { ... }
  // if (error) { ... }
  // if (!pageData?.prompt) { ... }
  // const handleBack = () => { ... };
  // const handleNavigateSibling = (siblingPrompt: Prompt | null) => { ... };
  // return ( ... old render logic ... );
}