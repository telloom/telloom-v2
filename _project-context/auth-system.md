# Telloom Authentication & User Management System

## Overview

This document outlines Telloom's authentication, user management, and session handling system. The implementation uses Supabase with Next.js 14 App Router, focusing on server-side rendering and cookie-based session management.

## File Structure

```
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx      # Login page component
│   │   └── signup/
│   │       └── page.tsx      # Signup page component
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
└��─ types/
    └── auth.ts              # Auth-related types
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
import { createServerClient } from '@supabase/ssr'
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
          cookieStore.set(name, value, options)
        },
        remove(name: string) {
          cookieStore.delete(name)
        },
      },
    }
  )
}
```

### 2. Session Management

#### Auth Listener (`components/SupabaseListener.tsx`)
```typescript
export default function SupabaseListener() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          router.refresh()
        }
      }
      if (event === 'SIGNED_OUT') {
        router.refresh()
      }
    })

    return () => subscription.unsubscribe()
  }, [router, supabase])

  return null
}
```

### 3. Role-Based Access Control (RBAC)

Role protection is implemented through the `withRole` utility:

```typescript
export async function withRole(
  request: NextRequest,
  response: NextResponse,
  requiredRoles: string[]
) {
  const supabase = createServerClient(/*...*/)
  
  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirectToLogin()

  // Check roles
  const { data: roles } = await supabase
    .from('ProfileRole')
    .select('role')
    .eq('profileId', user.id)

  const hasRequiredRole = requiredRoles.some(role => 
    roles?.some(r => r.role === role)
  )
  
  if (!hasRequiredRole) return redirectToUnauthorized()

  return response
}
```

### 4. Authentication Flow

#### Login Page (`app/(auth)/login/page.tsx`)
```typescript
export default async function LoginPage() {
  const { user, error } = await getUser()

  if (user && !error) {
    redirect('/')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-2">
      <Login />
    </div>
  )
}
```

### 5. Middleware

The middleware handles authentication checks and session management for all relevant routes:

```typescript
export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(/*...*/)
  await supabase.auth.getSession()

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

## Security Best Practices

1. **Cookie-Based Sessions**
   - No localStorage usage
   - HTTP-only cookies
   - Secure session management

2. **Server-Side Validation**
   - All authenticated requests validated server-side
   - Role checks performed server-side

3. **Type Safety**
```typescript
interface AuthContextType {
  user: Profile | null
  isAuthenticated: boolean
  roles: Role[]
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshToken: () => Promise<void>
}
```

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

## Error Handling

```typescript
const getUser = async () => {
  const supabase = createClient()
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
    return { user, error: null }
  } catch (error) {
    console.error('Error getting user:', error)
    return { user: null, error }
  }
}
```

## Extending the System

### Adding New Roles
1. Update database enum
2. Add role check in middleware
3. Update type definitions

### Protected Route Example
```typescript
export default async function ProtectedPage() {
  const { user, error } = await getUser()
  
  if (!user || error) {
    redirect('/login')
  }
  
  // Fetch and check roles
  const supabase = createClient()
  const { data: roles } = await supabase
    .from('ProfileRole')
    .select('role')
    .eq('profileId', user.id)
    
  if (!roles?.some(r => r.role === 'REQUIRED_ROLE')) {
    redirect('/unauthorized')
  }
  
  return <ProtectedContent />
}
```