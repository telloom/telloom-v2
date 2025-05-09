'use server';

import { createClient } from '@/utils/supabase/server';
import { getUserWithRoleData } from '@/utils/supabase/jwt-helpers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
// Remove unused type imports
// import { PromptResponse, Video, VideoTranscript } from '@/types/models'; // Assuming types are defined here
import Mux from '@mux/mux-node'; // <-- Import Mux SDK

// --- Helper: Check if user is the Sharer for the response/video ---
async function isOwner(supabase: any, responseId?: string, videoId?: string): Promise<boolean> {
  // Call getUserWithRoleData without passing supabase, as it creates its own client
  const { roleData } = await getUserWithRoleData(); 
  if (!roleData.sharerId) return false; // Not a sharer or couldn't get ID

  if (responseId) {
    const { data, error } = await supabase
      .from('PromptResponse')
      .select('profileSharerId')
      .eq('id', responseId)
      .maybeSingle();
    if (error || !data) return false;
    return data.profileSharerId === roleData.sharerId;
  }

  if (videoId) {
    const { data, error } = await supabase
      .from('Video')
      .select('profileSharerId')
      .eq('id', videoId)
      .maybeSingle();
      
      // Add join to check profileSharerId on PromptResponse if necessary
      // This depends on how Video is linked and RLS setup
      
    if (error || !data) return false;
    return data.profileSharerId === roleData.sharerId;
  }

  return false;
}

// --- Zod Schemas for Validation ---
const NotesSchema = z.object({
  responseId: z.string().uuid(),
  notes: z.string().optional(),
});

const SummarySchema = z.object({
  responseId: z.string().uuid(),
  summary: z.string().optional(),
});

const DateSchema = z.object({
  videoId: z.string().uuid(),
  dateRecorded: z.string().optional(), // Allow empty string or ISO date string
});

const TranscriptSchema = z.object({
  transcriptId: z.string().uuid(),
  transcript: z.string().optional(),
});

const AttachmentIdSchema = z.object({
  attachmentId: z.string().uuid(),
});

// --- Server Actions ---

export async function updatePromptResponseNotes(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  // Add logging to inspect the client
  console.log('[ACTION_UPDATE_NOTES] Supabase client type:', typeof supabase);
  console.log('[ACTION_UPDATE_NOTES] Supabase client keys:', supabase ? Object.keys(supabase) : 'null');
  console.log('[ACTION_UPDATE_NOTES] Does supabase.from exist?:', !!supabase?.from);
  
  const parsed = NotesSchema.safeParse({
    responseId: formData.get('responseId'),
    notes: formData.get('notes'),
  });

  if (!parsed.success) {
    return { success: false, error: 'Invalid input data.' };
  }

  const { responseId, notes } = parsed.data;
  console.log(`[ACTION_UPDATE_NOTES] Attempting update for responseId: ${responseId}`);

  // --- NEW Permission Check using RPC ---
  try {
    const { data: responseInfo, error: responseError } = await supabase
      .from('PromptResponse')
      .select('profileSharerId')
      .eq('id', responseId)
      .maybeSingle();

    if (responseError) throw new Error(`Failed to fetch response info: ${responseError.message}`);
    if (!responseInfo?.profileSharerId) throw new Error('Could not determine sharer for the response.');

    const sharerId = responseInfo.profileSharerId;
    console.log(`[ACTION_UPDATE_NOTES] Found sharerId: ${sharerId} for responseId: ${responseId}`);

    const { data: hasAccess, error: accessError } = await supabase
        .rpc('has_sharer_access', { sharer_profile_id: sharerId });

    if (accessError) throw new Error(`Access check failed: ${accessError.message}`);

    console.log(`[ACTION_UPDATE_NOTES] has_sharer_access check result: ${hasAccess}`);
    if (hasAccess !== true) { // RPC returns boolean or null
        return { success: false, error: 'Permission denied by access check.' };
    }
  } catch (error: any) {
      console.error('[ACTION_UPDATE_NOTES] Permission check error:', error);
      return { success: false, error: error.message || 'Permission check failed.' };
  }
  // --- End Permission Check ---

  try {
    console.log('[ACTION_UPDATE_NOTES] Permission check passed. Proceeding with update...');
    const { error: updateError } = await supabase
      .from('PromptResponse')
      .update({ responseNotes: notes })
      .eq('id', responseId);

    if (updateError) throw updateError; // Throw the actual Supabase error

    console.log(`[ACTION_UPDATE_NOTES] Update successful for responseId: ${responseId}`);

    // Revalidate the path for the prompt page
    const { data: promptData } = await supabase.from('PromptResponse').select('promptId').eq('id', responseId).single();
    if (promptData?.promptId) {
      const { roleData } = await getUserWithRoleData();
      const path = roleData.roles.includes('EXECUTOR')
        ? `/role-executor/${roleData.executorRelationships?.[0]?.sharerId}/prompts/${promptData.promptId}` // Adjust if multiple relationships possible
        : `/role-sharer/prompts/${promptData.promptId}`;
       console.log(`[ACTION_UPDATE_NOTES] Revalidating path: ${path}`);
      revalidatePath(path);
    }

    return { success: true };
  } catch (error: any) {
    console.error(`[ACTION_UPDATE_NOTES] Error updating notes for response ${responseId}:`, error);
    // Provide more context from Supabase error if available
    const message = error.message ? `Database error: ${error.message}` : 'Failed to update notes.';
    return { success: false, error: message };
  }
}

