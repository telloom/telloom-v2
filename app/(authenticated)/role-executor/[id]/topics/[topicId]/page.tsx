// This is a server component - no "use client" directive
export const runtime = 'nodejs';

import React, { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { Loader2 } from 'lucide-react';
import { getHeader } from '@/utils/next-cookies-helper';
import ExecutorTopicPageClient from './ExecutorTopicPageClient';
import type { Database, Json } from '@/lib/database.types';
import { ProfileExecutor, PromptCategory, PersonTag } from '@/types/models';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { fetchTopicDetails, fetchAttachmentUrls } from '@/app/lib/executor-data';
import type { Profile } from '@/types/models';
import type { ProfileSharer } from '@/types/models';
import type { Database as SupabaseDatabase } from '@/lib/database.types';
import { ExecutorSharerHeader } from '@/components/executor/ExecutorSharerHeader';
import { BackButton } from '@/components/ui/BackButton';

// Define the expected structure of the data returned by the RPC function
// Matches the RETURNS TABLE definition in the SQL function
interface SharerDetailsRpcResult {
  sharer_id: string;
  profile_id: string;
  created_at: string; // Timestamps often come back as strings
  subscription_status: boolean | null; // Adjust based on actual column nullability
  profile_first_name: string | null;
  profile_last_name: string | null;
  profile_avatar_url: string | null;
}

// Use the Database type to define the ProfileSharer row type
type ProfileSharerRow = Database['public']['Tables']['ProfileSharer']['Row'];

// Type definitions for the page props
interface ExecutorTopicPageProps {
  params: {
    id: string; // Sharer ID
    topicId: string;
  };
}

function Loading() {
  return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      <p className="ml-2">Loading topic...</p>
    </div>
  );
}

/**
 * Fetches sharer profile details.
 * TEMPORARILY returns 'any' due to issues resolving types from types/supabase.ts
 */
async function getSharerProfile(sharerId: string): Promise<any | null> {
  const supabase = await createClient();

  // Fetch sharer profile details using the RPC function
  const { data: sharerDetailsData, error: rpcError } = await supabase
    .rpc('get_sharer_details_for_executor', { p_sharer_id: sharerId })
    .maybeSingle();

  if (rpcError) {
    console.error('[getSharerProfile] RPC Error fetching sharer details:', rpcError);
    return null;
  }

  if (!sharerDetailsData) {
    console.warn(`[getSharerProfile] Sharer profile not found or access denied for sharerId: ${sharerId}`);
    return null;
  }

  // Assert the type AFTER successful fetch and null check
  const sharerDetails = sharerDetailsData as SharerDetailsRpcResult;

  console.log(`[getSharerProfile] Successfully fetched sharer details for sharerId: ${sharerId}`, sharerDetails);

  // Prepare the initial sharer profile data for the client component
  // Map RPC result fields directly, TEMPORARILY typed as 'any'
  const profileForClient: any = {
    id: sharerDetails.sharer_id,
    profileId: sharerDetails.profile_id,
    subscriptionStatus: sharerDetails.subscription_status,
    createdAt: sharerDetails.created_at,
    updatedAt: null, // Assuming this is not in RPC result, provide default
    firstName: sharerDetails.profile_first_name,
    lastName: sharerDetails.profile_last_name,
    avatarUrl: sharerDetails.profile_avatar_url, // Assuming mapping
    // Add any other fields expected by ExecutorTopicPageClient, potentially as null/defaults
  };

  return profileForClient;
}

// Main server component for the executor's view of a specific topic
export default async function ExecutorTopicPage({ params }: ExecutorTopicPageProps) {
  // 1. Resolve parameters and validate user session
  const resolvedParams = await Promise.resolve(params);
  const sharerId = resolvedParams.id;
  const topicId = resolvedParams.topicId;

  console.log(`[ExecutorTopicPage] Rendering page for Sharer ID: ${sharerId}, Topic ID: ${topicId}`);

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('[ExecutorTopicPage] Auth error or no user found, redirecting to login.', authError);
    redirect('/login');
  }

  // 2. Fetch Sharer details using the RPC function
  console.log(`[ExecutorTopicPage] Calling RPC get_sharer_details_for_executor for sharerId: ${sharerId}`);
  const sharerProfile: any = await getSharerProfile(sharerId);

  if (!sharerProfile) {
    console.log(`[ExecutorTopicPage] Sharer details not found via RPC for sharerId: ${sharerId}. Rendering 404.`);
    // This usually means the sharer ID is invalid or the RPC function denied access/returned no rows.
    notFound();
  }

  console.log(`[ExecutorTopicPage] Successfully fetched sharer details for sharerId: ${sharerId}`);

  // DEBUG: Log the profile object being passed to the header
  console.log('[ExecutorTopicPage] Passing sharerProfile to header:', JSON.stringify(sharerProfile, null, 2));

  // 4. Render the page structure with the client component
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Add the standard BackButton above the header - Remove margin */}
      <BackButton /> 
      
      {/* Use the new ExecutorSharerHeader component */}
      <ExecutorSharerHeader sharerProfile={sharerProfile} />

      <Suspense fallback={
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            <span className="ml-2 text-gray-500">Loading topic content...</span>
          </div>
        }
      >
        {/* Wrap client component and apply negative margin to the wrapper */}
        <div className="-mt-4"> 
          <ExecutorTopicPageClient
            targetSharerId={sharerId}
            topicId={topicId}
            initialSharerProfile={sharerProfile} // Pass the fetched profile (now any)
          />
        </div>
      </Suspense>
    </div>
  );
} 