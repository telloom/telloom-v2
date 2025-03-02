# Authentication, Profile Roles, and Relationship Management System

This document outlines the complete end-to-end process of authentication, user roles, invitations, and relationship management in the Telloom application.

## Table of Contents
1. [Authentication and Profile Setup](#1-authentication-and-profile-setup)
2. [Invitations and Access Grants](#2-invitations-and-access-grants)
3. [Executor Relationships](#3-executor-relationships)
4. [Listener Relationships](#4-listener-relationships)
5. [Follow Request System](#5-follow-request-system)
6. [Role Selection UI](#6-role-selection-ui)
7. [Access Management](#7-access-management)
8. [Best Practices and Security](#8-best-practices-and-security)
9. [Implementation Examples](#9-implementation-examples)
10. [System Overview](#10-system-overview)
11. [Centralized Authentication Context](#11-centralized-authentication-context)

## 1. Authentication and Profile Setup

### 1.1 Authentication with Supabase

#### Sign Up Process
- User provides email, password, and initial details (firstName, lastName)
- Supabase Auth service creates user record
- Trigger (`on_auth_user_created`) calls `handle_new_user()` to create Profile record
- Profile.id matches Supabase auth.uid()

#### Login Process
- Supabase manages auth cookies/tokens
- Profile.id matches auth.uid() for role enforcement
- Role-based logic enforced through relationship tables

### 1.2 Profile Tables

#### Profile Table
- 1:1 relationship with Supabase Auth user
- Key columns:
  - `id: uuid`
  - `email: text`
  - `firstName: text`
  - `lastName: text`
  - Standard timestamps

#### ProfileRole Table
Available roles:
- `SHARER`
- `LISTENER`
- `EXECUTOR`
- `ADMIN` (optional)

#### ProfileSharer Table
- Created for users with SHARER role
- Key columns:
  - `profileId: uuid`
  - `subscriptionStatus: text`
  - Standard timestamps

## 2. Invitations and Access Grants

### 2.1 Invitation Table

**Purpose**: Temporary storage for Executor/Listener invitations

**Structure**:
```sql
CREATE TABLE IF NOT EXISTS "Invitation" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "sharerId" UUID REFERENCES "ProfileSharer"("id"),
  "inviterId" UUID REFERENCES "Profile"("id"),
  "inviteeEmail" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "token" TEXT NOT NULL,
  "acceptedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);
```

**Workflow**:
1. Send Invite
   - Create Invitation row with role='EXECUTOR'/'LISTENER'
   - Email invitee with acceptance token

2. Accept Invite
   - User clicks link with token
   - System validates and updates status
   - Creates appropriate relationship record

3. Non-Revocable Nature
   - Invitations remain as historical record
   - Access managed through relationship tables

## 3. Executor Relationships

### 3.1 ProfileExecutor Table

**Purpose**: Links Sharer to Executor

**Structure**:
```sql
CREATE TABLE IF NOT EXISTS "ProfileExecutor" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "sharerId" UUID REFERENCES "ProfileSharer"("id"),
  "executorId" UUID REFERENCES "Profile"("id"),
  "createdAt" TIMESTAMPTZ DEFAULT now()
);
```

**Features**:
- Supports multiple Sharer relationships
- Easily revocable
- Created upon invitation acceptance

## 4. Listener Relationships

### 4.1 ProfileListener Table

**Structure**:
```sql
CREATE TABLE IF NOT EXISTS "ProfileListener" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "listenerId" UUID REFERENCES "Profile"("id"),
  "sharerId" UUID REFERENCES "ProfileSharer"("id"),
  "sharedSince" TIMESTAMPTZ DEFAULT now(),
  "hasAccess" BOOLEAN DEFAULT true,
  "lastViewed" TIMESTAMPTZ,
  "notifications" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);
```

**Features**:
- Tracks viewing history
- Manages notification preferences
- Supports access control

## 5. Follow Request System

### 5.1 FollowRequest Table (Optional)

**Structure**:
```sql
CREATE TABLE IF NOT EXISTS "FollowRequest" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "sharerId" UUID REFERENCES "ProfileSharer"("id"),
  "requestorId" UUID REFERENCES "Profile"("id"),
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now(),
  "approvedAt" TIMESTAMPTZ,
  "deniedAt" TIMESTAMPTZ
);
```

**Workflow**:
- User requests to follow
- Sharer approves/denies
- Approved requests create ProfileListener entry

## 6. Role Selection UI

### 6.1 Role Management

**Initial Setup**:
1. New users get LISTENER role
2. Additional roles added as needed:
   - SHARER → Creates ProfileSharer
   - EXECUTOR → Creates ProfileExecutor

### 6.2 Role Selection Flow
- Users see available roles from ProfileRole
- Executors choose active Sharer if multiple

## 7. Access Management

### 7.1 Removing Access

**Executor Removal**:
```sql
DELETE FROM "ProfileExecutor"
WHERE "sharerId" = :sharerId AND "executorId" = :executorId;
```

**Listener Removal**:
```sql
DELETE FROM "ProfileListener"
WHERE "sharerId" = :sharerId AND "listenerId" = :listenerId;
```

## 8. Best Practices and Security

### 8.1 Row-Level Security (RLS)

**Key Policies**:
- Sharers manage their relationships
- Users access only their records
- Invitations restricted to authorized parties

### 8.2 Security Measures

1. Token Security
   - Random, unique strings
   - Expiration handling
   - Secure transmission

2. Audit Trail
   - Status tracking
   - Timestamp logging
   - Action history

3. Access Control
   - Relationship-based
   - Role-based
   - Time-based (optional)

## 9. Implementation Examples

### 9.1 Creating New Executor

```typescript
async function inviteExecutor(sharerId: string, inviteeEmail: string) {
  const token = generateSecureToken();
  
  // Create invitation
  const invitation = await supabase
    .from('Invitation')
    .insert({
      sharerId,
      inviteeEmail,
      role: 'EXECUTOR',
      token
    })
    .single();

  // Send email
  await sendInvitationEmail(inviteeEmail, token);
  
  return invitation;
}
```

### 9.2 Accepting Invitation

```typescript
async function acceptInvitation(token: string, userId: string) {
  // Validate invitation
  const invitation = await supabase
    .from('Invitation')
    .update({ 
      status: 'ACCEPTED',
      acceptedAt: new Date()
    })
    .match({ token, status: 'PENDING' })
    .single();

  if (invitation.role === 'EXECUTOR') {
    // Create executor relationship
    await supabase
      .from('ProfileExecutor')
      .insert({
        sharerId: invitation.sharerId,
        executorId: userId
      });
  }

  // Ensure role exists
  await ensureUserRole(userId, invitation.role);
}
```

## 10. System Overview

### Key Components
1. **Authentication**: Supabase-based with Profile sync
2. **Roles**: ProfileRole table with role capabilities
3. **Relationships**: 
   - ProfileSharer for content owners
   - ProfileExecutor for managers
   - ProfileListener for content consumers
4. **Access Control**:
   - Invitation system for onboarding
   - Direct relationship management
   - RLS policies for security

### Benefits
- Clean separation of concerns
- Scalable relationship model
- Secure access control
- Audit-friendly design
- Flexible role management

### Best Practices
1. Always use RLS policies
2. Maintain audit trails
3. Implement proper error handling
4. Use type-safe interfaces
5. Follow security protocols

This system provides a robust foundation for managing user relationships, roles, and access control in the Telloom application while maintaining security and scalability.

## 11. Centralized Authentication Context

### 11.1 Singleton Supabase Client Pattern

To improve performance and reduce redundant client instances, we've implemented a singleton pattern for the Supabase client:

```typescript
// utils/supabase/client.ts
let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (client) return client;
  
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        debug: false, // Disable debug logs even in development
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
        autoRefreshToken: true,
      }
    }
  );
  
  return client;
}

// Export singleton instance
export const supabase = createClient();

// Cached user getter
export const getUser = async () => {
  // Implementation with caching logic
};

// Cache invalidation
export const invalidateUserCache = () => {
  // Implementation to clear cache
};
```

### 11.2 React Auth Context

We've implemented a centralized authentication context to manage user state across the application:

```typescript
// hooks/useAuth.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, getUser, invalidateUserCache } from '@/utils/supabase/client';

// Auth context definition
const AuthContext = createContext({
  user: null,
  loading: true,
  refreshUser: async () => {},
  signOut: async () => {},
  checkServerSession: async () => {},
});

// Provider component
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Function to check server-side session
  const checkServerSession = async () => {
    try {
      console.log('[AUTH_PROVIDER] Checking server-side session');
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        console.log('[AUTH_PROVIDER] Server session check failed');
        return;
      }
      
      const data = await response.json();
      console.log('[AUTH_PROVIDER] Server session check result:', { hasSession: !!data.session });
      
      if (data.session) {
        // If server has a session but client doesn't, refresh the client
        if (!user) {
          console.log('[AUTH_PROVIDER] Server has session but client doesn\'t, refreshing user');
          await refreshUser();
        }
      } else {
        // If server doesn't have a session but client does, clear client
        if (user) {
          console.log('[AUTH_PROVIDER] Server has no session but client does, clearing user');
          setUser(null);
        }
      }
    } catch (error) {
      console.error('[AUTH_PROVIDER] Error checking server session:', error);
    }
  };
  
  // Auth state management implementation
  // ...
  
  // Include checkServerSession in the context value
  const value = {
    user,
    loading,
    refreshUser,
    signOut,
    checkServerSession,
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook
export function useAuth() {
  return useContext(AuthContext);
}
```

### 11.3 Integration with Next.js App Router

The Auth Provider is integrated at the root layout level:

```typescript
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <SupabaseListener />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

### 11.4 Key Benefits

1. **Reduced Client Instances**: Only one Supabase client is created for the entire application.
2. **Centralized Auth State**: Authentication state is managed in a single location.
3. **Improved Performance**: Caching reduces redundant network requests.
4. **Reduced Logging**: Debug logs are disabled to minimize console noise.
5. **Consistent Auth Experience**: All components access the same auth state.

### 11.5 Usage in Components

```typescript
// Example component using the auth context
'use client';

import { useAuth } from '@/hooks/useAuth';

export default function ProfileComponent() {
  const { user, loading, signOut } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Not authenticated</div>;
  
  return (
    <div>
      <h1>Welcome, {user.email}</h1>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
```

### 11.6 Server-Side Authentication

For server components, we continue to use the server-side Supabase client:

```typescript
// Example server component
import { createClient } from '@/utils/supabase/server';

export default async function ServerComponent() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  
  // Pass user ID to client components to avoid redundant auth checks
  return <ClientComponent userId={data.user?.id} />;
}
```

### 11.7 Implementation Progress

### Updated Components

#### Server Components
- `app/(authenticated)/role-sharer/topics/page.tsx` - Using server-side authentication

#### Client Components
- `hooks/useAuth.tsx` - Core authentication context provider
- `hooks/useUser.ts` - Updated to utilize the useAuth hook
- `components/TopicsTableAllClient.tsx` - Updated to use useAuth hook for authentication state
- `components/AttachmentUpload.tsx` - Updated to use useAuth hook for authentication state
- `components/AttachmentDialog.tsx` - Updated to use useAuth hook for authentication state
- `components/UploadInterface.tsx` - Updated to use useAuth hook for authentication state

### Components Still Needing Updates
- API route handlers that manage their own authentication state
- Client components that still manage their own authentication state

### Migration Strategy
When updating components to use the centralized authentication system:

1. Import the useAuth hook:
```tsx
import { useAuth } from '@/hooks/useAuth';
```

2. Replace direct Supabase auth calls with the useAuth hook:
```tsx
// Before
const { data: { user } } = await supabase.auth.getUser();

// After
const { user, loading } = useAuth();
```

3. Handle loading states appropriately:
```tsx
if (loading) {
  return <div>Loading...</div>;
}

if (!user) {
  return <div>Not authenticated</div>;
}
```

### Rules of Hooks Compliance

We've identified and fixed several components that were violating React's Rules of Hooks:

1. **Invalid Hook Call Pattern**: Calling hooks inside nested functions
   - ✅ Fixed in `components/UploadInterface.tsx`: Moved `useAuth()` from `handleUpload` to component body
   - ✅ Fixed in `components/AttachmentUpload.tsx`: Moved `useAuth()` from `fetchInitialData` and `handleUpload` to component body
   - ✅ Fixed in `components/AttachmentDialog.tsx`: Moved `useAuth()` from `fetchData` and `fetchProfileSharerId` to component body
   - ✅ Fixed in `app/(authenticated)/role-sharer/topics/[id]/page.tsx`: Moved `useAuth()` from `fetchData` and `handleVideoComplete` to component body

2. **Conditional Hook Calls**: Hooks must be called in the same order on every render
   - All components now call hooks at the top level, ensuring consistent order

3. **Best Practices Implemented**:
   - Top-level hook calls in all components
   - Consistent naming for loading state (`authLoading`)
   - Properly updated dependency arrays in `useEffect` and `useCallback`
   - Maintained error handling for authentication states

This centralized authentication system ensures consistent authentication state management across the application while minimizing redundant client instances and network requests.

### 11.8 Enhanced Session Verification

To ensure robust authentication across the application, we've implemented a comprehensive session verification system that synchronizes client and server authentication states.

#### Server-Side Session Endpoint

We've created a dedicated API endpoint to verify the server-side session:

```typescript
// app/api/auth/session/route.ts
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/utils/supabase/route-handler';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    console.log('[API] GET /api/auth/session - Checking server-side session');
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.log('[API] Error getting user:', error);
      return NextResponse.json({ error: 'Error getting user' }, { status: 500 });
    }
    
    console.log('[API] User check result:', { hasUser: !!user });
    
    return NextResponse.json({ 
      session: user ? {
        user: {
          id: user.id,
          email: user.email,
        }
      } : null 
    });
  } catch (error) {
    console.error('[API] Unexpected error in session endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

#### Client-Server Synchronization

The `SupabaseListener` component now periodically checks the server-side session to ensure client-side state remains in sync:

```typescript
// components/SupabaseListener.tsx
'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { debounce } from 'lodash';

export default function SupabaseListener() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, checkServerSession } = useAuth();
  const isMounted = useRef(false);

  // Skip auth checks on auth pages
  const isAuthPage = pathname?.includes('/login') || pathname?.includes('/signup') || /* other auth pages */;

  // Effect to check server session periodically
  useEffect(() => {
    console.log('[SUPABASE_LISTENER] Setting up server session check interval');
    
    // Check server session immediately
    checkServerSession();
    
    // Set up interval to check server session every 30 seconds
    const intervalId = setInterval(() => {
      console.log('[SUPABASE_LISTENER] Checking server session (interval)');
      checkServerSession();
    }, 30000); // 30 seconds
    
    return () => {
      console.log('[SUPABASE_LISTENER] Clearing server session check interval');
      clearInterval(intervalId);
    };
  }, [checkServerSession]);

  // Navigation logic based on auth state
  useEffect(() => {
    // Implementation details...
  }, [user, loading, isAuthPage, pathname]);

  return null;
}
```

#### Header Component Integration

The `Header` component also integrates with the session verification system:

```typescript
// components/Header.tsx
'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function Header() {
  const { user, loading, checkServerSession } = useAuth();
  
  // Check server session on mount
  useEffect(() => {
    console.log('[HEADER] Checking server session on mount');
    checkServerSession();
  }, [checkServerSession]);
  
  // Check server session when user state changes
  useEffect(() => {
    console.log('[HEADER] User state changed:', { hasUser: !!user });
    if (!loading) {
      checkServerSession();
    }
  }, [user, loading, checkServerSession]);
  
  // Rest of component implementation...
}
```

#### Benefits of Enhanced Session Verification

1. **Robust Authentication**: Ensures client and server states remain synchronized
2. **Improved Security**: Uses `getUser()` for secure token verification with the Supabase Auth server
3. **Graceful Handling**: Properly manages session transitions (login/logout)
4. **Detailed Logging**: Comprehensive logging for debugging authentication flows
5. **Consistent Experience**: Prevents authentication state mismatches across the application

This enhanced session verification system provides a solid foundation for authentication in the Telloom application, ensuring that users have a consistent experience while maintaining security best practices. 