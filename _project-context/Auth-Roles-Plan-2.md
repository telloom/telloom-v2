# **Telloom Authentication & Role-Based Access Guide**
This document provides a **complete reference** for integrating Supabase authentication with Next.js App Router using a **server-side** approach, **PKCE** flows, and **role-based access**. We also demonstrate how to send email notifications using **Loops.so**. This guide builds on (and improves) the first example ("production-grade RBAC") while remaining simple enough for day-to-day development.

---

## **Table of Contents**
1. [Overview](#overview)
2. [Key Concepts](#key-concepts)
3. [File Structure](#file-structure)
4. [Supabase Setup](#supabase-setup)
5. [Authentication Flows](#authentication-flows)
6. [Role-Based Middleware & Helpers](#role-based-middleware--helpers)
7. [Loops.so Integration](#loopsso-integration)
8. [Role & Table Relationships](#role--table-relationships)
9. [References & Links](#references--links)

---

## **Overview**

We utilize:
- **Next.js** 13+ (App Router)
- **Supabase** for authentication and SSR
- **PKCE** for secure login flows (password-based or passwordless)
- **Role-Based Access Control (RBAC)** with RLS (Row-Level Security) policies and a "ProfileRole" table
- **Loops.so** to handle transactional emails (e.g. invitation, welcome, reset password, etc.)
- **RevenueCat** or custom logic for subscriptions (optional)

### Why SSR with Supabase?

Using [Server-Side Supabase Authentication](https://supabase.com/docs/guides/auth/server-side/nextjs) ensures secure handling of tokens. Instead of shipping tokens to the client, we rely on:
- **`createServerSupabaseClient`** for SSR data fetching
- **Role checks** are done server-side, preventing unauthorized data exposure

### Why PKCE Flow?

[PKCE (Proof Key for Code Exchange)](https://supabase.com/docs/guides/auth/passwords?queryGroups=flow&flow=pkce) ensures:
- No secret is stored on the client
- Minimizes risk of intercepted tokens
- A best-practice approach for password-based or "magic link" logins

---

## **Key Concepts**

1. **Profiles & Roles**  
   - `Profile`: 1:1 with `auth.users` (thanks to a database trigger `handle_new_user`).
   - `ProfileRole`: Each user can have multiple roles (`LISTENER`, `SHARER`, `EXECUTOR`, `ADMIN`, etc.).
   - `ProfileSharer`, `ProfileListener`, `ProfileExecutor`: Additional bridging tables that define relationships.  

2. **Row-Level Security**  
   - We define RLS policies so that only **owners** or **approved** roles can select/insert/update/delete.  
   - This works alongside Supabase role-based claims and our own stored roles in `ProfileRole`.

3. **Next.js SSR**  
   - The "App Router" structure encourages using **route handlers** in `app/api/`.
   - We create separate files for `login`, `signup`, `withRole` checks, etc.

4. **Loops.so**  
   - Handles transactional emails (e.g., "Welcome," "Invitation," "Password reset").
   - Simple Node client: `@loops-so/client`.

---

## **File Structure**

A recommended Next.js 15+ layout:

```
app/
├─ layout.tsx                  # Main layout
├─ page.tsx                    # Landing/Home page
├─ (auth)/
│  ├─ login/
│  │  └─ page.tsx             # Login page
│  ├─ signup/
│  │  └─ page.tsx             # Signup page
│  └─ callback/
│     └─ page.tsx             # Callback page for OAuth / PKCE
├─ (dashboard)/
│  ├─ page.tsx                # Example protected route
├─ api/
│  ├─ auth/
│  │  ├─ signup/route.ts      # POST /api/auth/signup
│  │  ├─ login/route.ts       # POST /api/auth/login
│  │  ├─ logout/route.ts      # POST /api/auth/logout
│  │  ├─ callback/route.ts    # GET /api/auth/callback  [handles PKCE or OAuth]
│  │  ├─ invitation/route.ts  # e.g., POST invitation creation
│  └─ user/
│     └─ me/route.ts          # GET user info or role checks
├─ middleware.ts              # Optional if you want a single middleware for route protection
└─ utils/
   ├─ supabase/
   │  ├─ server.ts            # createServerSupabaseClient
   │  ├─ client.ts            # client-side usage
   │  ├─ admin.ts             # Admin client for privileged ops
   │  ├─ withRole.ts          # Helper to check roles (server-side)
   └─ loops.ts                # Loops.so integration
```

> **Note**: The actual structure can be adjusted to your preference, but having these separate utilities helps keep your code organized.

---

## **Supabase Setup**

### 1. **Install Dependencies**

```bash
npm install @supabase/supabase-js @loops-so/client
```

### 2. **Supabase Clients**

**utils/supabase/client.ts**

Client-Side usage only for minimal tasks (like reading public data, or hooking into onAuthStateChange).

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
```

**utils/supabase/server.ts**

Server-Side usage with SSR. Hides secrets from the client.

```typescript
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';  // Next.js 13 approach

export function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Service key for privileged queries

  // We can pass in the cookies so the user session is recognized
  return createClient(supabaseUrl, serviceKey, {
    global: { headers: { Authorization: `Bearer ${serviceKey}` } },
    auth: { detectSessionInUrl: false, persistSession: false },
  });
}
```

**utils/supabase/admin.ts**
```typescript
// For scripts or true admin tasks, not tied to user sessions
import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

## **Authentication Flows**

### 1. Sign Up (with PKCE)

Supabase supports secure PKCE flows for email/password signups. The route below handles user creation:

```typescript
// app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/utils/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const supabase = createServerSupabaseClient();
    
    // Add PKCE or normal password signup
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // redirectTo: callback page
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // data.user is partial until they confirm email (if confirm email required)
    return NextResponse.json({ user: data.user });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

Note: By default, Supabase can send a confirmation email if enable_confirmations is turned on in your Supabase Auth settings. The handle_new_user() database trigger also ensures a Profile and ProfileRole are automatically created.

### 2. Sign In (with PKCE or OAuth)

```typescript
// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/utils/supabase/server';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  const supabase = createServerSupabaseClient();

  // PKCE or normal password
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ user: data.user });
}
```

For OAuth (Google, etc.), you can do:

```typescript
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
  },
});
```

### 3. Handling the Callback

When using OAuth or a redirect-based flow, the user is directed back to some callback route:

```typescript
// app/api/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/utils/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = createServerSupabaseClient();

  // This endpoint might parse the `code` or `access_token` from the URL
  // Typically, Supabase's client automatically handles it if you pass the query parameters
  // You can then redirect the user to a dashboard or wherever
  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`);
}
```

### 4. Logout

```typescript
// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/utils/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  await supabase.auth.signOut();
  return NextResponse.json({ message: 'Logged out' }, { status: 200 });
}
```

## **Role-Based Middleware & Helpers**

### 1. withRole Helper (Server-Side)

We want a function to ensure a user is logged in and has a given role(s). In Next.js 15, you might create:

```typescript
// utils/supabase/withRole.ts
import { createServerSupabaseClient } from './server';

export async function withRole(roleList: string[]) {
  const supabase = createServerSupabaseClient();

  // 1) Grab the user
  const { data: { user }, error } = await supabase.auth.getUser();
  if (!user) return null;

  // 2) Check the user's roles from the DB
  const { data: roles } = await supabase
    .from('ProfileRole')
    .select('role')
    .eq('profileId', user.id);

  if (!roles) return null;

  // If user is ADMIN or has one of the required roles, we pass
  if (roles.some((r) => r.role === 'ADMIN' || roleList.includes(r.role))) {
    return user;
  }
  return null;
}
```

You can call this from server-side components or route handlers:

```typescript
// example usage in a server component or route:
const user = await withRole(['SHARER']);
if (!user) {
  // redirect to not authorized
}
```

### 2. Middleware (Optional)

You can also add a single middleware.ts file for global route restrictions. For instance, if all routes in (dashboard) require being logged in:

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/utils/supabase/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // Some pattern checks for routes
  if (req.nextUrl.pathname.startsWith('/dashboard')) {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // redirect to login if not signed in
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }
  // else allow
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
```

## **Loops.so Integration**

Install:

```bash
npm install @loops-so/client
```

Create a utility:
```typescript
// utils/loops.ts
import { Loops } from '@loops-so/client';

const loops = new Loops(process.env.LOOPS_API_KEY!);

export async function sendWelcomeEmail(to: string) {
  await loops.sendEmail('welcome-email', { email: to });
}
```

Usage in your route handlers or triggers:

```typescript
// e.g., in /app/api/auth/signup/route.ts (after user is created)
import { sendWelcomeEmail } from '@/utils/loops';

...

if (!error) {
  await sendWelcomeEmail(email);
}
```

This depends on how you want to handle it—some prefer sending the email upon user confirmation or acceptance of an invitation.

## **Role & Table Relationships**

### 1. Important Tables
- **Profile**: 1:1 with auth.users
- **ProfileRole**: Many roles per user (LISTENER, SHARER, EXECUTOR, ADMIN)
- **ProfileSharer**: Additional data if the user is a SHARER
- **ProfileListener**: Connects a user (listener) to a sharer
- **ProfileExecutor**: Connects a user (executor) to a sharer
- **Invitation**: For inviting new or existing users to be LISTENER or EXECUTOR

### 2. Database Triggers
- `handle_new_user()` is triggered on auth.users insert, creating a Profile row and setting an initial role to LISTENER.
- Each time a user is assigned a role or relationship, we update the relevant bridging table(s).
- Row-Level Security (RLS) and Policies ensure that only authorized roles can read or modify data.

### 3. RLS Example

In our schema, we have policies such as:

```sql
-- Example for ProfileSharer: only the user who "owns" it can SELECT/UPDATE/DELETE
CREATE POLICY "Sharers can access their own ProfileSharer"
ON "ProfileSharer"
FOR ALL
TO public
USING ("profileId" = auth.uid())
WITH CHECK ("profileId" = auth.uid());
```

All these policies, plus triggers, are defined in the database. The application's role-based approach (in withRole) complements these RLS checks. 