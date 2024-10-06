# Schema Summary

## Overview

The schema models a platform where users can assume multiple roles and interact with content, subscriptions, and other users. The main components are:

- User Profiles and Roles
- Content Models
- Subscription and Purchase Models
- Auxiliary Models

## Models and Relationships

### 1. User Profiles and Roles

#### Profile

- Represents a user.
- Roles: Users can have multiple roles—Listener, Sharer, Executor, Admin.
- Key Fields:
  - Personal info: name, email, etc.
  - Authentication: passwordHash.
- Relationships:
  - roles: Links to ProfileRole.
  - profileSharer: If the user is a Sharer.
  - executorForSharers: Sharers for whom the user is an Executor.
  - followings: Sharers the user follows as a Listener.
  - sentInvitations, receivedInvitations: Invitations sent and received.

#### Role Enum

- Possible roles:
  - LISTENER: Views content from followed Sharers.
  - SHARER: Creates and shares content.
  - EXECUTOR: Manages Sharer's content after passing.
  - ADMIN: Administrative privileges.

#### ProfileRole

- Connects Profile and Role (many-to-many).
- Ensures each role is assigned only once per user.

#### ProfileSharer

- Extends Profile for Sharers.
- Capabilities:
  - Create and manage own content (videos, prompt responses).
  - Invite Listeners and assign an Executor.
- Relationships:
  - executorAssignment: Assigned Executor.
  - followers: Listeners following this Sharer.
  - Content models: videos, promptResponses, etc.
  - sentInvitations: Invitations sent.

#### ProfileExecutor

- Represents the Sharer-Executor relationship.
- Constraints:
  - Each Sharer can have one Executor.
  - An Executor can manage content for multiple Sharers.
- Relationships:
  - Links to Sharer's ProfileSharer and Executor's Profile.

#### ProfileListener

- Manages Listener-Sharer relationships.
- Capabilities:
  - Listeners can follow multiple Sharers.
  - Sharers can have multiple Listeners.
- Key Fields:
  - hasAccess: Indicates if the Listener currently has access.
- Relationships:
  - Tracks viewed content.

#### Invitation

- Handles invitations to potential Listeners or Executors.
- Functionality:
  - Invites users via email, even if they don't have an account.
  - Tracks invitation status (PENDING, ACCEPTED, DECLINED, EXPIRED).
- Key Fields:
  - inviteeEmail: Email of the person being invited.
  - role: Role being invited to (LISTENER or EXECUTOR).
  - token: Unique token for the invitation link.

### 2. Content Models

#### Prompt

- Represents questions for Sharers to answer.
- Relationships:
  - promptResponses: Responses to the prompt.
  - videos: Associated videos.

#### PromptResponse

- Contains Sharer's response to a prompt.
- Fields:
  - responseText: Text response.
  - privacyLevel: Visibility setting.
- Relationships:
  - profileSharer: Creator.
  - video: Optional video response.
  - attachments: Related files.
  - Engagement tracking: favorites, recentlyWatched.
  - permissions: Access permissions.
  - viewedBy: Listeners who viewed the response.

#### Video

- Represents videos uploaded by Sharers.
- Fields:
  - Metadata, Mux integration details.
- Relationships:
  - profileSharer: Uploader.
  - promptResponses: Linked responses.
  - videoTranscript: Transcript.
  - viewedBy: Listeners who viewed the video.

#### PromptResponseAttachment

- Attachments for a PromptResponse.
- Fields:
  - fileUrl, fileType, fileName, etc.

#### VideoTranscript

- Stores transcripts of videos.
- Relationship:
  - Linked to a Video.

### 3. Subscription and Purchase Models

#### Product

- Represents purchasable items.
- Fields:
  - RevenueCat IDs, store identifiers.
- Relationships:
  - packages, purchases, subscriptions.

#### Package

- Bundles products under an offering.
- Relationships:
  - Linked to Offering and Product.

#### Offering

- Collection of Packages.
- Fields:
  - displayName, isCurrent.

#### Subscription

- Tracks user subscriptions.
- Fields:
  - Start/end dates, status.
- Relationships:
  - product, subscriptionEntitlements.

#### Purchase

- Records user purchases.
- Fields:
  - Purchase date, amount, status.
- Relationship:
  - product.

#### Entitlement

- Access rights granted to users.
- Relationship:
  - Linked via SubscriptionEntitlement.

#### SubscriptionEntitlement

- Links Subscription and Entitlement.

### 4. Auxiliary Models

#### Object and ObjectCategory

- Object: Significant items (e.g., heirlooms).
- ObjectCategory: Categories for objects.
- Relationship:
  - Objects linked to PromptResponse.

#### PromptCategory

- Categories for prompts.
- Groups related prompts.

#### ThematicVideo

- Edited videos composed of multiple responses.
- Relationships:
  - Linked to ProfileSharer and PromptResponses.

#### ResponsePermission

- Manages permissions for PromptResponses.
- Defines access levels.

#### Engagement Tracking

- PromptResponseFavorite: Tracks favorites.
- PromptResponseRecentlyWatched: Tracks recent views.

## How It Works Together

### User Roles and Interactions

- Multiple Roles per User: Assigned via ProfileRole.
- Sharers:
  - Create and manage content.
  - Invite Listeners and Executors.
  - Assign one Executor.
- Executors:
  - Manage content for assigned Sharers.
  - Invite additional Listeners.
  - Can serve multiple Sharers.
- Listeners:
  - View content from followed Sharers.
  - Follow via accepted invitations (ProfileListener).
  - Can follow multiple Sharers.
- Admins:
  - Have elevated privileges.

### Key Relationships and Interactions

- Invitations:
  - Sharers or Executors send invitations via email.
  - Invitees accept using a unique token.
  - Upon acceptance, they are assigned the appropriate role and relationships are established.
- Content Management:
  - Sharers create content linked to their ProfileSharer.
  - Executors gain rights to manage a Sharer's content after being assigned.
- Access Control:
  - Listeners must accept an invitation to view a Sharer's content.
  - Access is managed via the ProfileListener relationship.
  - Executors have permissions tied to their relationship in ProfileExecutor.
  - Role Checks enforce permissions for actions like content creation, editing, and deletion.

### Summary of Workflow

1. User Registration:
   - A new user creates a Profile.
   - Roles can be assigned upon registration or later.
2. Assigning Roles:
   - Roles are linked via the ProfileRole model.
3. Inviting Others:
   - Sharers invite Listeners and Executors using the Invitation model.
   - Invitations are sent via email with a unique token.
4. Establishing Relationships:
   - Upon accepting an invitation, a ProfileListener or ProfileExecutor record is created.
   - This sets up the necessary permissions and access controls.
5. Content Interaction:
   - Sharers create content that Listeners can view.
   - Executors manage the Sharer's content as needed.
6. Role-Based Permissions:
   - Actions are permitted based on the user's roles and relationships.
   - The schema enforces constraints to maintain data integrity and proper access.
