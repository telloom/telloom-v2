# Telloom Authentication & User Management System

## Overview

This document provides a comprehensive overview of Telloom's authentication, user management, session handling, and role-based access control (RBAC) system. The system is built using Supabase for authentication and database management, with Next.js 14 App Router for the frontend.

## File Structure

```
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx      # Login page component
│   │   └── signup/
│   │       └── page.tsx      # Signup page component
│   └── page.tsx              # Home page with role-based routing
├── components/
│   ├── Login.tsx            # Login form component
│   └── SupabaseListener.tsx # Auth state listener
├── utils/
│   └── supabase/
│       ├── admin.ts         # Admin client
│       ├── client.ts        # Client-side operations
│       ├── middleware.ts    # Auth middleware
│       ├── server.ts        # Server-side operations
│       └── withRole.ts      # Role protection
├── schemas/
│   └── profileSchema.ts     # Profile validation schema
└── types/
    └── supabase.ts         # Supabase type definitions
```

## Core Components

### 1. Authentication Clients

#### Server-Side Client (`utils/supabase/server.ts`)
```typescript
// Key implementation
export const createClient = (accessToken?: string) => {
  const cookieStore = cookies();
  accessToken = accessToken ?? cookieStore.get('supabase-access-token')?.value;
  
  return createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: accessToken ? `Bearer ${accessToken}` : '',
      },
    },
  });
};
```

#### Client-Side Client (`utils/supabase/client.ts`)
```typescript
// Basic client for auth
export function createClient() {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

// Authenticated client for database operations
export async function getAuthenticatedClient() {
  const response = await fetch('/api/auth/user');
  const { user, error } = await response.json();
  // ... client creation with auth token
}
```

#### Admin Client (`utils/supabase/admin.ts`)
```typescript
export function supabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
```

### 2. Session Management

#### Session Listener (`components/SupabaseListener.tsx`)
```typescript
export default function SupabaseListener() {
  useEffect(() => {
    const { subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      await fetch('/api/auth/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, session }),
      });
    });

    return () => subscription.unsubscribe();
  }, []);
}
```

#### Middleware Implementation (`utils/supabase/middleware.ts`)
Key features:
- Runs on all non-static routes (configured in `matcher`)
- Validates tokens on each request
- Clears invalid sessions
- Detailed logging for debugging

### 3. Role-Based Access Control (RBAC)

#### Database Schema
```sql
-- ProfileRole table structure
CREATE TABLE "ProfileRole" (
    "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    "profileId" UUID REFERENCES "Profile"(id),
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("profileId", "role")
);
```

#### Role Protection Implementation (`utils/supabase/withRole.ts`)
```typescript
export async function withRole(
  request: NextRequest,
  response: NextResponse,
  requiredRoles: string[]
) {
  // 1. Auth check
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return redirectToLogin();

  // 2. Profile check
  const { data: profile, error: profileError } = await supabase
    .from('Profile')
    .select('id')
    .eq('id', user.id)
    .single();
  if (profileError || !profile) return redirectToLogin();

  // 3. Role check
  const { data: profileRoles, error: rolesError } = await supabase
    .from('ProfileRole')
    .select('role')
    .eq('profileId', profile.id);
  
  const hasRole = requiredRoles.some(role => 
    profileRoles?.some(pr => pr.role === role)
  );
  
  if (!hasRole) return redirectToUnauthorized();
}
```

### 4. Authentication Flow

#### Login Implementation (`app/(auth)/login/page.tsx`)
```typescript
export default async function LoginPage() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    redirect('/');
  }

  return <Login />;
}
```

#### Home Page Role Routing (`app/page.tsx`)
```typescript
export default async function HomePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: roleData } = await supabase
    .from('ProfileRole')
    .select('role')
    .eq('profileId', user.id);

  if (roleData?.some(r => r.role === 'SHARER')) {
    redirect('/role-sharer');
  }

  if (roleData?.some(r => r.role === 'LISTENER')) {
    redirect('/role-listener');
  }
}
```

### 5. Profile Management

#### Profile Schema (`schemas/profileSchema.ts`)
```typescript
export const profileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string(),
  // ... additional fields
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
```

## Security Best Practices

### 1. Token Security
- Tokens are never stored in localStorage
- HTTP-only cookies prevent XSS attacks
- Automatic token refresh handling
- Server-side validation for all authenticated requests

### 2. Role Security
```typescript
// Example of secure role check in API route
export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  const { data: roles } = await supabase
    .from('ProfileRole')
    .select('role')
    .eq('profileId', user.id);
    
  if (!roles?.some(r => r.role === 'REQUIRED_ROLE')) {
    return new Response('Forbidden', { status: 403 });
  }
}
```

## Debugging Guide

### Session Issues
1. Check middleware logs:
```typescript
console.log('Middleware - Tokens present:', { 
  hasAccessToken: !!accessToken,
  hasRefreshToken: !!refreshToken 
});
```

2. Verify cookie presence:
```typescript
const cookieStore = cookies();
const accessToken = cookieStore.get('supabase-access-token');
const refreshToken = cookieStore.get('supabase-refresh-token');
```

### Role Issues
1. Query role data directly:
```typescript
const { data, error } = await supabase
  .from('ProfileRole')
  .select('*')
  .eq('profileId', userId);
console.log('Role data:', data, 'Error:', error);
```

## Extending the System

### Adding New Roles
1. Update database enum:
```sql
ALTER TYPE user_role ADD VALUE 'NEW_ROLE';
```

2. Add role check in middleware:
```typescript
if (requiredRoles.includes('NEW_ROLE')) {
  // Additional validation logic
}
```

### Protected Route Example
```typescript
// app/protected/page.tsx
export default async function ProtectedPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }
  
  const { data: roles } = await supabase
    .from('ProfileRole')
    .select('role')
    .eq('profileId', user.id);
    
  if (!roles?.some(r => r.role === 'REQUIRED_ROLE')) {
    redirect('/unauthorized');
  }
  
  return <ProtectedContent />;
}
```