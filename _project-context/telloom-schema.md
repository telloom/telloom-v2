# Telloom Database Schema Documentation

## Overview

This document provides a comprehensive overview of the Telloom database schema, including tables, relationships, and data types.

## Core Tables

### Profile
Core user information and authentication
- `id` (uuid, PK)
- `fullName` (text, nullable)
- `username` (text, unique, nullable)
- `avatarUrl` (text, nullable)
- `email` (text, unique, nullable)
- `passwordHash` (text, unique, nullable)
- `firstName` (text, nullable)
- `lastName` (text, nullable)
- `phone` (text, nullable)
- `revenuecatAppUserId` (text, nullable)
- `status` (text, nullable)
- `isAdmin` (boolean, default: false)
- `createdAt` (timestamptz)
- `updatedAt` (timestamptz)

Address Fields:
- `addressStreet` (text, nullable)
- `addressUnit` (text, nullable)
- `addressCity` (text, nullable)
- `addressState` (text, nullable)
- `addressZipcode` (text, nullable)

Executor Fields:
- `executorFirstName` (text, nullable)
- `executorLastName` (text, nullable)
- `executorRelation` (text, nullable)
- `executorPhone` (text, nullable)
- `executorEmail` (text, nullable)

### ProfileRole
User role assignments
- `id` (uuid, PK)
- `profileId` (uuid, FK -> Profile)
- `role` (enum: LISTENER, SHARER, EXECUTOR, ADMIN)

### ProfileSharer
Extended profile for users with Sharer role
- `id` (uuid, PK)
- `profileId` (uuid, FK -> Profile, unique)
- `subscriptionStatus` (boolean)
- `createdAt` (timestamptz)

### ProfileListener
Relationship between Listeners and Sharers
- `id` (uuid, PK)
- `listenerId` (uuid, FK -> Profile)
- `sharerId` (uuid, FK -> ProfileSharer)
- `sharedSince` (timestamptz)
- `hasAccess` (boolean, default: true)
- `lastViewed` (timestamp)
- `notifications` (boolean, default: true)
- `createdAt` (timestamptz)
- `updatedAt` (timestamptz)

### ProfileExecutor
Relationship between Executors and Sharers
- `id` (uuid, PK)
- `sharerId` (uuid, FK -> ProfileSharer, unique)
- `executorId` (uuid, FK -> Profile)
- `createdAt` (timestamptz)

## Content Tables

### Prompt
Question prompts for video responses
- `id` (uuid, PK)
- `promptText` (varchar(255))
- `promptType` (varchar(255), default: "default")
- `isContextEstablishing` (boolean, default: false)
- `isObjectPrompt` (boolean, nullable)
- `promptCategoryId` (uuid, FK -> PromptCategory)
- `search_vector` (tsvector)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

### PromptCategory
Categories for organizing prompts
- `id` (uuid, PK)
- `category` (text, nullable)
- `description` (text, nullable)
- `theme` (enum: LIFE_EXPERIENCES, HEALTH_AND_WELLBEING, etc.)
- `createdAt` (timestamptz)
- `updatedAt` (timestamptz)

### PromptResponse
User responses to prompts
- `id` (uuid, PK)
- `profileSharerId` (uuid, FK -> ProfileSharer)
- `videoId` (uuid, FK -> Video, unique)
- `promptId` (uuid, FK -> Prompt)
- `privacyLevel` (text, default: "Private")
- `summary` (text, nullable)
- `responseNotes` (text, nullable)
- `search_vector` (tsvector)
- `createdAt` (timestamptz)
- `updatedAt` (timestamptz)

## Video Management

