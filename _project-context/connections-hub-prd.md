# Product Requirements Document (PRD): Centralized Connections Hub

## Overview

We need to centralize and “clean up” our invitation and follow-request flows into a single hub that can be accessed via a new dropdown menu item in the header. This hub will allow:

- **Sharers/Executors** to:
  - Send invitations to add new Listeners (or Executors on their behalf).
  - View and manage (cancel/revoke) pending and accepted invitations.
  - See “Active Connections” (i.e. existing ProfileListener or ProfileExecutor relationships).
- **Listeners** to:
  - Search for a Sharer (or Executor) and request to follow.
  - See pending follow requests (and later, approved connections).
  - View their “Active Connections.”

Both flows will use the existing Prisma models (`Invitation`, `FollowRequest`, `ProfileListener`, `ProfileExecutor`) and related API endpoints. Our goal is to consolidate the UI and API calls into a “Connections Hub” page that is accessible from the header.

## Architectural Changes & Implementation Plan

### 1. Create a New Centralized “Connections Hub” Page

**Goal:**
Provide a new page (e.g. `/app/(authenticated)/connections/page.tsx`) that aggregates data from:
- Invitations: (Sent by sharers)
- Follow Requests: (Sent by listeners)
- Active Connections: (Established relationships)

**Key Steps:**
- Create a new page that uses a tabbed interface (or segmented layout) to display the three sections.
- Reuse existing UI components such as:
  - `InvitationsList.tsx`
  - `ActiveConnections.tsx`
  - `PendingFollowRequests.tsx` (for follow requests)
- Fetch the necessary data using our Supabase client (server-side) and/or our Zustand store.
- Ensure role-based checks so that if a user is a Sharer/Executor they see invitation-related data, while listeners see follow-request data.

### 2. Update the Header Component

**Goal:**
Add a new menu item to the header’s dropdown (or sidebar) that links to the “Connections Hub.”

**Key Steps:**
- In the header component (`/components/Header.tsx`), add a new dropdown menu item labeled “Connections” (or “Manage Connections”) that routes to the new page.
- Make sure this item appears only for authenticated users and (optionally) only when the user’s role allows connection management.

### 3. Extend the State Store for Invitations & Follow Requests

**Goal:**
Currently, the `invitationStore.ts` manages invitation data only. We need to extend (or add a new function) to also retrieve follow request data so that the hub can display both types.

**Key Steps:**
- In `/stores/invitationStore.ts` (or create a new store file if you prefer to separate concerns), add a new function (e.g. `fetchFollowRequests()`) that queries the `FollowRequest` table.
- Ensure that the store returns consistent data for both invitations and follow requests, so that the UI components can display status, timestamps, and related Sharer/Listener data.

### 4. Validate and (if needed) Update API Endpoints

**Goal:**
Ensure the existing API endpoints for:
- Creating and sending invitations (e.g. `/api/invitations/send-email`)
- Accepting invitations (`/api/invitations/accept`)
- Notifying follow requests (e.g. `/api/follow-request/notify`)

…are working correctly. (No major code changes are required if these endpoints already work; just verify that their responses conform to the new hub’s expectations.)

### 5. Data and Interface Considerations

#### Database Models:
The Prisma schema already defines:
- `Invitation`
- `FollowRequest`
- `ProfileListener`
- `ProfileExecutor`

No data-model changes are required; however, ensure that the UI uses these models correctly.

#### Role Checks:
Use our existing helper function (`checkRole()`) in the server-side Supabase client (`/utils/supabase/server.ts`) to ensure that each user sees only the connections appropriate to their role.

#### UI Consistency:
Follow our design system (Tailwind CSS + Shadcn UI) and our styling guidelines (colors, spacing, shadows) when creating the new page and updating the header.

## Detailed File-Level Implementation Plan

### File: `app/(authenticated)/connections/page.tsx`

#### Change: Create a new “Connections Hub” page that aggregates invitations, follow requests, and active connections.

```tsx
import React, { useState } from 'react';
import InvitationsList from '@/components/invite/InvitationsList';
import ActiveConnections from '@/components/invite/ActiveConnections';
import PendingFollowRequests from '@/components/listener/PendingFollowRequests';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ConnectionsHubPage() {
  const [activeTab, setActiveTab] = useState<'invitations' | 'followRequests' | 'activeConnections'>('invitations');

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Manage Connections</h1>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="invitations">Invitations</TabsTrigger>
          <TabsTrigger value="followRequests">Follow Requests</TabsTrigger>
          <TabsTrigger value="activeConnections">Active Connections</TabsTrigger>
        </TabsList>
        <TabsContent value="invitations">
          <InvitationsList />
        </TabsContent>
        <TabsContent value="followRequests">
          <PendingFollowRequests />
        </TabsContent>
        <TabsContent value="activeConnections">
          <ActiveConnections />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

## Summary of Architectural Decisions

- **Central Hub:** A new “Connections Hub” page consolidates both invitation and follow-request flows. This allows both sharers/executors and listeners to manage and review their connection requests in one place.
- **Role-Based Display:** Use existing role-checking logic (e.g. via `checkRole()` in `/utils/supabase/server.ts`) to show the appropriate tabs/data for each role.
- **UI Reuse:** Reuse existing components (e.g. `InvitationsList`, `ActiveConnections`, `PendingFollowRequests`) to keep consistency and avoid duplicate code.
- **State Management:** Extend the existing Zustand store (`invitationStore.ts`) to include follow request data so that the UI components can refresh and display the latest state.
- **Email Notifications:** Continue using the Loops integration for sending both invitation and follow request emails.
- **Routing and Navigation:** Modify the header to add a new navigation link to the hub, ensuring that users can easily access connection management.

This PRD and the accompanying file-level change instructions provide a clear, step-by-step technical implementation plan to centralize our invitation and follow-request flows in the Telloom Next.js application.
