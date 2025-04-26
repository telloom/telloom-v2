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
    theme: string | null;
    Prompt: Prompt[];
    isFavorite?: boolean;
    isInQueue?: boolean;
  }
  
  export interface Prompt {
    id: string;
    promptText: string;
    promptType: string;
    isContextEstablishing: boolean;
    promptCategoryId: string;
    PromptCategory?: {
      id: string;
      category: string;
    };
    PromptResponse: Array<{
      id: string;
      profileSharerId: string;
      summary: string | null;
      createdAt: string;
      Video: Video | null;
      PromptResponseAttachment: Array<{
        id: string;
        fileUrl: string;
        fileType: string;
        fileName: string;
        description?: string | null;
        dateCaptured?: string | null;
        yearCaptured?: number | null;
      }>;
    }>;
  }
  
  export interface PromptResponseAttachment {
    id: string;
    promptResponseId: string;
    profileSharerId: string;
    fileUrl: string;
    fileType: string;
    fileName: string;
    fileSize: number | null;
    title: string | null;
    description: string | null;
    estimatedYear: number | null;
    uploadedAt: Date;
    dateCaptured: Date | null;
    yearCaptured: number | null;
    // Relations
    PromptResponseAttachmentPersonTag?: Array<{
      PersonTag?: PersonTag | null;
    }>;
    PersonTags?: PersonTag[];
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
    summary: string | null;
    responseNotes?: string | null;
    transcription?: string;
    dateRecorded?: Date | null;
    createdAt: string;
    Video?: {
      id: string;
      muxPlaybackId: string;
      muxAssetId: string | null;
      VideoTranscript?: Array<{
        id: string;
        transcript: string;
      }>;
    } | null;
    PromptResponseAttachment?: PromptResponseAttachment[];
  }
  
  export interface Video {
    id: string;
    muxPlaybackId: string;
    muxAssetId: string;
    dateRecorded?: string | null;
    VideoTranscript?: Array<{
      id: string;
      transcript: string;
    }>;
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
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string;
    phone?: string | null;
    addressStreet?: string | null;
    addressUnit?: string | null;
    addressCity?: string | null;
    addressState?: string | null;
    addressZipcode?: string | null;
    createdAt: Date;
    updatedAt: Date;
    roles?: ProfileRole[];
  }
  
  export interface ProfileRole {
    id: string;
    profileId: string;
    role: Role;
    createdAt: Date;
    updatedAt: Date;
    profile: Profile;
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
  
  export interface VideoResponseSectionProps {
    promptId: string;
    promptText: string;
    promptCategory: string;
    response?: {
      id: string;
      profileSharerId: string;
      summary?: string | null;
      responseNotes?: string | null;
      video?: {
        id: string;
        muxPlaybackId: string;
        muxAssetId: string;
        dateRecorded?: string | null;
        VideoTranscript?: Array<{
          id: string;
          transcript: string;
        }>;
      };
      PromptResponseAttachment?: Array<{
        id: string;
        promptResponseId: string;
        profileSharerId: string;
        fileUrl: string;
        fileType: string;
        fileName: string;
        fileSize: number | null;
        title: string | null;
        description: string | null;
        estimatedYear: number | null;
        uploadedAt: string;
        dateCaptured: string | null;
        yearCaptured: number | null;
        PromptResponseAttachmentPersonTag?: Array<{
          PersonTag?: PersonTag | null;
        }>;
      }>;
    };
  }
  
  export interface GetPromptDataResult {
    prompt: Prompt;
    profileSharer: { id: string };
    siblingPrompts?: {
      previousPrompt?: { id: string; promptText: string } | null;
      nextPrompt?: { id: string; promptText: string } | null;
    };
  }
  
  export interface GetPromptDataError {
    error: string;
    redirectTo?: string;
  }
  
  export enum PersonRelation {
    Spouse = 'Spouse',
    Partner = 'Partner',
    Mother = 'Mother',
    Father = 'Father',
    Sister = 'Sister',
    Brother = 'Brother',
    Daughter = 'Daughter',
    Son = 'Son',
    Grandmother = 'Grandmother',
    Grandfather = 'Grandfather',
    GreatGrandmother = 'GreatGrandmother',
    GreatGrandfather = 'GreatGrandfather',
    Granddaughter = 'Granddaughter',
    Grandson = 'Grandson',
    GreatGranddaughter = 'GreatGranddaughter',
    GreatGrandson = 'GreatGrandson',
    Aunt = 'Aunt',
    Uncle = 'Uncle',
    GreatAunt = 'GreatAunt',
    GreatUncle = 'GreatUncle',
    Niece = 'Niece',
    Nephew = 'Nephew',
    Cousin = 'Cousin',
    Friend = 'Friend',
    Coworker = 'Coworker',
    Mentor = 'Mentor',
    Teacher = 'Teacher',
    Boss = 'Boss',
    MotherInLaw = 'MotherInLaw',
    FatherInLaw = 'FatherInLaw',
    SisterInLaw = 'SisterInLaw',
    BrotherInLaw = 'BrotherInLaw',
    StepMother = 'StepMother',
    StepFather = 'StepFather',
    StepSister = 'StepSister',
    StepBrother = 'StepBrother',
    StepDaughter = 'StepDaughter',
    StepSon = 'StepSon',
    Godmother = 'Godmother',
    Godfather = 'Godfather',
    Godchild = 'Godchild',
    Other = 'Other'
  }
  
  export interface PersonTag {
    id: string;
    name: string;
    relation: PersonRelation;
    profileSharerId: string;
    createdAt: Date;
    updatedAt?: Date | null;
    // Relationships
    ProfileSharer?: ProfileSharer;
    PromptResponseAttachmentPersonTag?: PromptResponseAttachmentPersonTag[];
  }
  
  export interface PromptResponseAttachmentPersonTag {
    id: string;
    promptResponseAttachmentId: string;
    personTagId: string;
    createdAt: Date;
    updatedAt?: Date | null;
    // Relationships
    PromptResponseAttachment?: PromptResponseAttachment;
    PersonTag?: PersonTag;
  }
  
  export type UserRole = 'SHARER' | 'EXECUTOR' | 'LISTENER';
  
  export interface TopicFavorite {
    id: string;
    profileId: string;
    promptCategoryId: string;
    role: 'SHARER' | 'EXECUTOR';
    sharerId?: string;
    executorId?: string;
    createdAt: string;
    updatedAt: string;
  }
  
  export interface TopicQueueItem {
    id: string;
    profileId: string;
    promptCategoryId: string;
    role: 'SHARER' | 'EXECUTOR';
    sharerId?: string;
    executorId?: string;
    createdAt: string;
    updatedAt: string;
  }
  
  // Include other interfaces as needed, such as Invitation, ResponsePermission, VideoTranscript, etc.