# Persistent In-App Notifications PRD for Telloom

## 1. Overview

### Purpose
Telloom’s persistent in‑app notifications system keeps users informed about key events—even if they miss transient toast alerts. Notifications are stored in the database, are available later on a dedicated page, and appear as a badge (displaying unread counts) in the header. This system supports all user roles (SHARER, LISTENER, EXECUTOR, and ADMIN) and, in particular, includes special handling for executors who act on behalf of sharers. In executor mode, the notifications are tied to the particular sharer context selected by the executor.

### Scope
- Introduce a new Notification model to store notification records.
- Create secure API endpoints for retrieving and updating notifications.
- Build a set of client-side components to display notifications (a notifications page per role and a notifications badge).
- Integrate notifications into key flows: follow requests, invitation actions, and connection changes.
- Ensure executors see notifications tied to a specific sharer context.

## 2. Roles & Their Impact on Notifications

### User Roles Overview

- **SHARER:**
  - Responsibilities: Create and manage video content and attachments; invite Listeners/Executors.
  - Notifications: Receive notifications when a follow request is submitted (with listener details), invitation updates, or connection changes.
  - Notification Details: Include the listener’s name, avatar, and email.
  - Data Schema:
    - `ProfileRole.role = 'SHARER'`
    - Extended sharer data in `ProfileSharer`.

- **LISTENER:**
  - Responsibilities: View content shared by Sharers.
  - Notifications: Receive notifications when the status of their follow requests changes (approved or declined).
  - Notification Details: Include the sharer’s name.
  - Data Schema:
    - `ProfileRole.role = 'LISTENER'`
    - Relationship maintained in `ProfileListener`.

- **EXECUTOR:**
  - Responsibilities: Act on behalf of one or more Sharers by managing follow requests and content.
  - Notifications: Receive the same notifications as Sharers (e.g., follow requests, invitations) but tied to a particular sharer context.
  - Notification Details: When an executor clicks into a specific sharer, the notifications for that sharer will include the listener’s details (name, avatar, email) and be labeled with the sharer’s name.
  - Data Schema:
    - `ProfileRole.role = 'EXECUTOR'`
    - Managed via `ProfileExecutor`. An executor may represent multiple sharers, but notifications are filtered based on the selected sharer.

- **ADMIN:**
  - Responsibilities: Superuser capabilities.
  - Notifications: May receive system-wide alerts (this area can be expanded in the future).

## 3. Notification Types and Use Cases

Each notification includes a type, a message, and an optional JSON field for additional data.

### 3.1 Follow Request Notifications
- **Trigger:** A Listener sends a follow request.
- **Recipient:** Sharer or Executor (acting for a sharer).
- **Content:**
  - Example: "You have a new follow request from [Listener Name] (Avatar & Email)."
- **Action:** Clicking the notification redirects the user to the follow request management page.

### 3.2 Follow Request Response Notifications
- **Trigger:** When a follow request is approved or declined.
- **Recipient:** The Listener who submitted the request.
- **Content:**
  - Example: "Your follow request to [Sharer Name] was approved" (or declined).
- **Action:** Clicking the notification takes the listener to the sharer’s profile or a page showing follow request statuses.

### 3.3 Invitation Notifications
- **Trigger:** When a Sharer sends an invitation or when its status changes.
- **Recipient:** The invitee (Listener or Executor) receives the invitation, and the Sharer/Executor receives a notification upon acceptance.
- **Content:**
  - Example: "You’ve been invited to join Telloom as a [LISTENER/EXECUTOR] by [Sharer Name]."
- **Action:** Clicking the notification directs the user to the invitation acceptance flow.

### 3.4 Connection Change Notifications
- **Trigger:** When a Sharer or Executor revokes or restores a Listener’s access.
- **Recipient:** The affected Listener.
- **Content:**
  - Example: "Your access to [Sharer Name]’s content has been revoked" or "restored."
- **Action:** Clicking the notification directs the listener to a connections page.

## 4. Technical Requirements

### 4.1 Data Model Changes

#### New Table: `Notification`
```prisma
model Notification {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @db.Uuid
  type      String
  message   String
  data      Json?
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now()) @db.Timestamptz(6)
  updatedAt DateTime @updatedAt @db.Timestamptz(6)

  Profile   Profile  @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### 4.2 API Endpoints
- `GET /api/notifications`:
  - Returns all notifications for the authenticated user.
  - Supports an optional query parameter `?count=true` to return only the unread count.
- `PATCH /api/notifications`:
  - Accepts a JSON payload `{ ids: string | string[] }` to mark the specified notifications as read.

### 4.3 Client-Side Components
- `NotificationItem`: Renders a single notification.
- `NotificationList`: Renders a list of `NotificationItem` components.
- `NotificationsBadge`: Displays the unread notification count (placed in the header).

### 4.4 Role‑Specific Notifications Pages
- **Sharer Notifications Page**: `app/(authenticated)/role-sharer/notifications/page.tsx`
- **Listener Notifications Page**: `app/(authenticated)/role-listener/notifications/page.tsx`
- **Executor Notifications Page**: `app/(authenticated)/role-executor/[id]/notifications/page.tsx`

## 5. User Stories
- **As a Sharer/Executor:**
  - I want to receive notifications about new follow requests, invitation updates, and connection changes (with listener details) so that I can promptly manage my connections.
- **As a Listener:**
  - I want to receive notifications about the status of my follow requests (approved or declined) that include the sharer’s name.
- **As any user:**
  - I want a notifications badge that displays the number of unread notifications so I can quickly see pending actions.

## 6. Acceptance Criteria
- **Data Persistence:** Notifications are stored correctly with the correct user relationship.
- **API Functionality:** The `GET` and `PATCH` endpoints return the correct notifications and update read status properly.
- **UI/UX Requirements:** Notifications pages display notifications clearly and include relevant details.
- **Security:** RLS policies ensure that users only access their own notifications.

## 7. Dependencies and Future Considerations
- **Dependencies:** Next.js, Prisma ORM, Supabase, SWR, Tailwind CSS, Shadcn UI, Sonner.
- **Future Enhancements:** Real-time notifications, additional notification types, and browser push notifications.