### Video
Video content and metadata
- `id` (uuid, PK)
- `profileSharerId` (uuid, FK -> ProfileSharer)
- `promptId` (uuid, FK -> Prompt)
- `muxAssetId` (text, unique)
- `muxPlaybackId` (text, unique)
- `muxUploadId` (text, unique)
- `passthrough` (text, unique)
- `duration` (float)
- `aspectRatio` (text)
- `videoQuality` (text)
- `maxWidth` (decimal)
- `maxHeight` (decimal)
- `maxFrameRate` (decimal)
- `languageCode` (text)
- `resolutionTier` (text)
- `status` (enum: WAITING, PREPARING, ASSET_CREATED, READY, ERRORED)
- `dateRecorded` (timestamptz)
- `createdAt` (timestamptz)
- `updatedAt` (timestamptz)

### VideoTranscript
Transcriptions of video content
- `id` (uuid, PK)
- `videoId` (uuid, FK -> Video, unique)
- `transcript` (text)
- `source` (text)
- `type` (text)
- `language` (text)
- `name` (text)
- `muxTrackId` (text)
- `muxAssetId` (text)
- `createdAt` (timestamptz)
- `updatedAt` (timestamptz)

## Topic Videos

### TopicVideo
Videos organized by topic
- `id` (uuid, PK)
- `title` (text)
- `description` (text)
- `profileSharerId` (uuid, FK -> ProfileSharer)
- `promptCategoryId` (uuid, FK -> PromptCategory)
- Similar video fields to Video table
- `metadata` (jsonb)
- `summary` (text)
- `errorMessage` (text)

### TopicVideoTranscript
Transcriptions for topic videos
- Similar fields to VideoTranscript
- `topicVideoId` (uuid, FK -> TopicVideo)

## Attachments and Tags

### PromptResponseAttachment
Files attached to prompt responses
- `id` (uuid, PK)
- `promptResponseId` (uuid, FK -> PromptResponse)
- `profileSharerId` (uuid, FK -> ProfileSharer)
- `fileUrl` (text)
- `fileType` (text)
- `fileName` (text)
- `fileSize` (integer)
- `title` (text)
- `description` (text)
- `estimatedYear` (integer)
- `dateCaptured` (date)
- `yearCaptured` (integer)
- `uploadedAt` (timestamptz)

### PersonTag
People tagged in attachments
- `id` (uuid, PK)
- `name` (text)
- `profileSharerId` (uuid, FK -> ProfileSharer)
- `relation` (enum: various family/relationship types)
- `createdAt` (timestamptz)
- `updatedAt` (timestamptz)

## User Interactions

### PromptResponseFavorite
Favorited prompt responses
- `id` (uuid, PK)
- `profileId` (uuid, FK -> Profile)
- `promptResponseId` (uuid, FK -> PromptResponse)
- `favoritedAt` (timestamptz)

### PromptResponseRecentlyWatched
Recently watched prompt responses
- `id` (uuid, PK)
- `profileId` (uuid, FK -> Profile)
- `promptResponseId` (uuid, FK -> PromptResponse)
- `watchedAt` (timestamptz)

### TopicFavorite
Favorited topics
- `id` (uuid, PK)
- `profileId` (uuid, FK -> Profile)
- `promptCategoryId` (uuid, FK -> PromptCategory)
- `createdAt` (timestamptz)

## Access Control

### Invitation
System for inviting users
- `id` (uuid, PK)
- `sharerId` (uuid, FK -> ProfileSharer)
- `inviterId` (uuid, FK -> Profile)
- `inviteeEmail` (text)
- `role` (enum: LISTENER, SHARER, EXECUTOR, ADMIN)
- `status` (enum: PENDING, ACCEPTED, DECLINED, EXPIRED)
- `token` (text, unique)
- `createdAt` (timestamptz)
- `updatedAt` (timestamptz)
- `acceptedAt` (timestamp)

### FollowRequest
Requests to follow sharers
- `id` (uuid, PK)
- `sharerId` (uuid, FK -> ProfileSharer)
- `requestorId` (uuid, FK -> Profile)
- `status` (enum: PENDING, APPROVED, DENIED)
- `createdAt` (timestamptz)
- `updatedAt` (timestamptz)
- `approvedAt` (timestamptz)
- `deniedAt` (timestamptz)

