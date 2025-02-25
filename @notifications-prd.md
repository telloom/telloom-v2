# Notifications System PRD

## Overview
The notifications system provides a centralized way to manage and display notifications across different user roles (Sharer, Listener, Executor) while maintaining role-specific context and navigation. The system is built using Next.js 15, React Server Components, and Supabase for real-time updates.

## Core Features

### 1. Centralized Notifications Page
- **Location**: `/notifications`
- **Features**:
  - Sort options: Newest First, Oldest First, Unread First
  - Filter by role: All, Sharer, Listener, Executor
  - URL query parameters for direct linking and filtering
  - Persistent badge counts across all views
  - Historical notifications view
  - Automatic role-based navigation
  - Role-specific context preservation

### 2. Role-Specific Pages
- **Sharer**: `/role-sharer/notifications`
- **Listener**: `/role-listener/notifications`
- **Executor**: `/role-executor/[id]/notifications`
  - Includes sharer context in notifications
  - Maintains sharer-specific navigation

### 3. Notification Types & Actions
- **Follow Requests**
  - Approval notifications with sharer name
  - Pending request notifications
  - Connection change notifications
  - Action states: APPROVED, REJECTED, PENDING
- **Invitations**
  - New invitation notifications
  - Invitation status updates
  - Token-based acceptance flow
- **Role-specific Notifications**
  - Sharer: Follow requests, invitation responses
  - Listener: Request status updates
  - Executor: Sharer-specific notifications with context

### 4. Visual Design
- **Card Style**:
  - Border: 2px solid Primary Green (#1B4332)
  - Shadow: 6px 6px Secondary Green (#8fbc55)
  - Hover: Shadow increases to 8px
  - Unread: Highlighted background with accent border
  
- **Badges & Icons**:
  - Sharer: Blue theme (bg-blue-100 text-blue-800)
  - Listener: Green theme (bg-green-100 text-green-800)
  - Executor: Purple theme (bg-purple-100 text-purple-800)
  - Action states: 
    - Approved: bg-green-100 text-green-800
    - Rejected: bg-red-100 text-red-800
    - Pending: bg-yellow-100 text-yellow-800

### 5. Data Structure & API
```typescript
interface Notification {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data?: {
    role?: 'SHARER' | 'LISTENER' | 'EXECUTOR';
    sharerId?: string;
    promptId?: string;
    executorId?: string;
    invitationId?: string;
    invitationToken?: string;
    action?: 'APPROVED' | 'REJECTED' | 'PENDING';
    firstName?: string;
    lastName?: string;
  };
}

// API Endpoints
GET /api/notifications - Fetch notifications with optional filtering
POST /api/notifications/{id}/mark-read - Mark single notification as read
POST /api/notifications/mark-all-read - Mark all notifications as read
```

### 6. Navigation Rules
- **Follow Request Notifications**:
  ```typescript
  switch (notification.type) {
    case 'FOLLOW_REQUEST':
      if (role === 'LISTENER') {
        notification.data?.action === 'APPROVED'
          ? '/role-listener/connections?tab=active'
          : '/role-listener/connections?tab=pending';
      } else if (role === 'SHARER') {
        '/role-sharer/connections?tab=requests';
      } else if (role === 'EXECUTOR' && sharerId) {
        `/role-executor/${sharerId}/connections?tab=requests`;
      }
      break;
  }
  ```

### 7. Components
1. **NotificationsPage**
   - Centralized notifications view
   - Role-based filtering and sorting
   - URL parameter management
   - SWR data fetching

2. **NotificationList**
   - Date-based grouping
   - Bulk actions
   - Empty state handling
   - Optimized rendering

3. **NotificationItem**
   - Role-specific styling
   - Action badges
   - Interactive states
   - Accessibility support

4. **NotificationsBadge**
   - Real-time count updates
   - Role-specific filtering
   - Optimized re-renders

### 8. State Management
- **SWR Configuration**:
  ```typescript
  const { data, mutate } = useSWR('/api/notifications', fetcher, {
    refreshInterval: 15000,
  });
  ```
- **Role Detection**:
  ```typescript
  const useCurrentRole = (): Role => {
    const pathname = usePathname();
    return pathname.includes('/role-sharer') ? 'SHARER'
         : pathname.includes('/role-listener') ? 'LISTENER'
         : pathname.includes('/role-executor') ? 'EXECUTOR'
         : null;
  };
  ```

### 9. Error Handling
- Failed fetch: Display error message with retry option
- Failed mark as read: Toast notification with automatic retry
- Navigation errors: Fallback to role dashboard
- Invalid role/context: Redirect to role selection

### 10. Performance Optimizations
- SWR caching and revalidation
- Optimistic updates for read status
- Debounced filter/sort operations
- Efficient notification grouping
- Lazy loading for historical notifications

## Future Enhancements
1. Push notifications support
2. Custom notification preferences
3. Advanced filtering options
4. Notification categories/tags
5. Batch notification actions
6. Rich media notifications
7. Notification analytics
8. Custom notification sounds
9. Role-specific notification templates
10. Enhanced notification grouping 