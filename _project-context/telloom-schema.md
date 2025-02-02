# Telloom Database Schema Documentation

This document provides a concise yet comprehensive overview of the **Telloom** database schema, including its core tables, relationships, content management structures, user interactions, access control, subscription management, and the key policies/functions/triggers that govern the system. Where relevant, columns and tables are annotated with `PK` (primary key), `FK` (foreign key), `unique`, `nullable`, and default values.

---

## Overview

Telloom’s database supports:
- **User Profiles, Roles, and Relationships** (Sharer, Listener, Executor, Admin)
- **Content Management** (Prompts, Responses, Videos, Transcripts, Attachments)
- **Access Control** (Invitations, Follow Requests, Row-Level Security)
- **Subscription Management** (Products, Offerings, Purchases, Subscriptions, Entitlements)
- **Object / Attachment Storage** and tagging
- **Download Tracking**
- **Real-time event triggers and user-defined functions**

Where possible, tables have **Row-Level Security (RLS)** enabled with explicit policies, ensuring only the right users can access or modify each record.

---

## Core Tables

### 1. Profile

Stores core user information and authentication details.

| Column               | Type                       | Notes/Constraints                      |
|----------------------|----------------------------|----------------------------------------|
| **id**              | `uuid` (PK)                |                                         |
| **fullName**         | `text` (nullable)          | Combined first/last name trigger-updated |
| **username**         | `text` (unique, nullable)  |                                         |
| **avatarUrl**        | `text` (nullable)          |                                         |
| **email**            | `text` (unique, nullable)  |                                         |
| **passwordHash**     | `text` (unique, nullable)  |                                         |
| **firstName**        | `text` (nullable)          |                                         |
| **lastName**         | `text` (nullable)          |                                         |
| **phone**            | `text` (nullable)          |                                         |
| **revenuecatAppUserId** | `text` (nullable)      |                                         |
| **status**           | `text` (nullable)          |                                         |
| **isAdmin**          | `boolean` (default: false) |                                         |
| **airtableRecordId** | `text` (nullable)          | External reference if needed           |
| **addressStreet**    | `text` (nullable)          |                                         |
| **addressUnit**      | `text` (nullable)          |                                         |
| **addressCity**      | `text` (nullable)          |                                         |
| **addressState**     | `text` (nullable)          |                                         |
| **addressZipcode**   | `text` (nullable)          |                                         |
| **executorFirstName**| `text` (nullable)          |                                         |
| **executorLastName** | `text` (nullable)          |                                         |
| **executorRelation** | `text` (nullable)          |                                         |
| **executorPhone**    | `text` (nullable)          |                                         |
| **executorEmail**    | `text` (nullable)          |                                         |
| **createdAt**        | `timestamptz`              |                                         |
| **updatedAt**        | `timestamptz`              |                                         |

> **Triggers**  
> - `full_name_update`: Before UPDATE of `firstName`/`lastName` to update `fullName`.  
> - `profile_updated`: Before UPDATE to set `updatedAt`.

---

### 2. ProfileRole

Assigns user roles (LISTENER, SHARER, EXECUTOR, ADMIN).

| Column      | Type         | Notes/Constraints                 |
|-------------|-------------|-----------------------------------|
| **id**      | `uuid` (PK)  |                                   |
| **profileId** | `uuid` (FK → Profile) |                         |
| **role**    | `enum`       | One of LISTENER, SHARER, EXECUTOR, ADMIN |

---

### 3. ProfileSharer

Extended profile info for users with the **SHARER** role.

| Column              | Type         | Notes/Constraints                       |
|---------------------|-------------|-----------------------------------------|
| **id**             | `uuid` (PK)  |                                         |
| **profileId**      | `uuid` (FK → Profile, unique) | One Sharer record per Profile |
| **subscriptionStatus** | `boolean` | Indicates if subscription is active     |
| **createdAt**       | `timestamptz` |                                         |

---

### 4. ProfileListener

Links **LISTENER** profiles to the **SHARER** they’re following.

| Column        | Type         | Notes/Constraints                          |
|---------------|-------------|--------------------------------------------|
| **id**        | `uuid` (PK)  |                                            |
| **listenerId**| `uuid` (FK → Profile) |                                    |
| **sharerId**  | `uuid` (FK → ProfileSharer) |                             |
| **sharedSince** | `timestamptz` | Date added/approved for listening       |
| **hasAccess** | `boolean` (default: true) | Toggle if listener can access sharer content |
| **lastViewed** | `timestamp` (nullable)   |                                  |
| **notifications** | `boolean` (default: true) | Email/Push notifications?    |
| **createdAt** | `timestamptz`             |                                  |
| **updatedAt** | `timestamptz`             |                                  |