## Subscription Management

### Subscription
User subscriptions
- `id` (uuid, PK)
- `revenuecatId` (text)
- `userId` (uuid)
- `productId` (uuid, FK -> Product)
- `startsAt` (timestamptz)
- `currentPeriodStartsAt` (timestamptz)
- `currentPeriodEndsAt` (timestamptz)
- `givesAccess` (boolean)
- `autoRenewalStatus` (text)
- `status` (text)
- `store` (text)
- `environment` (text)
- `storeSubscriptionIdentifier` (text)
- `createdAt` (timestamptz)
- `updatedAt` (timestamptz)

### Product
Subscription products
- `id` (uuid, PK)
- `revenuecatId` (text)
- `storeIdentifier` (text)
- `type` (text)
- `displayName` (text)
- `createdAt` (timestamptz)
- `updatedAt` (timestamptz)

### Entitlement
Subscription entitlements
- `id` (uuid, PK)
- `revenuecatId` (text)
- `lookupKey` (text)
- `displayName` (text)
- `createdAt` (timestamptz)
- `updatedAt` (timestamptz)

## Downloads

### VideoDownload
Video download tracking
- `id` (uuid, PK)
- `profileId` (uuid, FK -> Profile)
- `muxAssetId` (text)
- `quality` (text, default: "high")
- `downloadedAt` (timestamptz)
- `status` (text, default: "preparing")
- `retries` (integer, default: 0)
- `last_attempted` (timestamptz)

### TopicVideoDownload
Topic video download tracking
- Similar fields to VideoDownload

## Enums

### Role
- LISTENER
- SHARER
- EXECUTOR
- ADMIN

### Theme
- LIFE_EXPERIENCES
- HEALTH_AND_WELLBEING
- WELLBEING
- BUSINESS
- FOOD
- CUSTOM
- VALUES_AND_BELIEFS
- PERSONAL_HISTORY
- CAREER_AND_EDUCATION
- CHALLENGES_AND_RESILIENCE
- RELATIONSHIPS_AND_COMMUNITY
- HOBBIES_AND_INTERESTS
- CULTURAL_AND_HERITAGE

### VideoStatus
- WAITING
- PREPARING
- ASSET_CREATED
- READY
- ERRORED

### InvitationStatus
- PENDING
- ACCEPTED
- DECLINED
- EXPIRED

### person_relation
Various family and relationship types (Spouse, Partner, Mother, Father, etc.)

### follow_request_status
- PENDING
- APPROVED
- DENIED

## Database Triggers

### Auth Schema Triggers
- `on_auth_user_created`: Executes after INSERT on `auth.users` to handle new user creation

### PgSodium Schema Triggers
- `key_encrypt_secret_trigger_raw_key`: Executes before INSERT/UPDATE on `pgsodium.key` to encrypt raw keys

### Public Schema Triggers
- `handle_approved_follow_request`: Executes after UPDATE on `FollowRequest` to handle approved follow requests
- `update_follow_request_status_timestamps`: Executes before UPDATE on `FollowRequest` to update status timestamps
- `update_follow_request_updated_at`: Executes before UPDATE on `FollowRequest` to update the updated_at timestamp
- `full_name_update`: Executes before UPDATE of firstName/lastName on `Profile` to update full name
- `profile_updated`: Executes before UPDATE on `Profile` to handle profile updates
- `prompt_search_vector_update`: Executes before INSERT/UPDATE on `Prompt` to update search vector
- `prompt_response_search_vector_update`: Executes before INSERT/UPDATE on `PromptResponse` to update search vector
- `topicvideotranscript_updated`: Executes before UPDATE on `TopicVideoTranscript` to update timestamps
- `set_video_date_recorded_trigger`: Executes before INSERT on `Video` to set recording date

### Realtime Schema Triggers
- `tr_check_filters`: Executes before INSERT/UPDATE on `realtime.subscription` to check filters

