import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { topicId: string } }
) {
  console.log('API route called with topicId:', params.topicId);
  
  // Resolve params to avoid Next.js warning
  const resolvedParams = await Promise.resolve(params);
  const topicId = resolvedParams.topicId;
  
  // Get sharerId from query params
  const searchParams = request.nextUrl.searchParams;
  const sharerId = searchParams.get('sharerId');
  
  console.log('Fetching topic with sharerId:', sharerId);
  
  if (!sharerId) {
    console.error('Missing sharerId parameter');
    return NextResponse.json(
      { error: 'Missing sharerId parameter' },
      { status: 400 }
    );
  }

  try {
    // Get authenticated user
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    console.log('Authenticated user:', user.id);
    
    // Use admin client to bypass RLS
    const adminClient = createAdminClient();
    
    // Check if user has executor access to this sharer
    const { data: executorAccess, error: executorError } = await adminClient
      .from('ProfileExecutor')
      .select('*')
      .eq('executorId', user.id)
      .eq('sharerId', sharerId)
      .single();
    
    if (executorError || !executorAccess) {
      console.error('Executor access error:', executorError);
      return NextResponse.json(
        { error: 'You do not have access to this sharer\'s data' },
        { status: 403 }
      );
    }
    
    console.log('Executor access confirmed for sharer:', sharerId);
    
    // Fetch person tags using the new RPC function
    const { data: personTags, error: personTagsError } = await adminClient
      .rpc('get_person_tags_for_sharer', { sharer_id: sharerId });
    
    if (personTagsError) {
      console.error('Error fetching person tags:', personTagsError);
      // Continue without person tags, but log the error
    } else {
      console.log(`Fetched ${personTags?.length || 0} person tags for sharer`);
    }
    
    // Fetch topic category details
    const { data: category, error: categoryError } = await adminClient
      .from('PromptCategory')
      .select(`
        id,
        name,
        description,
        Prompt (
          id,
          text,
          PromptResponse (
            id,
            text,
            createdAt,
            updatedAt,
            PromptResponseAttachment (
              id,
              fileUrl,
              fileType,
              fileName,
              muxAssetId,
              muxPlaybackId
            )
          )
        )
      `)
      .eq('id', topicId)
      .single();
    
    if (categoryError) {
      console.error('Error fetching category:', categoryError);
      return NextResponse.json(
        { error: 'Error fetching topic details' },
        { status: 500 }
      );
    }
    
    // Collect all prompt response IDs to fetch attachment person tags
    const promptResponseIds: string[] = [];
    const attachmentIds: string[] = [];
    
    if (category?.Prompt) {
      category.Prompt.forEach((prompt: any) => {
        if (prompt.PromptResponse) {
          prompt.PromptResponse.forEach((response: any) => {
            promptResponseIds.push(response.id);
            
            if (response.PromptResponseAttachment) {
              response.PromptResponseAttachment.forEach((attachment: any) => {
                attachmentIds.push(attachment.id);
              });
            }
          });
        }
      });
    }
    
    console.log(`Found ${promptResponseIds.length} prompt responses and ${attachmentIds.length} attachments`);
    
    // Fetch attachment person tags using the new RPC function if there are attachments
    let attachmentPersonTags: any[] = [];
    if (attachmentIds.length > 0) {
      const { data: tagData, error: tagError } = await adminClient
        .rpc('get_attachment_person_tags', { attachment_ids: attachmentIds });
      
      if (tagError) {
        console.error('Error fetching attachment person tags:', tagError);
      } else {
        attachmentPersonTags = tagData || [];
        console.log(`Fetched ${attachmentPersonTags.length} attachment person tags`);
      }
    }
    
    // Create a mapping of person tags to attachments
    const attachmentTagsMap: Record<string, any[]> = {};
    
    attachmentPersonTags.forEach((tag: any) => {
      const attachmentId = tag.promptResponseAttachmentId;
      if (!attachmentTagsMap[attachmentId]) {
        attachmentTagsMap[attachmentId] = [];
      }
      attachmentTagsMap[attachmentId].push(tag.personTag);
    });
    
    // Attach person tags to each attachment
    if (category?.Prompt) {
      category.Prompt.forEach((prompt: any) => {
        if (prompt.PromptResponse) {
          prompt.PromptResponse.forEach((response: any) => {
            if (response.PromptResponseAttachment) {
              response.PromptResponseAttachment.forEach((attachment: any) => {
                // Add PersonTags array to each attachment
                attachment.PersonTags = attachmentTagsMap[attachment.id] || [];
              });
            }
          });
        }
      });
    }
    
    // Fetch sharer relationship details
    const { data: relationship, error: relationshipError } = await adminClient
      .from('ProfileSharer')
      .select(`
        id,
        firstName,
        lastName,
        profile:profileId (
          id,
          email
        )
      `)
      .eq('id', sharerId)
      .single();
    
    if (relationshipError) {
      console.error('Error fetching relationship:', relationshipError);
      return NextResponse.json(
        { error: 'Error fetching sharer details' },
        { status: 500 }
      );
    }
    
    // Transform the relationship data to match expected format
    const transformedRelationship = {
      ...relationship,
      PROFILE: relationship.profile // Add uppercase version for compatibility
    };
    
    // Return both relationship and category data
    return NextResponse.json({
      relationship: transformedRelationship,
      promptCategory: category,
      personTags: personTags || []
    });
  } catch (error) {
    console.error('Unexpected error in topic API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 