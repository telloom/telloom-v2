/**
 * Component-specific interfaces that extend from base models
 * These interfaces are designed for UI components and handle specific display needs
 */

import { PromptResponseAttachment, PersonTag, PersonRelation } from './models';

/**
 * Interface for attachment data as displayed in the UI
 * Extends from PromptResponseAttachment but handles dates as strings and ensures
 * required UI-specific fields
 */
export interface UIAttachment {
  // Required fields from database
  id: string;
  promptResponseId: string;
  profileSharerId: string;
  fileUrl: string;
  fileType: string;
  fileName: string;
  uploadedAt: Date;  // Keep as Date for sorting/comparison
  
  // Optional fields from database
  fileSize: number | null;
  title: string | null;
  description: string | null;
  estimatedYear: number | null;
  dateCaptured: Date | null;  // Keep as Date for comparison
  yearCaptured: number | null;
  
  // Relationships
  PersonTags: PersonTag[];
  
  // UI-specific fields
  displayUrl?: string;  // For displaying in UI
  signedUrl?: string;   // For Supabase storage URLs
}

/**
 * Interface for the thumbnail display of attachments
 * Used by AttachmentThumbnail component
 */
export interface ThumbnailAttachment {
  id: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  description: string | null;
  dateCaptured: Date | null;
  yearCaptured: number | null;
  displayUrl?: string;  // Optional URL for display in UI
  signedUrl?: string;   // Required for secure access to Supabase storage
}

/**
 * Interface for attachment dialog display
 * Extends UIAttachment with additional dialog-specific fields
 */
export interface DialogAttachment extends UIAttachment {
  isEditing?: boolean;
}

/**
 * Type guard to check if an attachment is a valid UIAttachment
 */
export function isUIAttachment(attachment: any): attachment is UIAttachment {
  return (
    typeof attachment === 'object' &&
    attachment !== null &&
    typeof attachment.id === 'string' &&
    typeof attachment.fileUrl === 'string' &&
    typeof attachment.fileType === 'string' &&
    typeof attachment.fileName === 'string' &&
    typeof attachment.promptResponseId === 'string' &&
    typeof attachment.profileSharerId === 'string' &&
    attachment.uploadedAt instanceof Date &&
    Array.isArray(attachment.PersonTags)
  );
}

/**
 * Helper function to convert PromptResponseAttachment to UIAttachment
 */
export function toUIAttachment(attachment: PromptResponseAttachment): UIAttachment {
  const personTags = attachment.PromptResponseAttachmentPersonTag
    ?.map(pt => pt.PersonTag)
    .filter((tag): tag is PersonTag => tag !== null && tag !== undefined) || [];

  return {
    // Required fields
    id: attachment.id,
    promptResponseId: attachment.promptResponseId,
    profileSharerId: attachment.profileSharerId,
    fileUrl: attachment.fileUrl,
    fileType: attachment.fileType,
    fileName: attachment.fileName,
    uploadedAt: attachment.uploadedAt,
    
    // Optional fields
    fileSize: attachment.fileSize,
    title: attachment.title,
    description: attachment.description,
    estimatedYear: attachment.estimatedYear,
    dateCaptured: attachment.dateCaptured,
    yearCaptured: attachment.yearCaptured,
    
    // Relationships
    PersonTags: personTags
  };
}

/**
 * Helper function to convert UIAttachment to ThumbnailAttachment
 */
export function toThumbnailAttachment(attachment: UIAttachment): ThumbnailAttachment {
  return {
    id: attachment.id,
    fileUrl: attachment.fileUrl,
    fileName: attachment.fileName,
    fileType: attachment.fileType,
    description: attachment.description,
    dateCaptured: attachment.dateCaptured,
    yearCaptured: attachment.yearCaptured,
    displayUrl: attachment.displayUrl,
    signedUrl: attachment.signedUrl
  };
} 