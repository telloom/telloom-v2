# Telloom Web App Storyboard & Workflow
## Overview

Telloom is a platform where users can assume multiple roles—Listener, Sharer, and Executor—to create, share, and interact with content. Users can create video responses to prompts, share them with family members, and manage content according to their assigned roles.

## 1. Sign Up or Login Flow (Listener and Sharer)

### UI/Design:

- Sign Up/Log In Page:
  - Elements:
    - Email field
    - Password field
    - Google sign-in button
    - Login button
    - Sign-up link
    - "Forgot Password?" link
  - Design: Minimalist and user-friendly design with clear CTAs and accessibility considerations.

### User Flow:

- New Users:
  - Choose to sign up via email/password or Google OAuth.
  - Upon successful sign-up, they receive a verification email (if using email/password).
  - After verification, proceed to role selection.
- Returning Users:
  - Enter credentials to log in.
  - If they have multiple roles, they can choose which role to assume upon login.

### Backend Operations:

- Authentication:
  - Utilize Supabase Auth for handling email/password and Google OAuth authentication.
- User Creation:
  - Create a new Profile record in the database upon successful sign-up.
  - Store personal information such as email, fullName, and passwordHash.
- Email Verification:
  - Send a verification email to the user's email address.
  - Update the user's status in the Profile model upon successful verification.
- Error Handling:
  - Provide feedback for incorrect login details.
  - Implement password reset functionality via email.
- Role Assignment:
  - Initially, users have no roles assigned.
  - After sign-up, prompt users to select their role(s).

## 2. Role Selection: Listener or Sharer or Executor (Listener and Sharer and Executor)

### UI/Design:

- Role Selection Page:
  - Elements:
    - three large buttons for "Listener" and "Sharer."
    - Explanation of each role.
    - Option to select both roles.
  - Design: Clean layout with clear distinctions between roles.

### User Flow:

- User selects their desired role(s).
- Sharer Selection:
  - If the user selects Sharer, they are prompted to complete additional information and subscribe to a plan.
- Listener Selection:
  - If the user selects Listener, they proceed to the onboarding process.
- Users can have multiple roles and can add roles later from the settings.

### Backend Operations:

- Role Management:
  - Assign selected roles to the user in the ProfileRole table.
  - Create a ProfileSharer record if the user selects Sharer.
  - Update the roles field in the Profile model accordingly.
- Subscription Handling:
  - For Sharers, integrate with RevenueCat to handle subscription payments.
  - Create a Subscription record linked to the user.
  - Update subscriptionStatus in the ProfileSharer model.
- Data Integrity:
  - Ensure that each role is assigned only once per user via unique constraints in the ProfileRole model (@@unique([profileId, role])).

## 3. Sharer Mode: Onboarding & Video Creation (Sharer)

### UI/Design:

- Sharer Onboarding Page:
  - Elements:
    - Welcome message explaining the Sharer role.
    - Tips for creating high-quality videos.
    - "Start Recording" button.
- Video Recording Interface:
  - Display the first prompt: "What is your full name?"
  - Video recording controls (record, pause, stop).
  - Option to add text response or attachments.

### User Flow:

- Sharers are guided through creating their first video response.
- After recording, they can preview, re-record, or save the video.
- Upon saving, they are automatically presented with the next prompt.

### Backend Operations:

- Prompt Retrieval:
  - Fetch prompts from the Prompt table, starting with context-establishing prompts (isContextEstablishing = true).
  - Use the promptCategoryId to group prompts by topic.
- Video Upload:
  - Utilize Mux API for video uploads.
  - Store video metadata in the Video table, linked to the ProfileSharer.
  - Generate unique identifiers for muxAssetId, muxPlaybackId, etc.
- Prompt Response Creation:
  - Create a PromptResponse record linking the video, prompt, and sharer.
  - Set privacyLevel based on user's preference.
- Progress Tracking:
  - Update the sharer's progress by tracking completed prompts in the PromptResponse table.

## 4. Sharer Dashboard (Sharer)

### UI/Design:

- Dashboard Layout:
  - Sections:
    - In-Progress Topics
    - Completed Topics
    - Suggested Topics
    - Favorite Topics
  - Topic Cards:
    - Show topic name, progress bar, and actions (continue, view prompts).
  - Navigation Menu:
    - Access to Profile, Settings, Executor Management, and Help.