---

### 5. ProfileExecutor

Links **EXECUTOR** to a **SHARER**.

| Column      | Type         | Notes/Constraints                       |
|-------------|-------------|-----------------------------------------|
| **id**      | `uuid` (PK)  |                                         |
| **sharerId**| `uuid` (FK → ProfileSharer, unique) | One executor per sharer optional |
| **executorId** | `uuid` (FK → Profile) |                               |
| **createdAt** | `timestamptz` |                                        |

---

## Content Tables

### Prompt

Stores question prompts for video responses.

| Column                | Type               | Notes/Constraints                          |
|-----------------------|--------------------|--------------------------------------------|
| **id**               | `uuid` (PK)        |                                            |
| **promptText**        | `varchar(255)`     |                                            |
| **promptType**        | `varchar(255)` (default: `"default"`) |           |
| **isContextEstablishing** | `boolean` (default: false) | For specialized prompts |
| **isObjectPrompt**    | `boolean` (nullable) |                                            |
| **promptCategoryId**  | `uuid` (FK → PromptCategory) | Category of the prompt   |
| **airtableId**        | `varchar` (nullable) | External reference                        |
| **categoryAirtableId**| `varchar` (nullable) | External reference for category           |
| **search_vector**     | `tsvector`         | Indexed full-text search                  |
| **createdAt**         | `timestamp`        |                                            |
| **updatedAt**         | `timestamp`        |                                            |

> **Trigger**  
> - `prompt_search_vector_update`: Before INSERT/UPDATE to fill `search_vector`.

---

### PromptCategory

Organizes prompts by category (themes).

| Column      | Type         | Notes/Constraints                           |
|-------------|-------------|---------------------------------------------|
| **id**      | `uuid` (PK)  |                                             |
| **category** | `text` (nullable) | Category name                          |
| **description** | `text` (nullable) |                                     |
| **theme**   | `enum`       | E.g., LIFE_EXPERIENCES, HEALTH_AND_WELLBEING |
| **airtableId** | `text` (nullable) | External reference                   |
| **createdAt** | `timestamptz` |                                          |
| **updatedAt** | `timestamptz` |                                          |

---

### PromptResponse

User’s response to a specific prompt.

| Column           | Type          | Notes/Constraints                                 |
|------------------|--------------|---------------------------------------------------|
| **id**           | `uuid` (PK)   |                                                  |
| **profileSharerId** | `uuid` (FK → ProfileSharer) | Owned by sharer                |
| **videoId**      | `uuid` (FK → Video, unique) | 1:1 link to a recorded video    |
| **promptId**     | `uuid` (FK → Prompt)       | Prompt question                 |
| **privacyLevel** | `text` (default: `"Private"`) | Could be Public/Private/Custom? |
| **search_vector** | `tsvector`   | For full-text search                           |
| **summary**      | `text` (nullable)           | Summarized response content         |
| **responseNotes** | `text` (nullable)          | Additional user notes               |
| **airtableRecordId** | `text` (nullable)       | External reference if needed        |
| **createdAt**    | `timestamptz`              |                                       |
| **updatedAt**    | `timestamptz`              |                                       |

> **Trigger**  
> - `prompt_response_search_vector_update`: Before INSERT/UPDATE to update `search_vector`.

---

## Video Management

### Video

Stores metadata for user-recorded videos tied to prompts.