export async function updatePromptResponseSummary(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
   const parsed = SummarySchema.safeParse({
    responseId: formData.get('responseId'),
    summary: formData.get('summary'),
  });

  if (!parsed.success) {
    return { success: false, error: 'Invalid input data.' };
  }
  
  const { responseId, summary } = parsed.data;
  console.log(`[ACTION_UPDATE_SUMMARY] Attempting update for responseId: ${responseId}`);

  // --- NEW Permission Check using RPC ---
  try {
    const { data: responseInfo, error: responseError } = await supabase
      .from('PromptResponse')
      .select('profileSharerId')
      .eq('id', responseId)
      .maybeSingle();

    if (responseError) throw new Error(`Failed to fetch response info: ${responseError.message}`);
    if (!responseInfo?.profileSharerId) throw new Error('Could not determine sharer for the response.');

    const sharerId = responseInfo.profileSharerId;
    console.log(`[ACTION_UPDATE_SUMMARY] Found sharerId: ${sharerId} for responseId: ${responseId}`);

    const { data: hasAccess, error: accessError } = await supabase
        .rpc('has_sharer_access', { sharer_profile_id: sharerId });

    if (accessError) throw new Error(`Access check failed: ${accessError.message}`);

    console.log(`[ACTION_UPDATE_SUMMARY] has_sharer_access check result: ${hasAccess}`);
     if (hasAccess !== true) { // RPC returns boolean or null
        return { success: false, error: 'Permission denied by access check.' };
    }
  } catch (error: any) {
      console.error('[ACTION_UPDATE_SUMMARY] Permission check error:', error);
      return { success: false, error: error.message || 'Permission check failed.' };
  }
  // --- End Permission Check ---

  try {
     console.log('[ACTION_UPDATE_SUMMARY] Permission check passed. Proceeding with update...');
    const { error: updateError } = await supabase
      .from('PromptResponse')
      .update({ summary: summary })
      .eq('id', responseId);

    if (updateError) throw updateError; // Throw the actual Supabase error

    console.log(`[ACTION_UPDATE_SUMMARY] Update successful for responseId: ${responseId}`);

    const { data: promptData } = await supabase.from('PromptResponse').select('promptId').eq('id', responseId).single();
    if (promptData?.promptId) {
       const { roleData } = await getUserWithRoleData();
      const path = roleData.roles.includes('EXECUTOR')
        ? `/role-executor/${roleData.executorRelationships?.[0]?.sharerId}/prompts/${promptData.promptId}` // Adjust if multiple relationships possible
        : `/role-sharer/prompts/${promptData.promptId}`;
       console.log(`[ACTION_UPDATE_SUMMARY] Revalidating path: ${path}`);
      revalidatePath(path);
    }

    return { success: true };
  } catch (error: any) {
     console.error(`[ACTION_UPDATE_SUMMARY] Error updating summary for response ${responseId}:`, error);
    // Provide more context from Supabase error if available
    const message = error.message ? `Database error: ${error.message}` : 'Failed to update summary.';
    return { success: false, error: message };
  }
}