### User Flow:

- Sharers can view their progress across different topics.
- They can select a topic to continue answering prompts or review their responses.
- Access settings and manage their account.

### Backend Operations:

- Data Fetching:
  - Retrieve topics from the PromptCategory table.
  - Fetch associated prompts and responses for the sharer from Prompt and PromptResponse tables.
- Progress Calculation:
  - Calculate the percentage of completed prompts within each topic.
  - Use counts of PromptResponse records linked to the sharer and prompt category.
- Favorites Management:
  - Allow sharers to mark topics as favorites.
  - Store favorites in a dedicated table or in the sharer's profile data.

## 5. Prompt Recording Page (Sharer)

### UI/Design:

- Prompt Detail View:
  - Display the prompt text prominently.
  - Video recording controls.
  - Option to add text response.
  - Attachments section for uploading additional media.
  - Transcript display (if available).
  - Save and Next buttons.

### User Flow:

- Sharer selects a prompt to answer.
- Records a video response or provides a text response.
- Can upload attachments (images, documents).
- After saving, they can proceed to the next prompt or return to the dashboard.

### Backend Operations:

- Video Handling:
  - Use Mux API for video recording and playback.
  - Update the Video table with new video records.
- Prompt Response Management:
  - Create or update PromptResponse records.
  - Link the Video and PromptResponse via videoId.
- Attachments Handling:
  - Store attachments in PromptResponseAttachment and manage files in Supabase storage.
  - Link attachments to PromptResponse and ProfileSharer.
- Transcript Generation:
  - Use Whisper API to generate transcripts.
  - Store transcripts in the VideoTranscript table linked to the Video.

## 6. Context-Setting Prompts (Sharer)

### UI/Design:

- Context Prompt Highlight:
  - Special indication that the prompt is context-setting.
  - Explanation of the importance of context-setting prompts.

### User Flow:

- Sharers are prompted to answer context-setting questions first within each topic.
- Cannot proceed to other prompts in the topic until the context-setting prompt is completed.

### Backend Operations:

- Prompt Sequencing:
  - Enforce the order of prompts based on the isContextEstablishing flag in the Prompt model.
- Completion Checks:
  - Verify that context-setting prompts are completed by checking for existing PromptResponse records before allowing access to subsequent prompts.

## 7. Auto-Play Feed (Listener)

### UI/Design:

- Video Feed:
  - Full-screen video playback.
  - Swipe up/down to navigate between videos.
  - Display prompt text, sharer's name, date, and favorite icon.
  - Access to comments or notes (if applicable).

### User Flow:

- Upon login, listeners are presented with an auto-playing feed of new videos from sharers they follow.
- They can swipe through videos, favorite them, or add comments.
- Can pause playback to read transcript or view attachments.

### Backend Operations:

- Content Fetching:
  - Retrieve videos from PromptResponse linked to sharers the listener follows via ProfileListener.
  - Ensure hasAccess = true in ProfileListener.
- Access Control:
  - Only display content where privacyLevel permits the listener to view.
- Engagement Tracking:
  - Record views in PromptResponseRecentlyWatched.
  - Allow favoriting via PromptResponseFavorite.

## 8. Topic Cards View (Listener)

### UI/Design:

- Topics List:
  - Cards displaying topics covered by the sharers the listener follows.
  - Each card shows topic name, number of available videos, and sharers who have content in that topic.

### User Flow:

- Listeners can browse topics and select one to view related content.
- Within a topic, they can choose which sharer's content to view.

### Backend Operations:

- Data Aggregation:
  - Fetch topics from PromptCategory.
  - Aggregate available content per topic from sharers the listener follows.
- Navigation Management:
  - Provide filtering options for topics and sharers.
  - Use the PromptResponse and Prompt tables to link content to topics.

## 9. Video Playback from Topic Cards (Listener)

### UI/Design:

- Topic Content View:
  - List of videos within the selected topic.
  - Thumbnail previews, prompt text, and sharer name.
  - Option to play videos in sequence or select individually.

### User Flow:

- Listener selects a video to play.
- After the video ends, they can proceed to the next one within the topic.
- Can favorite videos or add comments.

### Backend Operations:

- Content Retrieval:
  - Fetch PromptResponse records for the selected topic and sharers.
  - Ensure access permissions via ProfileListener and privacyLevel.