| Column            | Type            | Notes/Constraints                                              |
|-------------------|----------------|---------------------------------------------------------------|
| **id**            | `uuid` (PK)     |                                                               |
| **profileSharerId** | `uuid` (FK → ProfileSharer) | Sharer who owns the video                              |
| **promptId**      | `uuid` (FK → Prompt) | If tied directly to a prompt (sometimes optional)        |
| **muxAssetId**    | `text` (unique) | Mux asset ID used in streaming                               |
| **muxPlaybackId** | `text` (unique) | Mux playback ID                                              |
| **muxUploadId**   | `text` (unique) | Mux upload ID                                                |
| **passthrough**   | `text` (unique) | Custom passthrough field for Mux                             |
| **duration**      | `double precision` | Video duration in seconds                                 |
| **aspectRatio**   | `text`          |                                                               |
| **videoQuality**  | `text`          |                                                               |
| **maxWidth**      | `numeric`       |                                                               |
| **maxHeight**     | `numeric`       |                                                               |
| **maxFrameRate**  | `numeric`       |                                                               |
| **languageCode**  | `text`          |                                                               |
| **resolutionTier**| `text`          |                                                               |
| **status**        | `enum`          | WAITING, PREPARING, ASSET_CREATED, READY, ERRORED            |
| **airtableRecordId** | `text` (nullable) | External reference                                        |
| **dateRecorded**  | `timestamptz`   | Defaults to `createdAt` if null                              |
| **createdAt**     | `timestamptz`   |                                                               |
| **updatedAt**     | `timestamptz`   |                                                               |

> **Trigger**  
> - `set_video_date_recorded_trigger`: Before INSERT to set `dateRecorded` to `createdAt` if null.

---

### VideoTranscript

Tracks transcriptions for a **Video**.

| Column        | Type        | Notes/Constraints                          |
|---------------|------------|--------------------------------------------|
| **id**        | `uuid` (PK) |                                           |
| **videoId**   | `uuid` (FK → Video, unique) | 1:1 transcript possibly      |
| **transcript**| `text`      | Full transcript text                       |
| **source**    | `text`      | E.g., Mux, manual, etc.                   |
| **type**      | `text`      |                                           |
| **language**  | `text`      |                                           |
| **name**      | `text`      |                                           |
| **muxTrackId**| `text`      |                                           |
| **muxAssetId**| `text`      |                                           |
| **createdAt** | `timestamptz` |                                         |
| **updatedAt** | `timestamptz` |                                         |

---

## Topic Videos

### TopicVideo

“Standalone” videos organized by topic (not necessarily a direct Prompt→Response link).

| Column            | Type            | Notes/Constraints                                |
|-------------------|----------------|-------------------------------------------------|
| **id**            | `uuid` (PK)     |                                               |
| **title**         | `text`          |                                               |
| **description**   | `text`          |                                               |
| **profileSharerId** | `uuid` (FK → ProfileSharer) | Owner sharer                          |
| **promptCategoryId** | `uuid` (FK → PromptCategory) | Topic category reference           |
| **muxAssetId**    | `text` (unique) | Similar Mux fields as Video                    |
| **muxPlaybackId** | `text` (unique) |                                               |
| **muxUploadId**   | `text` (unique) |                                               |
| **passthrough**   | `text` (unique) |                                               |
| **duration**      | `double precision` | Video length                                |
| **aspectRatio**   | `text`          |                                               |
| **videoQuality**  | `text`          |                                               |
| **maxWidth**      | `numeric`       |                                               |
| **maxHeight**     | `numeric`       |                                               |
| **maxFrameRate**  | `numeric`       |                                               |
| **languageCode**  | `text`          |                                               |
| **resolutionTier**| `text`          |                                               |
| **url**           | `text` (nullable) | External URL if needed                      |
| **metadata**      | `jsonb`         | Arbitrary JSON data                          |
| **airtableRecordId** | `text`       | External reference                          |
| **status**        | `enum` (VideoStatus) | WAITING, READY, etc.                     |
| **summary**       | `text`          | Summaries if any                             |
| **errorMessage**  | `text`          | If an error occurred with Mux, etc.          |
| **dateRecorded**  | `timestamptz`   |                                               |
| **createdAt**     | `timestamptz`   |                                               |
| **updatedAt**     | `timestamptz`   |                                               |

---

### TopicVideoTranscript

Transcriptions of a **TopicVideo**.

| Column           | Type        | Notes/Constraints                        |
|------------------|------------|------------------------------------------|
| **id**           | `uuid` (PK) |                                          |
| **topicVideoId** | `uuid` (FK → TopicVideo) |                              |
| **transcript**   | `text`      | Full transcript                          |
| **source**       | `text`      |                                          |
| **type**         | `text`      |                                          |
| **language**     | `text`      |                                          |
| **name**         | `text`      |                                          |
| **muxTrackId**   | `text`      |                                          |
| **muxAssetId**   | `text`      |                                          |
| **createdAt**    | `timestamptz` |                                        |
| **updatedAt**    | `timestamptz` |                                        |

