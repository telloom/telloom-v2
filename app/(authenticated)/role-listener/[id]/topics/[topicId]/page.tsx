// app/(authenticated)/role-listener/[id]/topics/[topicId]/page.tsx
// Server component for displaying a specific topic's details for a Listener.
export const runtime = 'nodejs';

import React, { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { Loader2 } from 'lucide-react';
import ListenerTopicPageClient from './ListenerTopicPageClient'; // Ensured explicit relative path
// import { ListenerSharerHeader } from '@/components/listener/ListenerSharerHeader'; // Removed
// import { BackButton } from '@/components/ui/BackButton'; // Removed
import { getSignedAvatarUrl } from '@/utils/avatar';
import { formatTopicNameForListener } from '@/utils/formatting'; // Import the formatting function
// import { SupabaseClient } from '@supabase/supabase-js'; // Remove or keep based on other usage

interface ListenerTopicPageProps {
  params: {
    id: string; // This is ProfileSharer.id from the route
    topicId: string; // This is PromptCategory.id from the route
  };
}

// Interface for data returned by get_sharer_profile_for_header RPC
interface SharerHeaderRpcData {
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  // Add other fields if the RPC returns more
}

// Interface for data passed to the ListenerSharerHeader component
interface SharerHeaderRenderData {
  id: string; // ProfileSharer.id
  profileId: string; // Profile.id
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}

// Interface for data returned by check_listener_access_rpc RPC
interface ListenerAccessRpcData {
  has_access: boolean; // Expecting the RPC to return a boolean directly or within a structure
}

// Interface for data returned by get_profile_id_for_sharer RPC
// Assuming the RPC returns the profile ID directly or within a structure
// Adjust based on actual RPC output. Example: { profile_id: string }
// If RPC returns profile ID directly, use: type ProfileIdRpcData = string;
type ProfileIdRpcData = string; // Assuming direct return

interface PromptCategoryData {
  category: string;
  description: string | null;
  descriptionListener: string | null;
}

export default async function ListenerTopicPage({ params }: ListenerTopicPageProps) {
  // Ensure params are resolved correctly according to Next.js dynamic route guidelines
  const resolvedParams = await Promise.resolve(params);
  const profileSharerId = resolvedParams.id; // This is ProfileSharer.id
  const topicId = resolvedParams.topicId;

  // Re-add await based on persistent type errors
  const supabase = await createClient(); 
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.error('[ListenerTopicPage] User not authenticated');
    return redirect('/login');
  }

  // 1. Check Listener Access using RPC (SECURITY DEFINER)
  let hasAccess = false;
  try {
    // Assuming RPC 'check_listener_access_rpc' returns a single boolean value directly.
    // If it returns an object like { has_access: boolean }, adjust accordingly.
    const { data: accessData, error: accessError } = await supabase
      .rpc('check_listener_access_rpc', {
        p_listener_id: user.id,
        p_sharer_id: profileSharerId
      })
      .single<boolean>(); // Explicitly type the expected return

    if (accessError) {
      console.error(`[ListenerTopicPage] Error checking listener access for listener ${user.id} to sharer ${profileSharerId}:`, accessError);
      throw accessError;
    }
    // Ensure accessData is treated as boolean, default to false if null/undefined
    hasAccess = accessData === true;

  } catch (error) {
    console.error('[ListenerTopicPage] Failed to verify listener access via RPC:', error);
    return notFound(); // Use notFound for access verification failure or data fetching issues
  }

  if (!hasAccess) {
    console.warn(`[ListenerTopicPage] Access denied for listener ${user.id} to sharer ${profileSharerId}. Redirecting.`);
    // Consider redirecting to a more informative page or back to the listener dashboard
    return redirect('/role-listener?error=access_denied');
  }

  // 2. Fetch Sharer Profile ID and Header Data using RPCs (SECURITY DEFINER)
  let sharerProfileId: string | null = null;
  let sharerHeaderData: SharerHeaderRenderData | null = null;
  let originalCategoryName: string | null = null;
  let displayCategoryName: string | null = null;
  let displayCategoryDescription: string | null = null;
  try {
    // Fetch the Profile.id using the ProfileSharer.id from the route
    const { data: profileIdData, error: profileIdError } = await supabase
        .rpc('get_profile_id_for_sharer', { p_sharer_id: profileSharerId })
        .single<ProfileIdRpcData>(); // Type the expected direct string return

    if (profileIdError) {
      console.error(`[ListenerTopicPage] RPC Error fetching sharer profile ID for Sharer ID ${profileSharerId}:`, profileIdError);
      throw profileIdError;
    }
    if (!profileIdData) {
        // Handle case where RPC returns null/empty (e.g., invalid profileSharerId)
        console.warn(`[ListenerTopicPage] RPC 'get_profile_id_for_sharer' returned no profile ID for Sharer ID: ${profileSharerId}.`);
        return notFound();
    }
    sharerProfileId = profileIdData; // This is the Profile.id

    // Fetch the header display data using the ProfileSharer.id
    const { data: headerRpcData, error: headerRpcError } = await supabase
      .rpc('get_sharer_profile_for_header', { p_sharer_id: profileSharerId })
      .single<SharerHeaderRpcData>(); // Type the expected object return

    if (headerRpcError) {
      console.error(`[ListenerTopicPage] RPC Error fetching sharer profile data for header (Sharer ID ${profileSharerId}):`, headerRpcError);
      // PGRST116 could potentially occur here if the RPC itself fails or returns unexpected rows
      throw headerRpcError;
    }

    if (!headerRpcData) {
        // Handle case where RPC returns null/empty but profile ID was found (unlikely but possible)
        console.warn(`[ListenerTopicPage] RPC 'get_sharer_profile_for_header' returned no data for Sharer ID: ${profileSharerId}`);
        // Might indicate an issue with the RPC logic or underlying profile data
        return notFound();
    }

    // Correctly fetch PromptCategory name using topicId
    const { data: promptCategory, error: categoryError } = await supabase
      .from('PromptCategory')
      .select('category, description, descriptionListener')
      .eq('id', topicId)
      .single<PromptCategoryData>();

    if (categoryError) {
        console.error(`[ListenerTopicPage] Error fetching prompt category name for topicId ${topicId}:`, categoryError);
        throw categoryError; 
    }
    if (!promptCategory) {
        console.warn(`[ListenerTopicPage] No prompt category found for topicId ${topicId}.`);
        return notFound(); 
    }
    originalCategoryName = promptCategory.category;
    displayCategoryName = formatTopicNameForListener(originalCategoryName); // Format the category name
    displayCategoryDescription = promptCategory.descriptionListener || promptCategory.description;

    // Process avatar URL
    const signedAvatarUrl = headerRpcData.avatarUrl
      ? await getSignedAvatarUrl(headerRpcData.avatarUrl)
      : null;

    // Construct data for the header component
    sharerHeaderData = {
      id: profileSharerId,       // ProfileSharer.id (from route params)
      profileId: sharerProfileId, // Profile.id (fetched via RPC)
      firstName: headerRpcData.firstName,
      lastName: headerRpcData.lastName,
      avatarUrl: signedAvatarUrl,
    };

  } catch (error) {
      console.error('[ListenerTopicPage] Overall error fetching sharer header data via RPC:', error);
      // Fallback for any error in the data fetching block
      return notFound();
  }

  // Ensure we have valid IDs before rendering the client component
  // Redundant check as errors/notFound() should have caught this, but safe practice.
  if (!sharerProfileId || !displayCategoryName) {
      console.error(`[ListenerTopicPage] Sanity Check Failed: Missing sharerProfileId or displayCategoryName.`);
      return notFound();
  }


  return (
    <div className="flex flex-col h-full p-4 md:p-6 lg:p-8 container max-w-7xl mx-auto space-y-6">
      {/* <div className="flex items-center justify-between">
        <BackButton />
        {/* Render Header only if data was successfully fetched */}
        {/* {sharerHeaderData ? (
          <ListenerSharerHeader sharerProfile={sharerHeaderData} />
        ) : (
          // Optional: Placeholder or message if header data failed but page should still render
          <div className="text-sm text-muted-foreground">Sharer info unavailable</div>
        )}
      </div> */} {/* This entire header div is removed */}
      <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>}>
        {/* Ensure correct props are passed */}
        <ListenerTopicPageClient
          profileSharerId={profileSharerId}
          sharerProfileId={sharerProfileId}
          topicId={topicId}
          categoryName={displayCategoryName}
          categoryDescription={displayCategoryDescription}
        />
      </Suspense>
    </div>
  );
}