### Storage Schema Triggers
- `update_objects_updated_at`: Executes before UPDATE on `storage.objects` to update timestamps

### Vault Schema Triggers
- `secrets_encrypt_secret_trigger_secret`: Executes before INSERT/UPDATE on `vault.secrets` to encrypt secrets

## Database Functions

### Auth Functions
- `email()`: Returns the current user's email from JWT claims
- `jwt()`: Returns the current JWT claims as jsonb
- `role()`: Returns the current user's role from JWT claims
- `uid()`: Returns the current user's UUID from JWT claims

### Public Schema Functions

#### User Management
- `handle_new_user()`: Creates Profile record and assigns initial LISTENER role
- `handle_profile_updated()`: Updates timestamp when profile is modified
- `update_full_name()`: Updates fullName when firstName or lastName changes

#### Access Control
- `has_role(user_id uuid, role_name text)`: Checks if user has specific role
- `is_admin()`: Checks if current user is admin
- `is_admin(user_id uuid)`: Checks if specified user is admin
- `is_executor_for(executor_id uuid, sharer_id uuid)`: Checks executor relationship
- `is_listener_for(listener_id uuid, sharer_id uuid)`: Checks listener relationship

#### Invitation Management
- `accept_invitation_by_token(p_token text)`: Processes invitation acceptance
- `cancel_invitation(p_invitation_id uuid)`: Cancels pending invitation
- `create_invitation(p_sharer_id uuid, p_invitee_email text, p_role text)`: Creates new invitation
- `generate_invitation_token()`: Generates secure invitation token
- `handle_invitation_acceptance(invitation_id uuid)`: Processes invitation acceptance
- `resend_invitation(p_invitation_id uuid)`: Regenerates and updates invitation token

#### Follow Request Management
- `handle_follow_request(sharer_id uuid)`: Creates new follow request
- `handle_follow_request_response(request_id uuid, should_approve boolean)`: Processes follow request response
- `handle_approved_follow_request()`: Updates relationships after follow request approval
- `update_follow_request_status_timestamps()`: Manages follow request timestamps
- `update_follow_request_updated_at()`: Updates follow request timestamp

#### Content Management
- `generate_attachment_filename(...)`: Generates standardized attachment filenames
- `get_topic_name(prompt_response_id uuid)`: Retrieves topic name for prompt response
- `get_sharer_topic_progress(...)`: Calculates topic completion progress
- `prompt_response_search_update()`: Updates search vectors for prompt responses
- `set_video_date_recorded()`: Sets video recording date
- `slugify(text)`: Converts text to URL-friendly format

### Storage Functions
- `can_insert_object(...)`: Validates object insertion
- `extension(name text)`: Extracts file extension
- `filename(name text)`: Extracts filename
- `foldername(name text)`: Extracts folder path
- `get_size_by_bucket()`: Calculates storage usage by bucket
- `search(...)`: Searches objects with filtering and pagination
- `update_updated_at_column()`: Updates timestamp on object changes

### Vault Functions
- `create_secret(...)`: Creates new encrypted secret
- `update_secret(...)`: Updates existing secret
- `secrets_encrypt_secret_secret()`: Handles secret encryption

### Realtime Functions
- `apply_rls(...)`: Applies row-level security to changes
- `broadcast_changes(...)`: Broadcasts database changes
- `subscription_check_filters()`: Validates subscription filters
- `topic()`: Gets current realtime topic

## Database Policies

### Profile Policies
- `Admins can do anything`: Full access for admin users
- `Allow individual users to SELECT their own profile`: Users can view their own profile
- `Allow individual users to UPDATE their own profile`: Users can update their own profile
- `Users can insert own profile`: Users can create their own profile
- `Users can update own profile`: Users can modify their own profile
- `Users can view own profile`: Users can view their own profile details

