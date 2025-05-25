import { createClient } from '@/utils/supabase/server';
// Remove unused import
// import { createAdminClient } from '@/utils/supabase/admin';
import { redirect } from 'next/navigation';
import TopicsTableAll from '@/components/TopicsTableAll';
import { BackButton } from '@/components/ui/BackButton';
import { checkRole } from '@/utils/supabase/server';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// Define the structure of the RPC response from get_user_role_emergency
interface UserRoleInfo {
  roles: string[];
  is_sharer: boolean;
  sharerId: string | null;
  has_executor_relationship: boolean;
  timestamp: string;
}

export default async function TopicsPage(
  // Remove searchParams as it's no longer used
  // {
  //   searchParams
  // }: {
  //   searchParams: { [key: string]: string | string[] | undefined }
  // }
) {
  // console.log('[TOPICS] Starting page render');
  
  // Properly await the searchParams to fix the Next.js warning
  // const resolvedSearchParams = await Promise.resolve(searchParams); // Removed as it's unused
  // const categoryId = typeof resolvedSearchParams.categoryId === 'string' ? resolvedSearchParams.categoryId : undefined; // Removed as it's unused
  
  // Add type for supabase error handling
  let supabaseError: Error | null = null;
  
  try {
    // console.log('[TOPICS] Checking if user has SHARER role');
    
    // Verify user has SHARER role using the safe helper function
    const hasSharerRole = await checkRole('SHARER');
    if (!hasSharerRole) {
      console.warn('[TOPICS] User does not have SHARER role, redirecting to select-role');
      return redirect('/select-role');
    }
    
    // Create regular supabase client and admin client
    const supabase = await createClient();
    // const adminClient = await createAdminClient(); // No longer needed here?
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('[TOPICS] Error getting user:', userError?.message || 'No user found');
      return redirect('/login');
    }
    
    // console.log('[TOPICS] Found authenticated user:', user.id.substring(0, 8));
    
    // Fetch UserRoleInfo to get the correct sharerId (ProfileSharer.id)
    // Ensure you have an RPC function like 'get_user_role_data' or similar
    // that returns the UserRoleInfo structure including the sharerId.
    const { data: roleInfo, error: roleInfoError } = await supabase.rpc(
      'get_user_role_data' // Call without parameters, uses auth.uid() internally
    ) as { data: UserRoleInfo | null; error: any };

    if (roleInfoError) {
      console.error('[TOPICS] Error fetching user role data:', roleInfoError);
      throw new Error(`Failed to fetch user role data: ${roleInfoError.message}`);
    }

    // Check if roleInfo exists, confirms the user is a sharer, and has a ProfileSharer record ID
    if (!roleInfo || !roleInfo.is_sharer || !roleInfo.sharerId) {
      console.error('[TOPICS] User is not a fully configured sharer or role data is incomplete. User ID:', user.id, 'RoleInfo:', roleInfo);
      // Handle missing sharer_id, perhaps redirect or show an error
      return (
        <div className="container max-w-7xl mx-auto px-4 py-8">
          <p className="text-red-600">Error: Your sharer profile is not fully configured. Please contact support or try re-logging.</p>
        </div>
      );
    }
    
    // Use the CORRECT RPC function name (get_user_role_emergency instead of get_user_role_info)
    // We still need the sharer's PROFILE id (which is the user.id here)
    // console.log('[TOPICS] Calling get_user_role_emergency RPC function');
    // const { data: roleInfo, error: roleError } = await adminClient.rpc(
    //   'get_user_role_emergency',
    //   { user_id: user.id }
    // ) as { data: UserRoleInfo | null, error: any };

    // if (roleError) {
    //   console.error('[TOPICS] Error checking roles:', roleError);
    //   throw new Error(`Failed to check user roles: ${roleError.message}`);
    // }

    // if (!roleInfo) {
    //   console.error('[TOPICS] No role info returned');
    //   throw new Error('No role information found for user');
    // }
    
    // console.log('[TOPICS] User role info:', roleInfo);

    // // Verify the user is a sharer - Already done by checkRole
    // if (!roleInfo.is_sharer) {
    //   console.log('[TOPICS] User is not a sharer, redirecting');
    //   return redirect('/select-role');
    // }
    
    // Fetch categories using the new RPC function and the correct sharerId from roleInfo
    // console.log('[TOPICS] Fetching sharer topic list via RPC for user:', user.id, 'using sharerId:', roleInfo.sharerId);
    const { data: topicsData, error: topicsError } = await supabase
      .rpc('get_sharer_topic_list', { p_sharer_profile_id: user.id }); // Use user.id (Profile.id)

    if (topicsError) {
      console.error('[TOPICS] Error fetching sharer topic list:', topicsError);
      throw new Error(`Failed to fetch topics: ${topicsError.message}`);
    }
    
    const fetchedCategories = topicsData || [];

    // Data is already in the desired format (mostly)
    // Map it to the expected prop structure for TopicsTableAll
    const normalizedCategories = fetchedCategories.map((topic: any) => ({
      id: topic.id,
      category: topic.category,
      description: topic.description || '',
      theme: topic.theme || '',
      completedPromptCount: topic.completed_prompt_count, // Use names returned by RPC
      totalPromptCount: topic.total_prompt_count,       // Use names returned by RPC
      isFavorite: topic.is_favorite,                   // Use names returned by RPC
      isInQueue: topic.is_in_queue,                   // Use names returned by RPC
      // Mock Prompt array if needed by downstream components, otherwise remove
      Prompt: [] // Or fetch actual prompts if TopicCard/Table depends on them
    }));

    // Log success for debugging
    // console.log('[TOPICS] Successfully fetched and normalized', normalizedCategories.length, 'categories via RPC');
    
    return (
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <div className="mb-4">
            <BackButton />
        </div>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">All Topics</h1>
        </div>
        
        <div className="mt-8">
          {normalizedCategories && normalizedCategories.length > 0 ? (
            <TopicsTableAll 
              initialPromptCategories={normalizedCategories} // Pass the correctly fetched data
              currentRole="SHARER"
              userId={user.id} // Pass authenticated user's ID (Profile.id)
              sharerId={roleInfo.sharerId} // Pass ProfileSharer.id from roleInfo
            />
          ) : (
            <div className="text-center py-8">
              <p className="text-lg text-gray-600">
                No topics available at the moment. Please try again later.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error('[TOPICS] Error in topics page:', error);
    supabaseError = error instanceof Error ? error : new Error('Unknown error occurred');
    
    // Check if it's an infinite recursion error
    const errorMessage = supabaseError.message;
    if (errorMessage.includes('recursion') || errorMessage.includes('maximum depth')) {
      console.error('[TOPICS] Detected infinite recursion error in database policy');
      
      return (
        <div className="container max-w-7xl mx-auto px-4 py-8">
          <div className="mb-4">
            <BackButton />
          </div>
          <h1 className="text-2xl font-bold">Topics</h1>
          <div className="mt-4 p-4 border border-red-300 bg-red-50 rounded-md">
            <p className="text-red-800">
              There was an issue loading your topics due to a database policy configuration.
              Please try refreshing the page or contact support if the issue persists.
            </p>
          </div>
        </div>
      );
    }
    
    // Check for RPC function errors specifically
    if (errorMessage.includes('function') && errorMessage.includes('not found')) {
      console.error('[TOPICS] Database function not found error:', errorMessage);
      
      return (
        <div className="container max-w-7xl mx-auto px-4 py-8">
          <div className="mb-4">
            <BackButton />
          </div>
          <h1 className="text-2xl font-bold">Topics</h1>
          <div className="mt-4 p-4 border border-yellow-300 bg-yellow-50 rounded-md">
            <p className="text-yellow-800">
              There was an issue with a database function. The system administrator has been notified.
              Please try again later.
            </p>
          </div>
          <Button asChild className="mt-4">
            <Link href="/role-sharer">Return to Dashboard</Link>
          </Button>
        </div>
      );
    }
    
    // General error fallback UI
    return (
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <div className="mb-4">
            <BackButton />
        </div>
        <h1 className="text-2xl font-bold">Topics</h1>
        <p className="mt-4 text-red-600">
          Something went wrong while loading your topics. Please try refreshing the page.
        </p>
        <div className="mt-2 text-sm text-gray-500">
          Error details: {errorMessage.substring(0, 150)}{errorMessage.length > 150 ? '...' : ''}
        </div>
        <Button asChild className="mt-4">
          <Link href="/role-sharer">Return to Dashboard</Link>
        </Button>
      </div>
    );
  }
}