export async function updateVideoTranscript(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const parsed = TranscriptSchema.safeParse({
      transcriptId: formData.get('transcriptId'),
      transcript: formData.get('transcript'),
  });

  if (!parsed.success) {
      return { success: false, error: 'Invalid input data.' };
  }

  const { transcriptId, transcript } = parsed.data;

  // Permission Check (Might need to check via Video or PromptResponse)
  // This requires knowing how VideoTranscript links back to a user-owned entity
  // For now, assuming RLS handles it or adding a placeholder check
  // const owner = await isOwner(supabase, undefined, videoId); // Need videoId
  // if (!owner) {
  //   return { success: false, error: 'Permission denied.' };
  // }

  try {
    const { error } = await supabase
      .from('VideoTranscript')
      .update({ transcript: transcript })
      .eq('id', transcriptId);

    if (error) throw error;

    // Revalidate path - need to get promptId from VideoTranscript -> Video -> PromptResponse
    const { data: videoData } = await supabase.from('VideoTranscript').select('videoId').eq('id', transcriptId).single();
    if (videoData?.videoId) {
       const { data: responseData } = await supabase.from('PromptResponse').select('promptId').eq('videoId', videoData.videoId).maybeSingle();
       if (responseData?.promptId) {
           revalidatePath(`/role-sharer/prompts/${responseData.promptId}`);
       }
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error updating transcript:", error);
    return { success: false, error: error.message || 'Failed to update transcript.' };
  }
}

export async function updateVideoDateRecorded(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const parsed = DateSchema.safeParse({
      videoId: formData.get('videoId'),
      dateRecorded: formData.get('dateRecorded') || null, // Handle empty string as null
  });

  if (!parsed.success) {
      return { success: false, error: 'Invalid input data.' };
  }

  const { videoId, dateRecorded } = parsed.data;
  
  // Validate date string format if needed, or let DB handle it
  const dateToSave = dateRecorded ? new Date(dateRecorded).toISOString() : null;

  // Permission Check
  const owner = await isOwner(supabase, undefined, videoId);
  if (!owner) {
    return { success: false, error: 'Permission denied.' };
  }

  try {
    const { error } = await supabase
      .from('Video')
      .update({ dateRecorded: dateToSave })
      .eq('id', videoId);

    if (error) throw error;

    // Revalidate path
     const { data: responseData } = await supabase.from('PromptResponse').select('promptId').eq('videoId', videoId).maybeSingle();
     if (responseData?.promptId) {
         revalidatePath(`/role-sharer/prompts/${responseData.promptId}`);
     }

    return { success: true };
  } catch (error: any) {
    console.error("Error updating date recorded:", error);
    return { success: false, error: error.message || 'Failed to update date recorded.' };
  }
}

export async function deletePromptResponseAndVideo(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const promptResponseId = formData.get('promptResponseId') as string;
  const muxAssetId = formData.get('muxAssetId') as string;

  if (!promptResponseId || !muxAssetId) {
    return { success: false, error: 'Missing required IDs (promptResponseId or muxAssetId).' };
  }

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Get role data, including the correct sharerId for the logged-in user
  const { roleData } = await getUserWithRoleData();
  const loggedInUserSharerId = roleData.sharerId;

  if (!loggedInUserSharerId) {
      // This could happen if the user isn't a sharer or if the JWT helper failed
      return { success: false, error: 'Could not determine your Sharer ID.' };
  }

  try {
    console.log(`[Action Delete] Initiating delete for PromptResponse: ${promptResponseId}, MuxAsset: ${muxAssetId}`);

    // 1. Fetch the PromptResponse to get videoId and verify ownership
    const { data: responseData, error: responseError } = await supabase
      .from('PromptResponse')
      .select('id, profileSharerId, videoId, promptId')
      .eq('id', promptResponseId)
      .single();

    if (responseError) {
      console.error('[Action Delete] Error fetching PromptResponse:', responseError);
      throw new Error('Failed to fetch prompt response details.');
    }
    if (!responseData) {
      throw new Error('Prompt response not found.');
    }

    // *** CORRECTED PERMISSION CHECK ***
    // Compare the response's sharer ID with the logged-in user's derived sharer ID
    if (responseData.profileSharerId !== loggedInUserSharerId) {
        console.warn(`[Action Delete] Unauthorized attempt: User ${user.id} (Sharer ID: ${loggedInUserSharerId}) tried to delete response ${promptResponseId} owned by Sharer ID ${responseData.profileSharerId}`);
        throw new Error('You do not have permission to delete this response.');
    }
    console.log(`[Action Delete] Permission check passed. User Sharer ID ${loggedInUserSharerId} matches Response Sharer ID ${responseData.profileSharerId}`);

    const videoId = responseData.videoId;
    const promptId = responseData.promptId; // Get promptId for revalidation
    console.log(`[Action Delete] Found Video ID: ${videoId} for PromptResponse: ${promptResponseId}`);

    if (!videoId) {
        // This case might happen if the video record was already somehow deleted but the response wasn't.
        // Proceed to delete the response record itself, but log a warning.
        console.warn(`[Action Delete] No associated videoId found for PromptResponse ${promptResponseId}. Proceeding to delete only the response record.`);
    } else {
      // 2. Check for existing attachments
      const { count: attachmentCount, error: attachmentError } = await supabase
        .from('PromptResponseAttachment')
        .select('id', { count: 'exact', head: true })
        .eq('promptResponseId', promptResponseId);

      if (attachmentError) {
        console.error('[Action Delete] Error checking attachments:', attachmentError);
        throw new Error('Failed to check for attachments.');
      }

      if (attachmentCount !== null && attachmentCount > 0) {
        console.log(`[Action Delete] Found ${attachmentCount} attachments for PromptResponse ${promptResponseId}. Aborting deletion.`);
        return { success: false, error: `Cannot delete recording because it has ${attachmentCount} attachment(s). Please remove attachments first.` };
      }
      console.log('[Action Delete] No attachments found. Proceeding with deletion.');
    }

    // 3. Perform Deletions (Database)
    // Use a transaction if possible, otherwise sequential deletes
    // We proceed even if videoId is null to ensure the PromptResponse gets deleted.
    if (videoId) {
        const { error: transcriptError } = await supabase
            .from('VideoTranscript')
            .delete()
            .eq('videoId', videoId);
        if (transcriptError) {
            console.error('[Action Delete] Error deleting VideoTranscript:', transcriptError);
            // Decide if we should stop or continue. Let's try to continue.
        }
        console.log(`[Action Delete] Deleted VideoTranscript for Video ID: ${videoId}`);

        const { error: videoError } = await supabase
            .from('Video')
            .delete()
            .eq('id', videoId);
         if (videoError) {
            console.error('[Action Delete] Error deleting Video:', videoError);
            // Decide if we should stop or continue. Let's try to continue.
        }
        console.log(`[Action Delete] Deleted Video record: ${videoId}`);
    }

    // Always delete the PromptResponse record
    const { error: finalResponseError } = await supabase
      .from('PromptResponse')
      .delete()
      .eq('id', promptResponseId);

    if (finalResponseError) {
      console.error('[Action Delete] Error deleting final PromptResponse:', finalResponseError);
      throw new Error('Failed to delete the prompt response record.');
    }
     console.log(`[Action Delete] Deleted PromptResponse record: ${promptResponseId}`);

    // 4. Delete Mux Asset directly using the SDK
    console.log(`[Action Delete] Attempting to delete Mux asset directly: ${muxAssetId}`);
    const muxTokenId = process.env.MUX_TOKEN_ID;
    const muxTokenSecret = process.env.MUX_TOKEN_SECRET;

    if (!muxTokenId || !muxTokenSecret) {
      console.error('[Action Delete] Mux Token ID or Secret not configured in environment variables. Cannot delete Mux asset.');
      // Decide how to handle this. For now, log error but don't fail the whole action, as DB records are deleted.
    } else {
      try {
        const mux = new Mux({ tokenId: muxTokenId, tokenSecret: muxTokenSecret });
        await mux.video.assets.delete(muxAssetId);
        console.log(`[Action Delete] Successfully deleted Mux asset directly: ${muxAssetId}`);
      } catch (muxError: any) {
        console.error(`[Action Delete] Error deleting Mux asset directly (${muxAssetId}):`, muxError);
        // Log the error but proceed, as primary DB records are deleted.
        // Consider specific error handling, e.g., if asset was already deleted (404).
        if (muxError?.type === 'not_found') {
          console.log(`[Action Delete] Mux asset ${muxAssetId} was already deleted or not found.`);
        }
      }
    }

    // 5. Revalidate the path to reflect changes
    if (promptId) {
        revalidatePath(`/role-sharer/prompts/${promptId}`);
        // Optionally revalidate the topic page too if you want the prompt card to update
        // const { data: promptCategoryData } = await supabase.from('Prompt').select('promptCategoryId').eq('id', promptId).single();
        // if (promptCategoryData?.promptCategoryId) {
        //    revalidatePath(`/role-sharer/topics/${promptCategoryData.promptCategoryId}`);
        // }
    }

    console.log(`[Action Delete] Successfully deleted PromptResponse: ${promptResponseId} and associated data.`);
    return { success: true };

  } catch (error: any) {
    console.error('[Action Delete] Overall error during deletion process:', error);
    return { success: false, error: error.message || 'An unexpected error occurred during deletion.' };
  }
}

// --- NEW SERVER ACTION: Delete Attachment --- 
export async function deleteAttachment(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const parsed = AttachmentIdSchema.safeParse({
      attachmentId: formData.get('attachmentId'),
  });

  if (!parsed.success) {
      return { success: false, error: 'Invalid input: Missing or invalid attachmentId.' };
  }

  const { attachmentId } = parsed.data;
  console.log(`[Action DeleteAttachment] Initiating delete for Attachment ID: ${attachmentId}`);

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
      return { success: false, error: 'Unauthorized' };
  }

  try {
    // 1. Verify Permission using RPC (Replaces isAttachmentOwner)
    // Fetch the sharer ID associated with the attachment first
    const { data: attachmentOwnerData, error: ownerFetchError } = await supabase
      .from('PromptResponseAttachment')
      .select('profileSharerId')
      .eq('id', attachmentId)
      .maybeSingle();

    if (ownerFetchError) throw new Error(`Failed to fetch attachment owner info: ${ownerFetchError.message}`);
    if (!attachmentOwnerData?.profileSharerId) throw new Error('Could not determine sharer for the attachment.');

    const sharerProfileId = attachmentOwnerData.profileSharerId;
    console.log(`[Action DeleteAttachment] Found profileSharerId: ${sharerProfileId} for attachment: ${attachmentId}`);

    const { data: hasAccess, error: accessError } = await supabase
      .rpc('has_sharer_access', { sharer_profile_id: sharerProfileId });

    if (accessError) throw new Error(`Access check failed: ${accessError.message}`);
    if (hasAccess !== true) {
        console.warn(`[Action DeleteAttachment] Permission denied by has_sharer_access for user ${user.id} on attachment ${attachmentId} (Sharer: ${sharerProfileId}).`);
        return { success: false, error: 'Permission denied.' };
    }
    console.log(`[Action DeleteAttachment] Permission verified via has_sharer_access for attachment ${attachmentId}.`);
    
    // 2. Get Attachment details (including fileUrl for storage deletion)
    const { data: attachmentData, error: fetchError } = await supabase
      .from('PromptResponseAttachment')
      .select('id, fileUrl, promptResponseId') // Select promptResponseId for revalidation
      .eq('id', attachmentId)
      .single();

    if (fetchError || !attachmentData) {
      console.error('[Action DeleteAttachment] Error fetching attachment details:', fetchError);
      throw new Error('Failed to fetch attachment details or attachment not found.');
    }
    console.log(`[Action DeleteAttachment] Fetched details for attachment ${attachmentId}, File URL: ${attachmentData.fileUrl}`);

    // 3. Delete related Person Tags links
    const { error: tagLinkError } = await supabase
      .from('PromptResponseAttachmentPersonTag')
      .delete()
      .eq('promptResponseAttachmentId', attachmentId);

    if (tagLinkError) {
      console.error('[Action DeleteAttachment] Error deleting tag links:', tagLinkError);
      // Decide if this is critical - maybe just log and continue?
      throw new Error('Failed to delete associated tags.');
    }
    console.log(`[Action DeleteAttachment] Deleted tag links for attachment ${attachmentId}.`);

    // 4. Delete the Attachment database record
    const { error: dbDeleteError } = await supabase
      .from('PromptResponseAttachment')
      .delete()
      .eq('id', attachmentId);

    if (dbDeleteError) {
      console.error('[Action DeleteAttachment] Error deleting DB record:', dbDeleteError);
      throw new Error('Failed to delete attachment record from database.');
    }
    console.log(`[Action DeleteAttachment] Deleted DB record for attachment ${attachmentId}.`);

    // 5. Delete the file from Storage
    if (attachmentData.fileUrl) {
      // The fileUrl *is* the path within the bucket
      const filePath = attachmentData.fileUrl;

      console.log(`[Action DeleteAttachment] Attempting to delete file from storage at path: ${filePath}`);
      const { error: storageError } = await supabase
        .storage
        .from('attachments')
        .remove([filePath]); // Pass the path directly

      if (storageError) {
        console.error(`[Action DeleteAttachment] Error deleting file '${filePath}' from storage:`, storageError);
        // Log the error but potentially don't fail the whole operation if DB record is gone
        // Consider specific errors like 'Not found'
        if (storageError.message !== 'The resource was not found') {
           // Maybe re-throw for more critical storage errors?
           // For now, just log and proceed.
           console.warn(`[Action DeleteAttachment] Storage deletion failed but DB record is gone. File path: ${filePath}`);
        }
      } else {
         console.log(`[Action DeleteAttachment] Successfully deleted file from storage: ${filePath}`);
      }
    } else {
        console.warn(`[Action DeleteAttachment] No fileUrl found for attachment ${attachmentId}, skipping storage deletion.`);
    }

    // 6. Revalidate the path of the parent prompt page
    // This requires the promptId from the related PromptResponse
    if (attachmentData.promptResponseId) {
       const { data: responseData } = await supabase
         .from('PromptResponse')
         .select('promptId')
         .eq('id', attachmentData.promptResponseId)
         .maybeSingle();

       if (responseData?.promptId) {
          revalidatePath(`/role-sharer/prompts/${responseData.promptId}`);
          console.log(`[Action DeleteAttachment] Revalidated path /role-sharer/prompts/${responseData.promptId}`);
       }
    }

    console.log(`[Action DeleteAttachment] Successfully deleted attachment ${attachmentId}.`);
    return { success: true };

  } catch (error: any) {
    console.error('[Action DeleteAttachment] Overall error during deletion process:', error);
    return { success: false, error: error.message || 'An unexpected error occurred during deletion.' };
  }
} 