### ProfileRole Policies
- `Admins can do anything`: Full access for admin users
- `Users can delete own roles`: Users can remove their own roles
- `Users can insert own roles`: Users can add roles to their profile
- `Users can update own roles`: Users can modify their own roles
- `Users can view own roles`: Users can view their assigned roles
- `prevent_self_admin_elevation`: Prevents users from self-assigning admin role

### ProfileSharer Policies
- `Admins can do anything`: Full access for admin users
- `Enable read access for authenticated users`: Authenticated users can view sharer profiles
- `Sharers can access their own ProfileSharer`: Sharers can manage their own profile
- `Users can delete/insert/update/view own sharer profile`: Basic CRUD operations for users on their sharer profile

### ProfileListener Policies
- `Admins can do anything`: Full access for admin users
- `Executors can manage listener relationships`: Executors can manage listener access
- `Listeners can access their own follow records`: Listeners can manage their follows
- `Sharers can view their followers`: Sharers can see who follows them
- `Users can manage/view listener relationships`: Users can manage their listener relationships

### ProfileExecutor Policies
- `Admins can do anything`: Full access for admin users
- `Executors can access their own executor records`: Executors can manage their records
- `Sharers can view their assigned executor`: Sharers can view their executors
- `Users can manage/view executor relationships`: Users can manage executor relationships

### Video Content Policies
- `Admins can do anything`: Full access for admin users
- `Executors can manage videos`: Executors can manage video content
- `Listeners can view videos from sharers they follow`: Listeners can access followed sharers' videos
- `Service role can manage all videos`: Service role has full access
- `Sharers can access their own videos`: Sharers can manage their videos
- `Users can manage/view own videos`: Users can manage their video content

### Storage Policies
- `Allow authenticated uploads`: Authenticated users can upload files
- `Avatar images are publicly accessible`: Public access to avatar images
- `Users can delete their own avatar`: Users can remove their avatars
- `Users can upload their own avatar`: Users can set their avatars
- `Users can manage their own attachments`: Users can manage their file attachments

## Database Functions

### Authentication Functions
- `is_admin()`: Checks if the current user is an admin
- `has_role(user_id, role_name)`: Checks if a user has a specific role
- `handle_new_user()`: Sets up a new user's profile and initial role

### User Management Functions
- `accept_invitation_by_token(token)`: Processes invitation acceptance
- `create_invitation(sharer_id, invitee_email, role)`: Creates new invitations
- `handle_invitation_acceptance(invitation_id)`: Handles accepted invitations
- `resend_invitation(invitation_id)`: Resends an invitation
- `handle_follow_request(sharer_id)`: Creates follow requests
- `handle_follow_request_response(request_id, should_approve)`: Processes follow request responses

### Access Control Functions
- `is_active_executor_for(executor_id, profile_sharer_id)`: Checks executor status
- `is_executor_for(executor_id, sharer_id)`: Verifies executor relationship
- `is_listener_for(listener_id, sharer_id)`: Verifies listener relationship
- `revoke_executor_access(executor_id, sharer_id)`: Removes executor access
- `revoke_listener_access(listener_id, sharer_id)`: Removes listener access

### Content Management Functions
- `generate_attachment_filename()`: Generates filenames for attachments
- `get_topic_name(prompt_response_id)`: Retrieves topic name
- `get_sharer_topic_progress()`: Calculates topic completion progress
- `slugify(text)`: Converts text to URL-friendly format

## Database Triggers

### Profile Triggers
- `handle_profile_updated`: Updates timestamp when profile is modified
- `update_full_name`: Automatically updates full name when first/last name changes

### Follow Request Triggers
- `handle_approved_follow_request`: Creates listener relationship on approval
- `update_follow_request_status_timestamps`: Updates status change timestamps
- `update_follow_request_updated_at`: Updates the last modified timestamp

### Video Triggers
- `set_video_date_recorded`: Sets recording date if not provided
- `update_topicvideotranscript_updated_at`: Updates transcript modification time

### Search Triggers
- `prompt_response_search_update`: Updates search vector for prompt responses
- `update_prompt_search_vector`: Updates search vector for prompts 