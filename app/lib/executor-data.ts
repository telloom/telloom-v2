import { createAdminClient } from '@/utils/supabase/admin';
import { createClient as createServerClient } from '@/utils/supabase/server'; // Rename for clarity
import { PromptCategory, ProfileExecutor, PersonTag, PromptResponseAttachment } from '@/types/models';
import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { SupabaseClient } from '@supabase/supabase-js'; // Import SupabaseClient type

// Helper to get signed URLs for attachments within a PromptCategory
// Accept supabase client as an argument
async function getSignedUrlsForAttachments(
  supabase: SupabaseClient, // Accept client instance
  attachments: PromptResponseAttachment[] | undefined | null
): Promise<Record<string, string>> {
  if (!attachments || attachments.length === 0) {
    return {};
  }

  const signedUrls: Record<string, string> = {};
  const urlPromises: Promise<void>[] = [];

  for (const attachment of attachments) {
    if (!attachment.fileUrl) continue;

    // Extract path assuming format 'bucket_name/path/to/file' or just 'path/to/file'
    // Assuming bucket is 'attachments' based on sharer component
    const pathParts = attachment.fileUrl.split('attachments/');
    const filePath = pathParts.length > 1 ? pathParts[1] : attachment.fileUrl;

    urlPromises.push(
      supabase.storage
        .from('attachments') // Use the correct bucket name
        .createSignedUrl(filePath, 3600) // 1 hour expiry
        .then(({ data, error }) => {
          if (error) {
            console.error(`[Executor Data] Error creating signed URL for ${filePath}:`, error);
          } else if (data?.signedUrl) {
            signedUrls[attachment.id] = data.signedUrl;
          }
        })
    );
  }

  await Promise.all(urlPromises);
  return signedUrls;
}


export async function fetchTopicDetails(userId: string, sharerId: string, topicId: string): Promise<{ 
  relationship: ProfileExecutor | null;
  promptCategory: PromptCategory | null;
  personTags: PersonTag[];
  attachmentSignedUrls: Record<string, Record<string, string>>; // { responseId: { attachmentId: url } }
}> {
  noStore();
  const adminClient = createAdminClient();

  console.log(`[Executor Data] Fetching details for userId: ${userId}, sharerId: ${sharerId}, topicId: ${topicId}`);

  try {
    // 1. Fetch Executor Relationship
    const { data: relationshipData, error: relationshipError } = await adminClient
      .from('ProfileExecutor')
      .select('*')
      .eq('executorId', userId)
      .eq('sharerId', sharerId)
      .maybeSingle();

    if (relationshipError) {
      console.error('[Executor Data] Error fetching relationship:', relationshipError);
      throw new Error('Failed to verify executor relationship.');
    }
    if (!relationshipData) {
       console.warn(`[Executor Data] No executor relationship found for executor ${userId} and sharer ${sharerId}`);
       // Depending on requirements, you might redirect here or just return null relationship
       // redirect('/role-executor'); or throw new Error('Unauthorized');
    }

    // 2. Fetch Prompt Category Details with nested data
    const { data: promptCategoryData, error: categoryError } = await adminClient
      .from('PromptCategory')
      .select(`
        *,
        Prompt (
          *,
          PromptResponse (
            *,
            Video (*),
            PromptResponseAttachment (
              *,
              PromptResponseAttachmentPersonTag (
                personTagId,
                PersonTag (*)
              )
            )
          )
        )
      `)
      .eq('id', topicId)
      .maybeSingle(); // Use maybeSingle in case topicId is invalid

    if (categoryError) {
      console.error('[Executor Data] Error fetching prompt category:', categoryError);
      throw new Error(`Failed to fetch topic details: ${categoryError.message}`);
    }

    if (!promptCategoryData) {
      notFound(); // Topic doesn't exist
    }

     // 3. Extract Person Tags and Generate Signed URLs for Attachments
    const allPersonTagsMap = new Map<string, PersonTag>();
    const allAttachmentSignedUrls: Record<string, Record<string, string>> = {}; // { responseId: { attachmentId: url } }

    if (promptCategoryData.Prompt) {
      for (const prompt of promptCategoryData.Prompt) {
        if (prompt.PromptResponse) {
          for (const response of prompt.PromptResponse) {
             if (response.PromptResponseAttachment) {
               // Get signed URLs for this response's attachments
               // Pass the adminClient to the helper function
               const signedUrlsForResponse = await getSignedUrlsForAttachments(adminClient, response.PromptResponseAttachment);
               if (Object.keys(signedUrlsForResponse).length > 0) {
                   allAttachmentSignedUrls[response.id] = signedUrlsForResponse;
               }

               // Collect unique person tags
               for (const attachment of response.PromptResponseAttachment) {
                  if (attachment.PromptResponseAttachmentPersonTag) {
                    for (const tagLink of attachment.PromptResponseAttachmentPersonTag) {
                      if (tagLink.PersonTag && !allPersonTagsMap.has(tagLink.personTagId)) {
                        allPersonTagsMap.set(tagLink.personTagId, tagLink.PersonTag);
                      }
                    }
                  }
               }
             }
          }
        }
      }
    }
    const uniquePersonTags = Array.from(allPersonTagsMap.values());

    console.log(`[Executor Data] Found ${uniquePersonTags.length} unique person tags.`);
    console.log(`[Executor Data] Generated signed URLs for ${Object.keys(allAttachmentSignedUrls).length} responses.`);


    // 4. Return the combined data
    return {
      relationship: relationshipData as ProfileExecutor | null,
      promptCategory: promptCategoryData as PromptCategory | null,
      personTags: uniquePersonTags,
      attachmentSignedUrls: allAttachmentSignedUrls
    };

  } catch (error) {
    console.error('[Executor Data] Unexpected error in fetchTopicDetails:', error);
    // Rethrow the error to be caught by the page component's try/catch
    throw error;
  }
}

// Keep the placeholder for fetchAttachmentUrls, as it's not directly called by ExecutorTopicPage
// The signed URLs are now handled within fetchTopicDetails
export async function fetchAttachmentUrls(promptCategory: PromptCategory | null) {
  noStore();
  console.warn('[Executor Data] fetchAttachmentUrls implementation is likely obsolete, signed URLs handled in fetchTopicDetails.');
  return {}; // Return empty object
} 