---

## Attachments and Tags

### PromptResponseAttachment

Files attached to **PromptResponse** records.

| Column                 | Type         | Notes/Constraints                         |
|------------------------|-------------|-------------------------------------------|
| **id**                 | `uuid` (PK)  |                                           |
| **promptResponseId**   | `uuid` (FK → PromptResponse) |                           |
| **profileSharerId**    | `uuid` (FK → ProfileSharer)  | Owner Sharer’s ID           |
| **fileUrl**            | `text`       |                                           |
| **fileType**           | `text`       |                                           |
| **fileName**           | `text`       |                                           |
| **fileSize**           | `integer`    |                                           |
| **title**              | `text`       |                                           |
| **description**        | `text`       |                                           |
| **estimatedYear**      | `integer`    |                                           |
| **dateCaptured**       | `date`       |                                           |
| **yearCaptured**       | `integer`    |                                           |
| **uploadedAt**         | `timestamptz` |                                          |

#### PromptResponseAttachmentPersonTag
Joins a `PersonTag` to a `PromptResponseAttachment`.

| Column                      | Type        | Notes/Constraints                                  |
|----------------------------|------------|----------------------------------------------------|
| **id**                     | `uuid` (PK) |                                                    |
| **promptResponseAttachmentId** | `uuid` (FK → PromptResponseAttachment) |                |
| **personTagId**            | `uuid`      | Links to `PersonTag`                               |
| **createdAt**              | `timestamptz` |                                                  |
| **updatedAt**              | `timestamptz` |                                                  |

### PersonTag

Tags a person (family/friend) for attachments, with optional relation type.

| Column            | Type         | Notes/Constraints                                      |
|-------------------|-------------|--------------------------------------------------------|
| **id**            | `uuid` (PK)  |                                                        |
| **name**          | `text`       |                                                        |
| **profileSharerId** | `uuid` (FK → ProfileSharer) | Owned by the Sharer                    |
| **relation**      | `enum`       | e.g., Mother, Father, Spouse, Partner, etc.            |
| **createdAt**     | `timestamptz` |                                                      |
| **updatedAt**     | `timestamptz` |                                                      |

---

## User Interactions

### PromptResponseFavorite

Users can “favorite” a **PromptResponse**.

| Column              | Type         | Notes/Constraints               |
|---------------------|-------------|---------------------------------|
| **id**             | `uuid` (PK)  |                                   |
| **profileId**       | `uuid` (FK → Profile) | who favorited              |
| **promptResponseId**| `uuid` (FK → PromptResponse) |                   |
| **favoritedAt**     | `timestamptz` |                                 |

### PromptResponseRecentlyWatched

Tracks a user’s recently watched **PromptResponse**.

| Column              | Type         | Notes/Constraints               |
|---------------------|-------------|---------------------------------|
| **id**             | `uuid` (PK)  |                                   |
| **profileId**       | `uuid` (FK → Profile) | who watched               |
| **promptResponseId**| `uuid` (FK → PromptResponse) |                   |
| **watchedAt**       | `timestamptz` |                                 |

### TopicFavorite

Users can “favorite” a **PromptCategory**.

| Column             | Type         | Notes/Constraints                |
|--------------------|-------------|----------------------------------|
| **id**            | `uuid` (PK)  |                                    |
| **profileId**      | `uuid` (FK → Profile) | who favorited               |
| **promptCategoryId** | `uuid` (FK → PromptCategory) |                |
| **createdAt**      | `timestamptz` |                                  |

---

## Access Control

### Invitation

Enables sharers (or executors) to invite new listeners or executors.

| Column         | Type           | Notes/Constraints                                 |
|----------------|---------------|---------------------------------------------------|
| **id**         | `uuid` (PK)    |                                                  |
| **sharerId**   | `uuid` (FK → ProfileSharer) | The sharer initiating the invite        |
| **inviterId**  | `uuid` (FK → Profile) | The actual Profile who sent the invite     |
| **inviteeEmail** | `text`       | Email to invite                                  |
| **role**       | `enum`         | One of LISTENER, SHARER, EXECUTOR, ADMIN         |
| **status**     | `enum`         | PENDING, ACCEPTED, DECLINED, EXPIRED             |
| **token**      | `text` (unique)| Invitation token                                 |
| **createdAt**  | `timestamptz`  |                                                  |
| **updatedAt**  | `timestamptz`  |                                                  |
| **acceptedAt** | `timestamp` (nullable) | When it was accepted                       |