- Playback Management:
  - Implement smooth transitions between videos.
  - Use Mux playback IDs for video streaming.
- Engagement Features:
  - Update favorites in PromptResponseFavorite.
  - Record recently watched in PromptResponseRecentlyWatched.

## 10. Search by Prompts (Listener)

### UI/Design:

- Search Interface:
  - Search bar at the top.
  - Filters for topics, sharers, and content type.
  - Display search results as a list or grid of videos.

### User Flow:

- Listeners enter keywords to search prompts or responses.
- Results display matching videos or text responses.
- Can refine search using filters.

### Backend Operations:

- Search Functionality:
  - Implement full-text search on Prompt.promptText and PromptResponse.responseText.
  - Use PostgreSQL full-text search capabilities.
- Access Control:
  - Ensure only content the listener has access to is returned.
  - Cross-reference with ProfileListener and privacyLevel.
- Pagination and Performance:
  - Implement efficient querying and result pagination.

## 11. Favorites Page (Listener)

### UI/Design:

- Favorites List:
  - Grid or list view of favorited videos.
  - Thumbnail, prompt text, sharer name, and date.
  - Option to remove from favorites.

### User Flow:

- Listeners can view all their favorited content in one place.
- Can play videos directly from the favorites list.
- Remove items from favorites as desired.

### Backend Operations:

- Data Retrieval:
  - Fetch favorited content from PromptResponseFavorite linked to the listener's profile.
- Management:
  - Allow listeners to add or remove favorites.
  - Update PromptResponseFavorite table accordingly.

## 12. Recently Watched Page (Listener)

### UI/Design:

- Recently Watched List:
  - Displays a chronological list of recently viewed content.
  - Includes thumbnails, prompt text, sharer name, and date watched.

### User Flow:

- Listeners can revisit content they have recently watched.
- Can clear their watch history if desired.

### Backend Operations:

- History Tracking:
  - Store viewing history in PromptResponseRecentlyWatched.
- Privacy Considerations:
  - Allow users to manage their viewing history.
  - Provide options to clear or disable history tracking.

## 13. Follow Additional Sharers (Listener)

### UI/Design:

- Follow Interface:
  - Option to enter an invitation code or link provided by a sharer.
  - List of pending invitations.

### User Flow:

- Listeners input the invitation code to follow a new sharer.
- Upon successful entry, they gain access to the sharer's content.

### Backend Operations:

- Invitation Handling:
  - Validate the invitation token from the Invitation table where role = LISTENER and status = PENDING.
- Relationship Establishment:
  - Create a ProfileListener record linking the listener and sharer.
  - Update the Invitation status to ACCEPTED.
- Access Control:
  - Set hasAccess = true in ProfileListener.

## 14. Notifications Page (Listener)

### UI/Design:

- Notifications List:
  - Display notifications of new content from sharers the listener follows.
  - Include details like content type, sharer name, and date.

### User Flow:

- Listeners can view notifications and click to navigate to the new content.
- Can manage notification preferences in settings.

### Backend Operations:

- Notification Generation:
  - Create notifications when new content is added.
  - Store notifications in a Notifications table linked to the listener's profile.
- Preferences Management:
  - Respect the notifications field in ProfileListener for sending notifications.

## 15. Welcome / Onboarding Page (Listener)

### UI/Design:

- Onboarding Screens:
  - Multi-step tutorial explaining key features.
  - Use illustrations and concise text.

### User Flow:

- First-time listeners go through the onboarding process upon login.
- Can skip or revisit onboarding later.

### Backend Operations:

- First-Time Check:
  - Track onboarding completion status in the listener's profile.
- Progress Saving:
  - Save onboarding progress to allow resumption if interrupted.

## 16. Profile Page (Listener and Sharer)

### UI/Design:

- Profile Information:
  - Display user's name, avatar, email, and roles.
  - Option to edit personal information.

### User Flow:

- Users can update their profile details.
- View their assigned roles and switch between them.

### Backend Operations:

- Profile Management:
  - Update fields in the Profile model, such as fullName, avatarUrl, email, etc.
- Role Switching:
  - Allow users to switch roles if they have multiple roles assigned in ProfileRole.

## 17. Settings Page (Listener and Sharer)

### UI/Design:

- Settings Menu:
  - Sections for Account Settings, Notifications, Privacy, and Subscription.
- Account Settings:
  - Update password, email preferences.
- Notifications:
  - Manage notification preferences for different types of alerts.
- Privacy:
  - Control who can see their activity or content (for Sharers).

### User Flow:

- Users navigate to settings to manage account preferences.
- Changes are saved and applied immediately.

### Backend Operations:

- Settings Storage:
  - Update relevant fields in the Profile and related models.
  - For notification preferences, update notifications field in ProfileListener.
- Data Integrity:
  - Validate changes and enforce constraints (e.g., unique email).

## 18. Subscription Management (Sharer)

### UI/Design:

- Subscription Overview:
  - Display current plan, billing cycle, and next billing date.
- Plan Options:
  - Show available subscription plans and features.
- Payment Information:
  - Securely manage payment methods.

### User Flow:

- Sharers can view their subscription status.
- Upgrade, downgrade, or cancel their subscription.
- Update payment information.
### Backend Operations:

* Subscription Data:
   * Retrieve from Subscription and Product models.
   * Display entitlements from SubscriptionEntitlement.
* Payment Processing:
   * Integrate with RevenueCat for handling payments.
   * Update Subscription records upon changes.
* Entitlements Management:
   * Update entitlements in SubscriptionEntitlement upon plan changes.

## 19. Executor Management (Sharer)

### UI/Design:

* Executor Details Form:
   * Fields for executor's name, email, phone, and relationship.
   * Option to send an invitation to the executor.

### User Flow:

* Sharers enter or update executor information.
* Send an invitation to the designated executor.
* View status of executor invitation.

### Backend Operations:

* Executor Data:
   * Store executor details in the Profile model under executor fields (executorFirstName, executorEmail, etc.).
* Invitation Handling:
   * Create an Invitation record with role = EXECUTOR and link to the sharer's ProfileSharer.
* Role Assignment:
   * Upon acceptance, assign the executor role via ProfileRole and create ProfileExecutor relationship.

## 20. Media Management (Sharer)

### UI/Design:

* Media Library:
   * Display all media attached to prompt responses.
   * Filters for media type (video, image, document), date, and associated prompts.
   * Options to download, delete, or edit media.

### User Flow:

* Sharers can browse and manage their uploaded media.
* Delete or download files.
* View which media are linked to which prompts.

### Backend Operations:

* Media Retrieval:
   * Fetch media from Video and PromptResponseAttachment linked to the sharer.
* File Operations:
   * Handle deletions and downloads via Supabase storage API.
   * Ensure proper deletion of files and associated records.
* Data Integrity:
   * When deleting media, update or delete related PromptResponse and VideoTranscript records if necessary.

## 21. Help & Support (Listener and Sharer)

### UI/Design:

* Help Center:
   * Searchable FAQ and knowledge base.
   * Contact form for support requests.

### User Flow:

* Users search for help topics.
* If needed, submit a support request through the contact form.

### Backend Operations:

* Content Management:
   * Store FAQs and articles in a CMS or database.
* Support Tickets:
   * Send support requests via email or integrate with a support ticketing system.

## Telloom Web App Storyboard & Workflow - Executor Role

### Overview

The Executor role is responsible for managing a Sharer's content after they pass away. Executors can:

* Share videos and prompt responses by inviting others.
* Delete videos and media from the Sharer's account.
* Executors cannot create or edit content themselves.
* Executors may manage content for multiple Sharers.

## 1. Invitation & Acceptance Flow (Executor)

### UI/Design:

* Invitation Email:
   * Email with a clear call to action to accept the Executor role.
   * Explanation of the Executor's responsibilities.
   * Link to the sign-up or login page.

### User Flow:

* Executor receives an email invitation.
* Clicks the link and is directed to sign up or log in.
* Upon login, prompted to accept or decline the Executor role.
* If accepted, they gain access to the Executor dashboard.

### Backend Operations:

* Invitation Handling:
   * Store invitation in Invitation with role = EXECUTOR and status = PENDING.
   * Generate a unique token for the invitation link.
* Role Assignment:
   * Upon acceptance, assign EXECUTOR role via ProfileRole.
   * Create ProfileExecutor record linking executor to sharer.
   * Update Invitation status to ACCEPTED.

