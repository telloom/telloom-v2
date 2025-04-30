import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from 'lucide-react';
import { VideoResponseSection } from '@/components/prompt-response-section/video-response-section';
import { GetPromptDataResult, GetPromptDataError, Prompt, ProfileSharer, Profile, PromptResponse, Video, PromptResponseAttachment as ModelAttachment, Prompt as ModelPrompt, PromptResponse as ModelPromptResponse, Video as ModelVideo, PromptCategory as ModelPromptCategory } from '@/types/models';
import { getUserWithRoleData } from '@/utils/supabase/jwt-helpers';
import { Suspense } from 'react';
import { PageTitle } from '@/components/PageTitle';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PromptDisplayClient } from '@/components/prompt-response-section/PromptDisplayClient';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { ExecutorSharerHeader } from '@/components/executor/ExecutorSharerHeader';

interface ExecutorPromptPageProps {
  params: {
    id: string; // sharerId
    promptId: string; // promptId
  };
}

interface PromptWithDetails extends Omit<ModelPrompt, 'profileSharerId'> {
  id: string;
  promptText: string;
  promptTitle: string;
  status: string;
  profileSharerId: string;
  promptCategoryId?: string | null;
  createdAt: string;
  updatedAt: string;
  promptType: string;
  isContextEstablishing: boolean;
  PromptCategory?: ModelPromptCategory | null;
  PromptResponse: Array<ModelPromptResponse & {
    profileSharerId: string;
    Video?: ModelVideo & {
      VideoTranscript?: { transcript: string | null }[] | null;
    } | null;
    PromptResponseAttachment?: ModelAttachment[] | null;
  }>;
}

function Loading() {
  return (
    <div className="flex justify-center items-center min-h-screen">
      <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
    </div>
  );
}

