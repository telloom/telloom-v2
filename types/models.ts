// models.ts
/**
 * Contains TypeScript interfaces representing your data models, primarily based
 * on your Prisma schema and existing types. It includes entities such as Profiles,
 * Prompts, Videos, and more.
 * 
 * As your data models evolve with new features or changes in the database schema,
 * update the interfaces here to keep them in sync.
 */

export enum Role {
    LISTENER = 'LISTENER',
    SHARER = 'SHARER',
    EXECUTOR = 'EXECUTOR',
    ADMIN = 'ADMIN',
  }
  
  export enum InvitationStatus {
    PENDING = 'PENDING',
    ACCEPTED = 'ACCEPTED',
    DECLINED = 'DECLINED',
    EXPIRED = 'EXPIRED',
  }
  
  export enum VideoStatus {
    WAITING = 'WAITING',
    PREPARING = 'PREPARING',
    ASSET_CREATED = 'ASSET_CREATED',
    READY = 'READY',
    ERRORED = 'ERRORED',
  }
  
  export interface AppObject {
    id: string;
    name: string;
    description?: string;
    promptResponseId: string;
    createdAt?: Date;
    updatedAt?: Date;
  }
  
  export interface PromptCategory {
    id: string;
    category: string;
    description: string;
    prompts: Prompt[];
    isFavorite?: boolean;
    isInQueue?: boolean;
  }
  
  export interface Prompt {
    id: string;
    promptText: string;
    promptType: string;
    isContextEstablishing: boolean;
    promptCategoryId: string;
    promptResponses: PromptResponse[];
    videos: Video[];
  }
  
  export interface PromptResponseAttachment {
    id: string;
    promptResponseId: string;
    fileUrl: string;
    fileType: string;
    fileName: string;
    createdAt?: Date;
    updatedAt?: Date;
    promptResponse: PromptResponse;
  }
  
  export interface PromptResponseFavorite {
    id: string;
    profileId: string;
    promptResponseId: string;
    createdAt: Date;
    profile: Profile;
    promptResponse: PromptResponse;
  }
  
  export interface PromptResponseRecentlyWatched {
    id: string;
    profileId: string;
    promptResponseId: string;
    lastWatched: Date;
    createdAt: Date;
    profile: Profile;
    promptResponse: PromptResponse;
  }
  
  export interface ResponsePermission {
    id: string;
    promptResponseId: string;
    profileId: string;
    permissionType: string;
    createdAt: Date;
    updatedAt?: Date;
    profile: Profile;
    promptResponse: PromptResponse;
  }
  
  export interface PromptResponse {
    id: string;
    profileSharerId: string;
    videoId: string;
    responseText: string;
    privacyLevel: string;
    createdAt?: Date;
    updatedAt?: Date;
    video?: Video;
  }
  
  export interface Video {
    id: string;
    profileSharerId: string;
    muxPlaybackId: string;
    duration: number;
    promptResponses: PromptResponse[];
    profileSharer: Profile | null;
    viewedBy: string[];
  }
  
  export interface VideoTranscript {
    id: string;
    videoId: string;
    text: string;
    language?: string;
    createdAt: Date;
    updatedAt?: Date;
    video: Video;
  }
  
  export interface Sharer {
    id: string;
    name: string;
    email: string;
  }
  
  export interface Profile {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
    roles: ProfileRole[];
    createdAt: Date;
    updatedAt: Date;
  }
  
  export interface ProfileRole {
    profileId: string;
    role: 'SHARER' | 'LISTENER' | 'EXECUTOR' | 'ADMIN';
  }
  
  export interface ProfileExecutor {
    id: string;
    sharerId: string;
    executorId: string;
    createdAt: Date;
    // Relationships
    sharer: ProfileSharer;
    executor: Profile;
  }
  
  export interface ProfileSharer {
    id: string;
    profileId: string;
    subscriptionStatus: boolean;
    createdAt: Date;
    // Relationships
    profile: Profile;
    executorAssignment?: ProfileExecutor;
    followers: ProfileListener[];
    promptResponses: PromptResponse[];
    // Other fields and relationships as needed
  }
  
  export interface ProfileListener {
    id: string;
    listenerId: string;
    sharerId: string;
    sharedSince: Date;
    hasAccess: boolean;
    lastViewed?: Date;
    notifications: boolean;
    createdAt: Date;
    updatedAt: Date;
    // Relationships
    listener: Profile;
    sharer: ProfileSharer;
    // Other fields and relationships as needed
  }
  
  export interface Invitation {
    id: string;
    senderId: string;
    recipientId: string;
    status: InvitationStatus;
    createdAt: Date;
    updatedAt: Date;
    sender: Profile;
    recipient: Profile;
  }
  
  export interface ThematicVideo {
    id: string;
    title: string;
    description?: string;
    videoUrl: string;
    thumbnailUrl?: string;
    createdAt: Date;
    updatedAt?: Date;
    promptResponses: PromptResponse[];
  }
  
  // Include other interfaces as needed, such as Invitation, ResponsePermission, VideoTranscript, etc.