## 2. Executor Dashboard (Executor)

### UI/Design:

* Dashboard Elements:
   * List of Sharers managed by the Executor.
   * Each Sharer card shows:
      * Sharer's name and avatar.
      * Number of media items.
      * Buttons for "Manage Media" and "Invite Family Members."

### User Flow:

* Executors select a Sharer to manage.
* Access media management or invite family members.

### Backend Operations:

* Sharer Retrieval:
   * Fetch sharers linked via ProfileExecutor where executorId matches the executor's profile ID.
* Media Statistics:
   * Calculate media counts from Video and PromptResponseAttachment linked to the sharer.

## 3. Media Management Page (Executor)

### UI/Design:

* Media Library:
   * Display all media items from the selected Sharer.
   * Thumbnails, prompt text, date, and options to delete or share.

### User Flow:

* Executors can view and manage all media.
* Delete media with confirmation.
* Share media with family members.

### Backend Operations:

* Media Fetching:
   * Retrieve media linked to the sharer from Video and PromptResponseAttachment.
* Deletion Process:
   * Ensure proper deletion from database and storage.
   * Update or delete related records like PromptResponse and VideoTranscript.
* Access Control:
   * Verify executor's permissions via ProfileExecutor.

## 4. Sharing Media Flow (Executor)

### UI/Design:

* Share Modal:
   * Input field for recipient's email.
   * Personal message field.
   * Send Invite button.

### User Flow:

* Executors share media by sending invitations.
* Recipient receives an email with access instructions.

### Backend Operations:

* Invitation Creation:
   * Create an Invitation record with role = LISTENER, linked to the sharer's ProfileSharer.
   * Generate a unique token for access.
* Access Control:
   * Upon acceptance, create ProfileListener record linking the listener to the sharer.

## 5. Invite Family Members Page (Executor)

### UI/Design:

* Invitation Management:
   * List of sent invitations and their statuses.
   * Option to resend or revoke invitations.

### User Flow:

* Executors can view and manage all invitations.
* Revoke access if necessary.

### Backend Operations:

* Invitation Tracking:
   * Retrieve invitations sent by the executor via Invitation where inviterId is the executor's profile ID.
* Access Revocation:
   * Update hasAccess = false in ProfileListener or delete the record.
   * Update Invitation status to REVOKED if applicable.

## 6. Notifications for New Media (Executor)

### UI/Design:

* Notifications List:
   * Alerts for new media added by the sharer before passing.

### User Flow:

* Executors are informed of any unpublished content that was scheduled.
* Can decide to share or delete the content.

### Backend Operations:

* Content Monitoring:
   * Since sharer has passed, new content additions are unlikely.
   * If there is any scheduled content, retrieve from PromptResponse or Video with future createdAt dates.

## 7. Media Deletion Flow (Executor)

### UI/Design:

* Deletion Confirmation:
   * Modal confirming the deletion action.
   * Display media details for confirmation.

### User Flow:

* Executors confirm deletion.
* Media is permanently removed.

### Backend Operations:

* Deletion Handling:
   * Ensure cascade deletion of related records (e.g., VideoTranscript, PromptResponse).
   * Remove files from storage.
* Audit Trail:
   * Optionally, log deletions for accountability.

## 8. Profile & Account Management (Executor)

### UI/Design:

* Profile Settings:
   * Update personal information.
   * View list of managed sharers.
   * Option to relinquish executor role.

### User Flow:

* Executors can update their details.
* Can choose to step down as executor for a sharer.

### Backend Operations:

* Profile Updates:
   * Update fields in the Profile model.
* Role Revocation:
   * Remove ProfileExecutor record for the sharer.
   * Adjust roles in ProfileRole if no longer needed.

## Additional Considerations

* Access Control & Permissions:
   * Implement role-based access control throughout the app.
   * Sharers can set privacyLevel on content.
* Data Integrity:
   * Enforce foreign key constraints as per the schema.
   * Use transactions where multiple related records are created or updated.
* Notifications & Emails:
   * Use a reliable email service for sending invitations and notifications.
   * Handle email verification for new users.
* Scalability & Performance:
   * Optimize database queries with indexing where appropriate.
   * Implement caching strategies for frequently accessed data.
* Security:
   * Ensure secure handling of user data and media files.
   * Implement authentication and authorization best practices.