### FollowRequest

User-driven follow requests (instead of direct Invitation flow).

| Column       | Type           | Notes/Constraints                                  |
|--------------|---------------|----------------------------------------------------|
| **id**       | `uuid` (PK)    |                                                   |
| **sharerId** | `uuid` (FK → ProfileSharer) | The target sharer                      |
| **requestorId** | `uuid` (FK → Profile) | The profile requesting to follow        |
| **status**   | `enum`         | PENDING, APPROVED, DENIED                         |
| **createdAt**| `timestamptz`  |                                                   |
| **updatedAt**| `timestamptz`  |                                                   |
| **approvedAt**| `timestamptz` (nullable) |                                          |
| **deniedAt** | `timestamptz` (nullable)  |                                          |

---

## Subscription Management

### Subscription

Tracks user subscriptions (linked to products).

| Column         | Type         | Notes/Constraints                            |
|----------------|-------------|----------------------------------------------|
| **id**         | `uuid` (PK)  |                                             |
| **revenuecatId** | `text`     | RevenueCat subscription identifier          |
| **userId**     | `uuid`       | Profile ID referencing the actual user       |
| **productId**  | `uuid` (FK → Product) |                                     |
| **startsAt**   | `timestamptz` |                                            |
| **currentPeriodStartsAt** | `timestamptz` |                                 |
| **currentPeriodEndsAt** | `timestamptz` |                                    |
| **givesAccess**| `boolean`    | Whether subscription confers access          |
| **autoRenewalStatus** | `text`|                                              |
| **status**     | `text`       | e.g., active, cancelled, etc.               |
| **store**      | `text`       | App Store, Play Store, etc.                 |
| **environment**| `text`       | Sandbox vs Production                        |
| **storeSubscriptionIdentifier** | `text` | Original store sub identifier    |
| **createdAt**  | `timestamptz` |                                            |
| **updatedAt**  | `timestamptz` |                                            |

### Product

Subscription products offered in the system.

| Column           | Type         | Notes/Constraints                      |
|------------------|-------------|----------------------------------------|
| **id**           | `uuid` (PK)  |                                        |
| **revenuecatId** | `text`       |                                        |
| **storeIdentifier** | `text`    |                                        |
| **type**         | `text`       | e.g. recurring, one-time, etc.         |
| **displayName**  | `text`       |                                        |
| **createdAt**    | `timestamptz` |                                       |
| **updatedAt**    | `timestamptz` |                                       |

### Entitlement

Optional entitlements granted via subscription.

| Column           | Type         | Notes/Constraints                   |
|------------------|-------------|-------------------------------------|
| **id**           | `uuid` (PK)  |                                     |
| **revenuecatId** | `text`       |                                     |
| **lookupKey**    | `text`       |                                     |
| **displayName**  | `text`       |                                     |
| **createdAt**    | `timestamptz` |                                    |
| **updatedAt**    | `timestamptz` |                                    |

### Offering

Container for a group of Packages (RevenueCat concept).

| Column         | Type           | Notes/Constraints                 |
|----------------|---------------|-----------------------------------|
| **id**         | `uuid` (PK)    |                                   |
| **revenuecatId** | `text`       |                                   |
| **lookupKey**  | `text`         |                                   |
| **displayName**| `text`         |                                   |
| **isCurrent**  | `boolean`      | Indicates if it’s the current offering |
| **createdAt**  | `timestamptz`  |                                   |
| **updatedAt**  | `timestamptz`  |                                   |

### Package

A purchasable package within an Offering.

| Column         | Type        | Notes/Constraints                    |
|----------------|------------|--------------------------------------|
| **id**         | `uuid` (PK) |                                      |
| **revenuecatId** | `text`    |                                      |
| **offeringId** | `uuid` (FK → Offering) |                            |
| **productId**  | `uuid` (FK → Product)  |                            |
| **lookupKey**  | `text`      |                                      |
| **displayName**| `text`      |                                      |
| **position**   | `integer`   | Ordering within offering             |
| **createdAt**  | `timestamptz` |                                    |
| **updatedAt**  | `timestamptz` |                                    |

### Purchase

Represents a single purchase event.

