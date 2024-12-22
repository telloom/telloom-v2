# Telloom Authentication & User Management System

## Overview

This document outlines Telloom's authentication, user management, and session handling system. The implementation uses Supabase with Next.js 14 App Router, focusing on server-side rendering and secure authentication using `getUser()`.

## File Structure

```
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx      # Login page component
│   │   └── signup/
│   │   │   └── page.tsx      # Signup page component
│   │   └── unauthorized/
│   │       └── page.tsx      # Unauthorized access page
│   ├── auth/
│   │   ├── callback/
│   │   │   └── route.ts      # Auth callback handler
│   │   └── confirm/
│   │       └── route.ts      # Email confirmation handler
├── components/
│   └── SupabaseListener.tsx  # Auth state listener
├── utils/
│   └── supabase/
│       ├── admin.ts          # Admin client
│       ├── client.ts         # Browser client
│       ├── server.ts         # Server client
│       ├── middleware.ts     # Auth middleware
│       ├── route-handler.ts  # Route handler client
│       └── withRole.ts       # Role protection
└── types/
    └── models.ts            # Type definitions including Role enum
```

## Core Components

### 1. Authentication Clients

We maintain separate Supabase clients for different contexts:

#### Browser Client (`utils/supabase/client.ts`)
```typescript
import { createBrowserClient } from '@supabase/ssr'

export const createClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

#### Server Client (`utils/supabase/server.ts`)
```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

const createClient = () => {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({
              name,
              value,
              ...options,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              httpOnly: true,
            })
          } catch (error) {
            // Cookie operations in Server Components are restricted
            console.debug('Cookie set error (safe to ignore in middleware):', error)
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.delete({
              name,
              ...options,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              httpOnly: true,
            })
          } catch (error) {
            console.debug('Cookie remove error (safe to ignore in middleware):', error)
          }
        },
      },
    }
  )
}
```

### 2. User Authentication

#### Auth Utility (`utils/auth.ts`)
```typescript
import { createClient } from '@/utils/supabase/server'

export async function getAuthenticatedUser() {
  const supabase = createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  
  return user
}
```

### 3. Role-Based Access Control (RBAC)

Role protection is implemented through middleware and the withRole utility. Users can have multiple roles (SHARER, LISTENER, EXECUTOR, ADMIN), and ADMIN role has access to all protected routes.

#### Role Protection Middleware (`middleware.ts`)
```typescript
export async function middleware(request: NextRequest) {
  // ... supabase client setup ...

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (!user || error) return redirectToLogin()

  const isProtectedRoute = request.nextUrl.pathname.match(
    /^\/role-(sharer|listener|executor|admin)/
  )

  if (isProtectedRoute) {
    const requiredRole = isProtectedRoute[1].toUpperCase() as Role
    
    const { data: userRoles } = await supabase
      .from('ProfileRole')
      .select('role')
      .eq('profileId', user.id)

    // Check if user has required role or is admin
    const hasRequiredRole = userRoles?.some(
      ({ role }) => role === requiredRole || role === Role.ADMIN
    )
    
    if (!hasRequiredRole) return redirectToUnauthorized()
  }

  return response
}
```

#### withRole Utility (`utils/supabase/withRole.ts`)
```typescript
export async function withRole(
  request: NextRequest,
  response: NextResponse,
  requiredRoles: Role[]
) {
  // ... supabase client setup ...

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (!user || error) return redirectToLogin()

  const { data: userRoles } = await supabase
    .from('ProfileRole')
    .select('role')
    .eq('profileId', user.id)

  // Check if user has any required role or is admin
  const hasRequiredRole = userRoles?.some(
    ({ role }) => requiredRoles.includes(role as Role) || role === Role.ADMIN
  )
  
  if (!hasRequiredRole) return redirectToUnauthorized()

  return response
}
```

### 4. Protected Routes

Example of a protected route with role checking:

```typescript
export default async function ProtectedPage() {
  const supabase = createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) {
    redirect('/login')
  }
  
  // Fetch and check roles
  const { data: userRoles } = await supabase
    .from('ProfileRole')
    .select('role')
    .eq('profileId', user.id)
    
  const hasRequiredRole = userRoles?.some(
    ({ role }) => role === 'REQUIRED_ROLE' || role === 'ADMIN'
  )
  
  if (!hasRequiredRole) {
    redirect('/unauthorized')
  }
  
  return <ProtectedContent />
}
```

## Security Best Practices

1. **Server-Side Authentication**
   - Always use `getUser()` instead of `getSession()`
   - Validate user authentication server-side
   - Use cookie-based auth with HTTP-only cookies
   - Set secure cookie options in production

2. **Role Validation**
   - Always check roles server-side
   - Allow users to have multiple roles
   - Admin role has access to all protected routes
   - Use typed role enums for type safety

3. **Error Handling**
   - Proper error handling in cookie operations
   - Graceful handling of missing roles
   - Detailed debug logging for troubleshooting
   - Secure error responses

## Database Schema

```sql
-- Role management tables
CREATE TABLE "ProfileRole" (
    "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    "profileId" UUID REFERENCES "Profile"(id),
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("profileId", "role")
);

-- RLS Policies
CREATE POLICY "Users can view own roles"
ON "ProfileRole"
FOR SELECT
USING (auth.uid()::text = "profileId"::text);

CREATE POLICY "Users can manage own roles"
ON "ProfileRole"
FOR ALL
USING (auth.uid()::text = "profileId"::text);
```

## Type Definitions

```typescript
export enum Role {
  LISTENER = 'LISTENER',
  SHARER = 'SHARER',
  EXECUTOR = 'EXECUTOR',
  ADMIN = 'ADMIN',
}

interface User {
  id: string
  email?: string
  app_metadata: {
    provider?: string
    [key: string]: any
  }
  user_metadata: {
    [key: string]: any
  }
  aud: string
}

interface AuthResponse {
  user: User | null
  error: Error | null
}

interface Profile {
  id: string
  firstName: string | null
  lastName: string | null
  email: string | null
  avatarUrl: string | null
  roles: { profileId: string; role: Role }[]
  createdAt: Date
  updatedAt: Date
}
```