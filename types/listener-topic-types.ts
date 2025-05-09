// types/listener-topic-types.ts
// Shared type definitions for listener topic view components

import type { Database } from '@/lib/database.types';
import type { PersonTag } from '@/types/models'; // Assuming PersonTag is here

// Attachment as returned by the RPC, including PersonTags
export type RpcTopicAttachment = Database['public']['Tables']['PromptResponseAttachment']['Row'] & {
  PersonTags?: PersonTag[] | null;
};

// Represents a sharer's response to a specific prompt, tailored for listener view
export interface ListenerPromptResponse {
    id: string; // PromptResponse.id
    videoId: string | null;
    summary: string | null;
    responseNotes: string | null;
    createdAt: string;
    updatedAt: string | null; // Can be null if not yet updated
    // Nested/Joined data from RPC
    video_muxPlaybackId?: string | null;
    video_duration?: number | null;
    video_status?: string | null;
    attachments?: RpcTopicAttachment[] | null;
    is_favorite?: boolean | null; // Specific to the listener viewing
}

// Represents a prompt within the topic category
export interface ListenerTopicPrompt {
    id: string; // Prompt.id
    promptText: string;
    isContextEstablishing: boolean;
    sharerResponse: ListenerPromptResponse | null; // The single response from the sharer
}

// Represents the overall data structure for the topic page fetched via RPC
export interface ListenerTopicData {
    id: string; // PromptCategory.id
    category: string;
    description: string | null;
    theme: string | null;
    prompts: ListenerTopicPrompt[] | null;
} 