| Column         | Type          | Notes/Constraints                  |
|----------------|--------------|-------------------------------------|
| **id**         | `uuid` (PK)   |                                     |
| **revenuecatId** | `text`      |                                     |
| **userId**     | `uuid`        | Profile ID                          |
| **productId**  | `uuid`        |                                     |
| **purchasedAt**| `timestamptz` |                                     |
| **store**      | `text`        |                                     |
| **revenueInUsd** | `numeric`   |                                     |
| **status**     | `text`        |                                     |
| **environment**| `text`        |                                     |
| **storePurchaseIdentifier** | `text` |                                |
| **createdAt**  | `timestamptz` |                                     |
| **updatedAt**  | `timestamptz` |                                     |

### SubscriptionEntitlement

Links a subscription to an entitlement.

| Column           | Type         | Notes/Constraints                         |
|------------------|-------------|-------------------------------------------|
| **id**           | `uuid` (PK)  |                                           |
| **subscriptionId** | `uuid` (FK → Subscription) |                           |
| **entitlementId** | `uuid` (FK → Entitlement) |                             |
| **createdAt**    | `timestamptz` |                                          |
| **updatedAt**    | `timestamptz` |                                          |

---

## Downloads

### VideoDownload

Tracks user download requests for a given video.

| Column          | Type         | Notes/Constraints                           |
|-----------------|-------------|---------------------------------------------|
| **id**          | `uuid` (PK)  |                                             |
| **profileId**   | `uuid` (FK → Profile) | who’s requesting the download       |
| **muxAssetId**  | `text`       | Mux asset to download                       |
| **quality**     | `text` (default: "high") | desired quality                   |
| **downloadedAt**| `timestamptz` | When file was fully downloaded             |
| **status**      | `text` (default: "preparing") | in-progress, completed, etc.   |
| **retries**     | `integer` (default: 0) | number of times attempted          |
| **last_attempted** | `timestamptz` |                                           |

### TopicVideoDownload

Same structure as `VideoDownload`, but for **TopicVideo**.

| Column          | Type         | Notes/Constraints                       |
|-----------------|-------------|-----------------------------------------|
| **id**          | `uuid` (PK)  |                                         |
| **profileId**   | `uuid` (FK → Profile) |                                 |
| **muxAssetId**  | `text`       |                                         |
| **quality**     | `text`       |                                         |
| **downloadedAt**| `timestamptz` |                                        |
| **status**      | `text`       |                                        |
| **retries**     | `integer`    |                                        |
| **last_attempted** | `timestamptz` |                                    |

---

## Additional Object Storage Tables

### Object

Represents an object/artifact possibly linked to a prompt response.

| Column               | Type         | Notes/Constraints                              |
|----------------------|-------------|-----------------------------------------------|
| **id**              | `uuid` (PK)  |                                               |
| **userId**          | `uuid`       | Usually owner (Profile)                       |
| **objectName**       | `text`       |                                               |
| **objectDescription**| `text`       |                                               |
| **airtableRecordId**| `text`       |                                               |
| **promptResponseId** | `uuid`       | If linked to prompt response                  |
| **categoryId**       | `uuid`       | Possibly references `ObjectCategory`          |
| **createdAt**        | `timestamptz` |                                              |
| **updatedAt**        | `timestamptz` |                                              |

### ObjectCategory

| Column        | Type         | Notes/Constraints                     |
|---------------|-------------|----------------------------------------|
| **id**        | `uuid` (PK)  |                                        |
| **categoryName** | `text`    |                                        |
| **description**  | `text`    |                                        |
| **airtableRecordId** | `text`|                                        |
| **createdAt**    | `timestamptz` |                                     |
| **updatedAt**    | `timestamptz` |                                     |

---

## Additional Access Control Table

### ResponsePermission

Controls custom permissions on a PromptResponse.

| Column            | Type         | Notes/Constraints                           |
|-------------------|-------------|---------------------------------------------|
| **id**            | `uuid` (PK)  |                                             |
| **userId**        | `uuid`       | Whom the permission is granted/removed for  |
| **responseId**    | `uuid`       | Links to `PromptResponse`                   |
| **permissionLevel** | `text`     | Possibly read/write, etc.                   |
| **createdAt**     | `timestamptz` |                                            |
| **updatedAt**     | `timestamptz` |                                            |

---

## Additional Topic Management Table

### TopicQueueItem

Allows a user to queue or schedule topics (PromptCategories).

