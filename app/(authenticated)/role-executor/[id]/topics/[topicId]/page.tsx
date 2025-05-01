// This is a server component - no "use client" directive
export const runtime = 'nodejs';

import React, { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { Loader2 } from 'lucide-react';
// import { getHeader } from '@/utils/next-cookies-helper'; // Removed
import ExecutorTopicPageClient from './ExecutorTopicPageClient';
// Removed Json from database.types import
// Removed ProfileExecutor, PromptCategory, PersonTag from types/models import

// Removed Avatar, AvatarFallback, AvatarImage import

// Removed fetchTopicDetails, fetchAttachmentUrls import

// Removed Profile, ProfileSharer import

// Removed SupabaseDatabase type import if Database is also unused, otherwise remove SupabaseDatabase from the type import
// import type { Database as SupabaseDatabase } from '@/lib/database.types';

import { ExecutorSharerHeader } from '@/components/executor/ExecutorSharerHeader';
import { BackButton } from '@/components/ui/BackButton';

// Remove unused ProfileSharerRow type alias
// type ProfileSharerRow = Database['public']['Tables']['ProfileSharer']['Row'];

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

// Type definitions for the page props
interface ExecutorTopicPageProps {
  params: {
    id: string; // Sharer ID
    topicId: string;
  };
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
    <div className="container mx-auto px-4 py-6 md:px-6 lg:px-8 max-w-7xl">
      {/* Back Button - Add small bottom margin */}
      <div className="mb-4"> 
        <BackButton />
      </div>
       
      {/* Executor Header - Add minimal/no bottom margin */}
      <div className="mb-1"> {/* Reduced margin significantly */}
        <ExecutorSharerHeader sharerProfile={sharerProfile} />
      </div>

      {/* Suspense for Client Component */}
      <Suspense fallback={
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            <span className="ml-2 text-gray-500">Loading topic content...</span>
          </div>
        }
      >
        <ExecutorTopicPageClient
          targetSharerId={sharerId}
          topicId={topicId}
          initialSharerProfile={sharerProfile} 
        />
      </Suspense>
    </div>
  );
} 