export default async function ExecutorPromptPage({ params }: ExecutorPromptPageProps) {
  const resolvedParams = await Promise.resolve(params);
  const sharerId = resolvedParams.id;
  const promptId = resolvedParams.promptId;

  console.log(`[ExecutorPromptPage Server] Rendering prompt page for Sharer ID: ${sharerId}, Prompt ID: ${promptId}`);

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    console.log('[ExecutorPromptPage Server] No user found or error fetching user. Redirecting to login.');
    redirect('/login');
  }
  console.log(`[ExecutorPromptPage Server] User ${user.id.substring(0,8)} authenticated.`);

  const { roleData } = await getUserWithRoleData();
  console.log(`[ExecutorPromptPage Server] Attempting role check. Received roleData:`, JSON.stringify(roleData, null, 2));
  console.log(`[ExecutorPromptPage Server] Checking if roles include EXECUTOR. roles:`, roleData.roles);

  if (!roleData.roles.includes('EXECUTOR')) {
      console.log('[ExecutorPromptPage Server] User does not have EXECUTOR role. Roles:', roleData.roles);
      redirect('/select-role?error=unauthorized');
  }

  console.log('[ExecutorPromptPage Server] User has EXECUTOR role.');

  // Verify the executor has access to *this specific sharer*
  // Use the new executorRelationships field from roleData
  const relationships = roleData.executorRelationships || []; // Use the typed field
  console.log(`[ExecutorPromptPage Server] Checking access. Found relationships:`, JSON.stringify(relationships)); // Log the relationships found
  const hasAccessToSharer = relationships.some(rel => rel.sharerId === sharerId);
  
  if (!hasAccessToSharer) {
      console.log(`[ExecutorPromptPage Server] Executor ${user.id.substring(0,8)} does NOT have access to sharer ${sharerId} based on roleData.relationships. Redirecting.`);
      redirect('/role-executor?error=unauthorized_sharer');
  }
  console.log(`[ExecutorPromptPage Server] Executor has access to Sharer ${sharerId}.`);

  if (!promptId || typeof promptId !== 'string') {
    console.log('[ExecutorPromptPage Server] Invalid or missing prompt ID in params:', params);
    notFound();
  }
  console.log('[ExecutorPromptPage Server] Target prompt ID:', promptId);

  try {
    // --- Fetch Sharer Profile FIRST using RPC --- 
    let sharerProfile: Profile | null = null;
    try {
      // Call the RPC function instead of querying Profile directly
      const { data: profileData, error: profileError } = await supabase
        .rpc('get_sharer_details_for_executor', { p_sharer_id: sharerId })
        .maybeSingle();

      if (profileError) throw new Error(`Sharer profile fetch failed via RPC: ${profileError.message}`);
      if (!profileData) throw new Error(`No profile data returned from get_sharer_details_for_executor RPC for sharer ID: ${sharerId}.`);

      // --- Add type assertion here ---
      const typedProfileData = profileData as {
        profile_id: string;
        profile_first_name: string | null;
        profile_last_name: string | null;
        profile_avatar_url: string | null;
        created_at: string;
        // Add other fields returned by the RPC if necessary
      };
      // ------------------------------

      // Map RPC result to Profile type (adjust mapping as needed)
      sharerProfile = {
        id: typedProfileData.profile_id, // Use typed data
        userId: typedProfileData.profile_id, // Use typed data
        firstName: typedProfileData.profile_first_name,
        lastName: typedProfileData.profile_last_name,
        avatarUrl: typedProfileData.profile_avatar_url,
        createdAt: new Date(typedProfileData.created_at), // Convert string to Date
        updatedAt: null, // Assuming not in RPC result
        email: null, // Assuming not in RPC result
        phone: null, // Assuming not in RPC result
        // Add other Profile fields as needed, possibly with defaults
      } as Profile;

      console.log('[ExecutorPromptPage Server] Successfully fetched sharer profile via RPC.');
    } catch (error: any) {
      console.error('[ExecutorPromptPage Server] Profile data fetching error via RPC:', error);
      return <ErrorDisplay message={error.message || 'An unexpected error occurred while fetching profile data via RPC.'} />;
    }

    // Ensure sharerProfile is not null before proceeding
    if (!sharerProfile) {
      // This case should technically not be hit if the RPC succeeded, but safety first.
      return <ErrorDisplay message="Sharer profile data is missing after successful RPC fetch." />;
    }

    // --- Fetch Prompt Data and Siblings (Should be okay now) ---
    const { data: prompt, error: promptError } = await supabase
      .from('Prompt')
      // Select fields - profileSharerId does not exist directly on Prompt
      .select('*, PromptCategory(id, category), PromptResponse(*, profileSharerId, Video(*, VideoTranscript(*)), PromptResponseAttachment(*))')
      .eq('id', promptId)
      .single();

    if (promptError || !prompt) {
      console.error(`[ExecutorPromptPage Server] Error fetching prompt ${promptId}:`, promptError);
      if (promptError) {
        console.error(`Supabase Error: ${promptError.message} (Code: ${promptError.code})`);
      }
      if (promptError?.code === 'PGRST116') {
          return <ErrorDisplay message={`Prompt not found or you may not have access to view it for this Sharer.`} />;
      }
      return <ErrorDisplay message="Failed to load prompt details." />;
    }

    const sharerIdFromResponse = prompt.PromptResponse?.[0]?.profileSharerId;
    console.log(`[ExecutorPromptPage Server] Derived sharerId from first response: ${sharerIdFromResponse}`);

    const promptWithDetails: PromptWithDetails = {
      id: prompt.id,
      promptText: prompt.promptText,
      promptTitle: prompt.promptTitle,
      status: prompt.status,
      profileSharerId: sharerId,
      promptCategoryId: prompt.promptCategoryId,
      createdAt: prompt.createdAt,
      updatedAt: prompt.updatedAt,
      promptType: prompt.promptType,
      isContextEstablishing: prompt.isContextEstablishing,
      PromptCategory: prompt.PromptCategory as ModelPromptCategory | null,
      PromptResponse: prompt.PromptResponse as Array<ModelPromptResponse & {
        profileSharerId: string;
        Video?: ModelVideo & {
          VideoTranscript?: { transcript: string | null }[] | null;
        } | null;
        PromptResponseAttachment?: ModelAttachment[] | null;
      }>,
    };

    const sharerName = `${sharerProfile.firstName ?? 'Sharer'} ${sharerProfile.lastName ?? ''}`.trim();

    const promptCategoryName = prompt.PromptCategory?.category ?? 'Unknown Topic';
    console.log('[ExecutorPromptPage Server] Prompt Category Name:', promptCategoryName);

    let previousPromptId: string | null = null;
    let nextPromptId: string | null = null;

    if (promptWithDetails.promptCategoryId) {
      const { data: siblingPrompts, error: siblingError } = await supabase
        .from('Prompt')
        .select('id')
        .eq('promptCategoryId', promptWithDetails.promptCategoryId)
        .order('isContextEstablishing', { ascending: false })
        .order('id');

      if (siblingError) {
          console.warn('[ExecutorPromptPage Server] Error fetching sibling prompts:', siblingError);
        } else if (siblingPrompts) {
            const currentIndex = siblingPrompts.findIndex((p) => p.id === promptId);
            if (currentIndex > 0) {
                previousPromptId = siblingPrompts[currentIndex - 1].id;
            }
            if (currentIndex < siblingPrompts.length - 1) {
                nextPromptId = siblingPrompts[currentIndex + 1].id;
            }
            console.log(`[ExecutorPromptPage Server] Found sibling IDs: Prev=${previousPromptId}, Next=${nextPromptId}`);
        }
    } else {
        console.log('[ExecutorPromptPage Server] Prompt has no category ID, skipping sibling fetch.');
    }

    return (
       <Suspense fallback={<Loading />}>
         {/* Remove container wrapper and header */}
         {/* <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6"> */}
            {/* <ExecutorSharerHeader sharerProfile={sharerProfile} /> */}
            <PromptDisplayClient
                initialPrompt={promptWithDetails}
                sharerName={sharerName}
                promptCategoryName={promptCategoryName}
                previousPromptId={previousPromptId}
                nextPromptId={nextPromptId}
                sharerIdFromResponse={sharerIdFromResponse}
                contextSharerId={sharerId}
                roleContext="EXECUTOR"
                sharerProfileHeaderData={sharerProfile} // Pass profile data here
            />
         {/* </div> */}
       </Suspense>
    );

  } catch (error) {
    console.error('[ExecutorPromptPage Server] General error during data fetching or processing:', error);
    return <ErrorDisplay message={error instanceof Error ? error.message : 'An unknown error occurred'} />;
  }
} 