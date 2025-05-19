// app/(authenticated)/role-listener/[id]/topics/page.tsx
// Page to display topics for a specific Sharer that the Listener has access to.

import { createClient } from '@/utils/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { PromptCategory } from '@/types/models'; // Keep original model type
import ListenerTopicsClientWrapper from './ListenerTopicsClientWrapper'; // Import the client wrapper
import { formatTopicNameForListener } from '@/utils/formatting'; // Import the new utility function

// Define a type for the data returned by the get_listener_topic_list RPC function
// (Includes the new boolean fields)
interface ListenerTopicListData {
  id: string;
  category: string;
  description: string | null;
  theme: string | null;
  completed_prompt_count: number;
  total_prompt_count: number;
  is_favorite: boolean;
  is_in_queue: boolean;
}

// Local interface extending PromptCategory for client component use
// This combines the base PromptCategory with the counts from the RPC
interface ListenerTopicCategory extends PromptCategory {
  completedPromptCount?: number;
  totalPromptCount?: number;
  // Add a field for the display-ready category name
  displayName?: string;
}

export default async function ListenerTopicsPage({ 
  params 
}: { 
  params: { 
    id: string // This is ProfileSharer.id
  } 
}) {
  const supabase = await createClient();

  // 1. Resolve Params
  const resolvedParams = await Promise.resolve(params);
  const sharerId = resolvedParams.id;
  if (!sharerId) {
    console.warn('[role-listener/[id]/topics] Sharer ID missing from params.');
    return notFound();
  }

  // 2. Check Authentication
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.log('[role-listener/[id]/topics] User not authenticated, redirecting.');
    return redirect('/login');
  }

  // 3. Fetch Topic Data using RPC (now includes is_favorite and is_in_queue)
  const { data: rpcData, error: rpcError } = await supabase
    .rpc('get_listener_topic_list', {
      p_listener_id: user.id,
      p_sharer_id: sharerId
    });

  if (rpcError) {
    console.error('[role-listener/[id]/topics] Error fetching topic list via RPC:', rpcError);
    // Handle specific errors if needed, e.g., access denied
    if (rpcError.message.includes('Access Denied')) {
      return redirect('/role-listener?error=access_denied');
    }
    throw new Error(`Failed to load topics: ${rpcError.message}`); // Throw for ErrorBoundary
  }

  if (!rpcData) {
    console.warn('[role-listener/[id]/topics] No topic data returned by RPC for sharer:', sharerId);
    // Return empty state or specific message
    // For now, pass an empty array to the client component
  }

  // 4. Transform RPC Data into the Extended Type for the Client Component
  const transformedCategories: ListenerTopicCategory[] = (rpcData || []).map((item: ListenerTopicListData) => ({
    id: item.id,
    category: item.category, // Keep the original category name
    displayName: formatTopicNameForListener(item.category), // Use the formatted name for display
    description: item.description,
    theme: item.theme,
    Prompt: [], // Initialize Prompt array
    // Use the is_favorite and is_in_queue fields from the RPC result
    isFavorite: item.is_favorite, 
    isInQueue: item.is_in_queue,  
    // Add the count fields
    completedPromptCount: item.completed_prompt_count,
    totalPromptCount: item.total_prompt_count,
    // Ensure required PromptCategory fields have defaults
    createdAt: new Date().toISOString(), // Placeholder
    updatedAt: new Date().toISOString(), // Placeholder
  }));

  // 5. Render the Client Wrapper with Transformed Data
  return (
    <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-gray-500 mx-auto mt-10" />}>
      <ListenerTopicsClientWrapper 
        initialPromptCategories={transformedCategories} 
        sharerId={sharerId} 
      />
    </Suspense>
  );
}
