# Supabase Authentication with Next.js App Router

## Overview
This guide provides a detailed explanation of how to integrate Supabase authentication with a Next.js application using the App Router. The focus is on using Supabase directly, as the `@supabase/auth-helpers-nextjs` package is deprecated. Additionally, email handling with Loops.so is covered for authentication flows.

## Setting Up Supabase in Next.js
### 1. Install Dependencies
Install the required packages:
```sh
npm install @supabase/supabase-js
```

### 2. Configure Supabase Client
Create a Supabase client in a utility file to be used across the app.
```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

## Authentication Flow

### 1. Sign Up with Email and Password
Users sign up using an email and password. A confirmation email is sent to verify the account.
```typescript
// app/api/auth/signup/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  const { email, password } = await req.json();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ user: data.user });
}
```

### 2. Sign In with Email and Password
```typescript
// app/api/auth/signin/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  const { email, password } = await req.json();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ user: data.user });
}
```

### 3. Passwordless Authentication (PKCE Flow)
Supabase supports passwordless login using PKCE (Proof Key for Code Exchange).
```typescript
// app/api/auth/magic-link/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  const { email } = await req.json();
  const { error } = await supabase.auth.signInWithOtp({ email });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ message: 'Check your email for the magic link!' });
}
```

### 4. Handling Authentication State in the Client
Since `auth-helpers` are deprecated, authentication state should be handled manually.
```typescript
// hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useAuth() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user || null);
    };

    fetchUser();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    
    return () => listener.subscription.unsubscribe();
  }, []);

  return { user };
}
```

## Email Notifications with Loops.so
Loops.so can be used for email authentication flows, such as password resets and welcome emails.

### 1. Setting Up Loops.so SDK
```sh
npm install @loops-so/client
```

### 2. Sending Authentication Emails
```typescript
// lib/loops.ts
import { Loops } from '@loops-so/client';

const loops = new Loops(process.env.LOOPS_API_KEY!);
export { loops };
```

### 3. Triggering an Email after Sign-Up
```typescript
// app/api/auth/welcome-email/route.ts
import { NextResponse } from 'next/server';
import { loops } from '@/lib/loops';

export async function POST(req: Request) {
  const { email } = await req.json();
  await loops.sendEmail('welcome-email', { email });
  return NextResponse.json({ message: 'Welcome email sent' });
}
```

## Protecting Routes
To restrict access to authenticated users, middleware can be used.

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function middleware(req: Request) {
  const { data } = await supabase.auth.getUser();
  if (!data?.user) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
```

## Summary
- **Supabase Authentication**: Use direct API calls instead of auth-helpers.
- **Email Authentication**: Supports password, magic link, and PKCE flows.
- **State Management**: Handle user state manually with `useEffect`.
- **Loops.so for Emails**: Send transactional emails, like welcome emails.
- **Middleware for Protection**: Restrict access to authenticated users.
