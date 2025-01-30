# Schema Summary

## Overview

The schema models a platform where users can assume multiple roles and interact with content, subscriptions, and other users. The main components are:

- User Profiles and Roles
- Content Models (Videos, Prompts, Responses)
- Subscription and Purchase Models
- Auxiliary Models

## Models and Relationships

### 1. User Profiles and Roles

#### Profile
- Core user information
- Key Fields:
  - Personal info: fullName, firstName, lastName, email, phone
  - Authentication: passwordHash
  - Address fields: addressStreet, addressUnit, addressCity, addressState, addressZipcode
  - Executor info: executorFirstName, executorLastName, executorRelation, executorPhone, executorEmail
  - System fields: isAdmin, revenuecatAppUserId, status
- Relationships:
  - roles: Links to ProfileRole
  - profileSharer: If user is a Sharer
  - executorForSharers: Sharers for whom user is an Executor
  - followings: Sharers user follows as a Listener

#### Role Enum
- Possible roles:
  - LISTENER: Views content from followed Sharers
  - SHARER: Creates and shares content
  - EXECUTOR: Manages Sharer's content after passing
  - ADMIN: Administrative privileges

#### ProfileRole
- Connects Profile and Role (many-to-many)
- Ensures each role is assigned only once per user

#### ProfileSharer
- Extends Profile for Sharers
- Fields:
  - subscriptionStatus: Boolean indicating subscription state
- Relationships:
  - executorAssignment: Assigned Executor
  - followers: Listeners following this Sharer
  - Content: videos, promptResponses, etc.

#### ProfileExecutor
- Represents Sharer-Executor relationship
- Each Sharer can have one Executor
- An Executor can manage content for multiple Sharers

#### ProfileListener
- Manages Listener-Sharer relationships
- Fields:
  - hasAccess: Boolean for access control
  - sharedSince: Timestamp of relationship start
  - notifications: Boolean for notification preferences
  - lastViewed: Timestamp of last view

#### Invitation
- Handles invitations for potential Listeners or Executors
- Fields:
  - inviteeEmail: Target email
  - role: LISTENER or EXECUTOR
  - status: PENDING, ACCEPTED, DECLINED, EXPIRED
  - token: Unique invitation identifier

### 2. Content Models

#### Prompt
- Represents questions for Sharers
- Fields:
  - promptText: The actual question
  - promptType: Type of prompt
  - isContextEstablishing: Boolean flag
  - isObjectPrompt: Boolean for object-related prompts
  - search_vector: For text search functionality

#### PromptCategory
- Organizes prompts into categories
- Fields:
  - category: Category name
  - description: Category description
  - theme: Theme classification

#### PromptResponse
- Contains Sharer's response to a prompt
- Fields:
  - privacyLevel: Visibility setting
  - responseNotes: Text response
  - summary: Response summary
  - search_vector: For text search
- Relationships:
  - video: Optional video response
  - attachments: Related files
  - permissions: Access control
  - viewedBy: Tracking views

#### Video and TopicVideo
- Represents video content
- Fields:
  - Mux integration: muxAssetId, muxPlaybackId, muxUploadId
  - Technical details: duration, aspectRatio, quality, dimensions
  - Metadata: title, description, status
- Related Models:
  - VideoTranscript/TopicVideoTranscript: Stores transcriptions
  - VideoDownload/TopicVideoDownload: Tracks downloads

#### PromptResponseAttachment
- Manages files attached to responses
- Fields:
  - File info: fileUrl, fileType, fileName, fileSize
  - Metadata: title, description, dateCaptured
- Related Models:
  - PromptResponseAttachmentPersonTag: Links people to attachments

#### PersonTag
- Tags people in attachments
- Fields:
  - name: Person's name
  - relation: Relationship type

### 3. Subscription and Purchase Models

#### Product
- Purchasable items
- Fields:
  - RevenueCat integration: revenuecatId, storeIdentifier
  - displayName: Product name

#### Package
- Bundles products under offerings
- Fields:
  - RevenueCat details: revenuecatId, lookupKey
  - position: Display order

#### Offering
- Collection of packages
- Fields:
  - isCurrent: Active status flag
  - displayName: Offering name

#### Subscription
- Tracks user subscriptions
- Fields:
  - Timing: startsAt, currentPeriodStartsAt, currentPeriodEndsAt
  - Status: givesAccess, autoRenewalStatus
  - Store details: store, environment

#### Purchase
- Records user purchases
- Fields:
  - Transaction details: purchasedAt, revenueInUsd
  - Store info: store, environment

### 4. Auxiliary Models

#### Object and ObjectCategory
- Object: Significant items (e.g., heirlooms)
- ObjectCategory: Categories for objects
- Links objects to PromptResponses

#### TopicFavorite and TopicQueueItem
- Manage user interactions with topics
- Track favorites and queued topics

#### Engagement Tracking
- PromptResponseFavorite: Tracks favorites
- PromptResponseRecentlyWatched: Records viewing history

## Security and Access Control

The schema implements comprehensive row-level security through policies:

1. Profile-based Access:
   - Users can only access their own profile data
   - Admins have full access across all models

2. Role-based Permissions:
   - Sharers can manage their own content
   - Listeners can view content from followed Sharers
   - Executors can manage assigned Sharers' content

3. Content Privacy:
   - PromptResponses have privacy levels
   - Attachments inherit parent response privacy
   - Videos require proper relationship access

4. Subscription Management:
   - Users can only access their own subscription data
   - Purchase records are user-scoped

## Database Functions

Key functions include:

- User Management: handle_new_user, update_full_name
- Content Processing: update_prompt_search_vector, prompt_response_search_update
- Access Control: is_admin
- File Management: generate_attachment_filename, slugify
- Progress Tracking: get_sharer_topic_progress

## Indexes and Search

The schema includes:
- Full-text search capabilities (search_vector columns)
- Timestamp tracking for all major entities
- Efficient querying through strategic indexing