| Column            | Type         | Notes/Constraints                    |
|-------------------|-------------|--------------------------------------|
| **id**            | `uuid` (PK)  |                                      |
| **profileId**     | `uuid` (FK → Profile) | owner of the queue item       |
| **promptCategoryId** | `uuid`    | references a PromptCategory          |
| **createdAt**     | `timestamptz` |                                      |

---

## Internal Linking Tables (for advanced usage)

- **_ListenerPromptViews**  
- **_ListenerVideoViews**  
- **_PromptResponseToThematicVideo**  
- **_prisma_migrations**  

These are mostly internal system or migration utility tables and are not typically accessed directly by end users.

---

## Enums

- **Role**: `LISTENER`, `SHARER`, `EXECUTOR`, `ADMIN`  
- **Theme**: `LIFE_EXPERIENCES`, `HEALTH_AND_WELLBEING`, `FOOD`, `CUSTOM`, etc.  
- **VideoStatus**: `WAITING`, `PREPARING`, `ASSET_CREATED`, `READY`, `ERRORED`  
- **InvitationStatus**: `PENDING`, `ACCEPTED`, `DECLINED`, `EXPIRED`  
- **person_relation**: e.g., `Spouse`, `Partner`, `Mother`, `Father`, etc.  
- **follow_request_status**: `PENDING`, `APPROVED`, `DENIED`

---

## Database Triggers

Below is a high-level summary of triggers used. Each trigger references a plpgsql function that enforces or updates data accordingly.

- **Auth Schema**  
  - `on_auth_user_created`: After INSERT on `auth.users` → calls `handle_new_user()` to auto-create a `Profile`.

- **PgSodium Schema**  
  - `key_encrypt_secret_trigger_raw_key`: Before INSERT/UPDATE on `pgsodium.key` → encrypts raw keys.

- **Public Schema**  
  - **FollowRequest**  
    - `handle_approved_follow_request`: After UPDATE → if status changes to `APPROVED`, links user as a listener.  
    - `update_follow_request_status_timestamps`: Before UPDATE → sets `approvedAt`/`deniedAt`.  
    - `update_follow_request_updated_at`: Before UPDATE → sets `updatedAt`.
  - **Profile**  
    - `full_name_update`: Before UPDATE of `firstName`/`lastName` → updates `fullName`.  
    - `profile_updated`: Before UPDATE → sets `updatedAt`.
  - **Prompt**  
    - `prompt_search_vector_update`: Before INSERT/UPDATE → updates `search_vector`.
  - **PromptResponse**  
    - `prompt_response_search_vector_update`: Before INSERT/UPDATE → updates `search_vector`.
  - **TopicVideoTranscript**  
    - `topicvideotranscript_updated`: Before UPDATE → sets `updatedAt`.
  - **Video**  
    - `set_video_date_recorded_trigger`: Before INSERT → sets `dateRecorded` to `createdAt` if null.

- **Realtime Schema**  
  - `tr_check_filters`: Before INSERT/UPDATE on `realtime.subscription` → validates subscription filters.

- **Storage Schema**  
  - `update_objects_updated_at`: Before UPDATE on `storage.objects` → sets `updatedAt`.

- **Vault Schema**  
  - `secrets_encrypt_secret_trigger_secret`: Before INSERT/UPDATE on `vault.secrets` → encrypts secret.

---

## Database Functions

This is a summary of key functions. Many are in `public` schema (and a few in `auth`, `storage`, `vault`, `realtime`, etc.).  

- **Auth Functions**  
  - `auth.email()`, `auth.jwt()`, `auth.role()`, `auth.uid()`: Helpers to extract JWT claims.

- **User Management**  
  - `handle_new_user()`: Trigger function for new `auth.users` → creates `Profile` & default `LISTENER` role.  
  - `handle_profile_updated()`: Updates `Profile.updatedAt`.  
  - `update_full_name()`: Maintains `Profile.fullName` from first/last name fields.

- **Access Control**  
  - `has_role(user_id, role_name)`: Checks if user has that role.  
  - `is_admin()`, `is_admin(user_id)`: Checks for ADMIN role.  
  - `is_executor_for(executor_id, sharer_id)`: True if that user is executor for a sharer.  
  - `is_listener_for(listener_id, sharer_id)`: True if that user is a listener with `hasAccess`.

