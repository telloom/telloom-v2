import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Parse sharerId from URL
  const searchParams = request.nextUrl.searchParams;
  const sharerId = searchParams.get('sharerId');

  // Validate parameters
  if (!sharerId) {
    console.error('[TOPICS API DEBUG] Missing required parameter: sharerId');
    return NextResponse.json(
      { error: 'Missing required parameter: sharerId' },
      { status: 400 }
    );
  }

  try {
    // Authenticate user
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[TOPICS API DEBUG] Authentication error:', authError);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }

    // Check executor relationship using RPC function
    const adminClient = createAdminClient();

    // First, verify executor access to this sharer
    const { data: executorData, error: executorError } = await adminClient.rpc(
      'get_executor_for_user',
      { user_id: user.id }
    );

    if (executorError) {
      console.error('[TOPICS API DEBUG] Error checking executor relationships:', executorError);
      return NextResponse.json(
        { error: 'Failed to verify executor access' },
        { status: 500 }
      );
    }

    const hasAccess = executorData?.executor_relationships?.some(
      (rel: any) => rel.sharerId === sharerId
    );

    if (!hasAccess) {
      console.error('[TOPICS API DEBUG] User does not have executor access to sharer:', sharerId);
      return NextResponse.json(
        { error: 'Access denied to this sharer' },
        { status: 403 }
      );
    }

    // Fetch the specific executor relationship for logging
    const { data: executorRelationship } = await adminClient
      .from('ProfileExecutor')
      .select(`
        id,
        sharerId
      `)
      .eq('executorId', user.id)
      .eq('sharerId', sharerId)
      .single();

    console.log('[TOPICS API DEBUG] Found executor relationship:', executorRelationship);

    // SIMPLIFIED QUERY: Fetch prompt categories with minimal joins to avoid permission issues
    const { data: promptCategories, error: categoriesError } = await adminClient
      .from('PromptCategory')
      .select(`
        id,
        category,
        description,
        theme,
        Prompt (
          id, 
          promptText,
          promptType,
          isContextEstablishing,
          promptCategoryId,
          PromptResponse (
            id,
            videoId
          )
        )
      `)
      .order('category');

    if (categoriesError) {
      console.error('[TOPICS API DEBUG] Error fetching prompt categories:', categoriesError);
      // Return empty data instead of error, so the UI can still render
      console.log('[TOPICS API DEBUG] Continuing with empty categories due to error');
      // Continue with empty categories
    }

    // Fetch favorites and queue items
    const [{ data: favorites, error: favoritesError }, { data: queueItems, error: queueError }] = await Promise.all([
      adminClient
        .from('TopicFavorite')
        .select('promptCategoryId')
        .eq('profileId', user.id)
        .eq('role', 'EXECUTOR')
        .eq('sharerId', sharerId),
      adminClient
        .from('TopicQueueItem')
        .select('promptCategoryId')
        .eq('profileId', user.id)
        .eq('role', 'EXECUTOR')
        .eq('sharerId', sharerId)
    ]);

    if (favoritesError) {
      console.error('[TOPICS API DEBUG] Error fetching favorites:', favoritesError);
    }

    if (queueError) {
      console.error('[TOPICS API DEBUG] Error fetching queue items:', queueError);
    }

    // Create Sets for efficient lookup
    const favoritedIds = new Set(favorites?.map(f => f.promptCategoryId) || []);
    const queuedIds = new Set(queueItems?.map(q => q.promptCategoryId) || []);

    // Transform categories with favorites and queue status
    const transformedCategories = promptCategories?.map(category => {
      // Map the prompts array to match Prompt interface
      const prompts = (category.Prompt || []).map(prompt => ({
        id: prompt.id,
        promptText: prompt.promptText,
        promptType: prompt.promptType,
        isContextEstablishing: prompt.isContextEstablishing,
        promptCategoryId: prompt.promptCategoryId,
        // Use the actual PromptResponse array from the query
        PromptResponse: prompt.PromptResponse || []
      }));

      // Return a properly structured category object
      return {
        id: category.id,
        category: category.category,
        description: category.description,
        theme: category.theme,
        Prompt: prompts,
        isFavorite: favoritedIds.has(category.id),
        isInQueue: queuedIds.has(category.id)
      };
    }) || [];

    // Return the properly structured response
    return NextResponse.json({
      success: true,
      promptCategories: transformedCategories
    });
  } catch (error: any) {
    console.error('[TOPICS API DEBUG] Unexpected error:', error.message);
    return NextResponse.json(
      { error: 'Failed to fetch topics data: ' + error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { action, categoryId, sharerId } = body;

    // Validate parameters
    if (!action || !categoryId || !sharerId) {
      console.error('[TOPICS API DEBUG] Missing required parameters:', { action, categoryId, sharerId });
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Validate action type
    if (!['addFavorite', 'removeFavorite', 'addQueue', 'removeQueue'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action type' },
        { status: 400 }
      );
    }

    // Authenticate user
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[TOPICS API DEBUG] Authentication error:', authError);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }

    // Check executor relationship using RPC function
    const adminClient = createAdminClient();

    // Verify executor access to this sharer
    const { data: executorData, error: executorError } = await adminClient.rpc(
      'get_executor_for_user',
      { user_id: user.id }
    );

    if (executorError) {
      console.error('[TOPICS API DEBUG] Error checking executor relationships:', executorError);
      return NextResponse.json(
        { error: 'Failed to verify executor access' },
        { status: 500 }
      );
    }

    const hasAccess = executorData?.executor_relationships?.some(
      (rel: any) => rel.sharerId === sharerId
    );

    if (!hasAccess) {
      console.error('[TOPICS API DEBUG] User does not have executor access to sharer:', sharerId);
      return NextResponse.json(
        { error: 'Access denied to this sharer' },
        { status: 403 }
      );
    }

    // Perform the requested action
    let result;
    
    if (action === 'addFavorite') {
      // Insert new favorite
      result = await adminClient
        .from('TopicFavorite')
        .insert([{
          profileId: user.id,
          promptCategoryId: categoryId,
          role: 'EXECUTOR',
          sharerId: sharerId
        }]);
    } else if (action === 'removeFavorite') {
      // Delete favorite
      result = await adminClient
        .from('TopicFavorite')
        .delete()
        .eq('profileId', user.id)
        .eq('promptCategoryId', categoryId)
        .eq('role', 'EXECUTOR')
        .eq('sharerId', sharerId);
    } else if (action === 'addQueue') {
      // Insert new queue item
      result = await adminClient
        .from('TopicQueueItem')
        .insert([{
          profileId: user.id,
          promptCategoryId: categoryId,
          role: 'EXECUTOR',
          sharerId: sharerId
        }]);
    } else if (action === 'removeQueue') {
      // Delete queue item
      result = await adminClient
        .from('TopicQueueItem')
        .delete()
        .eq('profileId', user.id)
        .eq('promptCategoryId', categoryId)
        .eq('role', 'EXECUTOR')
        .eq('sharerId', sharerId);
    }

    // Check for errors
    if (result?.error) {
      console.error(`[TOPICS API DEBUG] Error with ${action}:`, result.error);
      return NextResponse.json(
        { error: `Failed to ${action}: ${result.error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully performed ${action}`
    });
  } catch (error: any) {
    console.error('[TOPICS API DEBUG] Unexpected error:', error.message);
    return NextResponse.json(
      { error: 'Failed to process request: ' + error.message },
      { status: 500 }
    );
  }
} 