- **Invitation Management**  
  - `create_invitation(...)`, `generate_invitation_token()`, `accept_invitation_by_token(...)`, etc.

- **Follow Request Management**  
  - `handle_follow_request(...)`, `handle_follow_request_response(...)`, `handle_approved_follow_request()`, etc.

- **Content Management**  
  - `generate_attachment_filename(...)`: Standardizes attachment filenames.  
  - `prompt_response_search_update()`: Fills `search_vector`.  
  - `set_video_date_recorded()`: Trigger function for default `dateRecorded`.  
  - `slugify(text)`: Utility to create url-friendly strings.

- **Video Processing**  
  - `update_video_status(video_id, new_status)`, `handle_mux_webhook(payload jsonb)`, etc.  

- **Storage (storage.*)**  
  - `can_insert_object(...)`, `extension(...)`, `filename(...)`, `foldername(...)`, `get_size_by_bucket()`, etc.  
  - `update_updated_at_column()`: Trigger function to keep `updatedAt` in sync.

- **Vault (vault.*)**  
  - `create_secret(...)`, `update_secret(...)`: Insert/update secrets.  
  - `secrets_encrypt_secret_secret()`: Helper for encryption.

- **Realtime (realtime.*)**  
  - `apply_rls(...)`: Applies row-level security checks to WAL changes.  
  - `subscription_check_filters()`: Validates realtime subscription filters.  
  - `broadcast_changes(...)`: Used by real-time to push changes.  
  - `topic()`: Gets the current realtime topic.

---

## Database Policies (Row Level Security)

Row-level security (RLS) is enabled on many tables. Below is a high-level overview of the policy patterns:

1. **Profile**  
   - **Admin Access**: `is_admin(auth.uid())` → full privileges.  
   - **User Access**: Each user can `SELECT`, `UPDATE`, `DELETE` only their own row (`id = auth.uid()`).
2. **ProfileRole**  
   - Similar pattern: Admin can do anything.  
   - A user can only manage roles belonging to their own `profileId`.
3. **ProfileSharer**, **ProfileListener**, **ProfileExecutor**  
   - Admin can do anything.  
   - Sharers can manage their own records, Executors can manage if they have appropriate relationships, etc.
4. **Prompt, PromptCategory**  
   - Generally `SELECT` is open to all users, with Admin having full insert/update privileges.
5. **PromptResponse**  
   - Admin & service role can do anything.  
   - Sharer owns the response.  
   - Executors can also manage if they’re assigned to that Sharer.  
   - Listeners can view if `privacyLevel` = 'Public' and they have `hasAccess`.
6. **Video**  
   - Admin, service role: full access.  
   - Sharer: read/write their own videos.  
   - Executor: if assigned to that Sharer.  
   - Listener: read if `hasAccess` is true.
7. **TopicVideo**  
   - Same pattern as **Video** for Sharer, Executor, etc.
8. **Attachments (PromptResponseAttachment, Object, etc.)**  
   - Sharers or Executors can manage if it’s associated with their content.  
   - Listeners can only see them if the related response is public or has a policy.  
9. **Invitation, FollowRequest**  
   - Sharer/Executor can create or handle.  
   - Invitee can see invitations for their email.
10. **Subscription, Product, Entitlement, Purchase**  
   - Admin can do anything.  
   - User sees or updates only records where `userId = auth.uid()`.
11. **Storage (storage.objects)**  
   - **Public read** for certain buckets (e.g., `avatars`, `attachments`).  
   - Insert/Update/Delete restricted so that only the owner or correct roles can manage specific files.  
12. **Additional**:  
   - `ResponsePermission`, `TopicFavorite`, `TopicQueueItem` all follow similar patterns: Admin = anything; user = their own records; executor = authorized if assigned.

These policy rules ensure that each user has access only to the data they own or are granted access to as a Listener or Executor.

---

## Final Notes

- **RLS** is active on most tables. Where needed, there are explicit `using_expression` or `with_check_expression` enforcing ownership or role-based checks.
- **Triggers** handle automatic housekeeping (timestamps, search vectors, name updates).
- **Functions** provide a robust API for advanced logic (invitations, follow requests, partial Mux integration, secret encryption, real-time events, etc.).
- The system uses **PostgreSQL** row-level security extensively, combined with these triggers and functions, to provide **fine-grained access control**.

This document is a concise yet accurate reference to the Telloom database schema, its policies, triggers, and key functions.