# Supabase Client Migration Guide

## Overview

We've updated our Supabase client implementation to use a singleton pattern to reduce redundant client instances and improve performance. This guide will help you migrate your code to use the new pattern.

## Key Changes

1. **Singleton Supabase Client**: We now export a singleton instance of the Supabase client from `utils/supabase/client.ts`.
2. **Centralized Auth Context**: We've created a centralized AuthContext to manage authentication state.
3. **Cached User Data**: We've added caching for user data to reduce redundant network requests.

## Migration Steps

### 1. Replace Direct Client Creation

**Before:**
```typescript
import { createClient } from '@/utils/supabase/client';

function MyComponent() {
  const supabase = createClient();
  // ...
}
```

**After:**
```typescript
import { supabase } from '@/utils/supabase/client';

function MyComponent() {
  // Use the singleton instance directly
  // ...
}
```

### 2. Use the Auth Context for Authentication

**Before:**
```typescript
import { createClient } from '@/utils/supabase/client';

function MyComponent() {
  const [user, setUser] = useState(null);
  const supabase = createClient();
  
  useEffect(() => {
    const getUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!error) {
        setUser(data.user);
      }
    };
    getUser();
  }, []);
}
```

**After:**
```typescript
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { user, loading } = useAuth();
  
  // user is already available from the context
}
```

### 3. Use the Cached User Getter

If you need to get the user outside of React components:

**Before:**
```typescript
import { createClient } from '@/utils/supabase/client';

async function someFunction() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  if (!error) {
    return data.user;
  }
  return null;
}
```

**After:**
```typescript
import { getUser } from '@/utils/supabase/client';

async function someFunction() {
  const user = await getUser();
  return user;
}
```

### 4. Sign Out Using the Auth Context

**Before:**
```typescript
import { createClient } from '@/utils/supabase/client';

async function handleSignOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
}
```

**After:**
```typescript
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { signOut } = useAuth();
  
  async function handleSignOut() {
    await signOut();
  }
}
```

### 5. Invalidate User Cache When Needed

If you perform operations that might change the user's state:

```typescript
import { invalidateUserCache } from '@/utils/supabase/client';

async function updateUserProfile() {
  // Update user profile
  // ...
  
  // Invalidate the cache to ensure fresh data on next getUser() call
  invalidateUserCache();
}
```

## Benefits of This Approach

1. **Reduced Redundant Clients**: Eliminates multiple Supabase client instances.
2. **Fewer Auth State Listeners**: Centralizes auth state management.
3. **Improved Performance**: Reduces network requests through caching.
4. **Reduced Logging**: Minimizes debug logs in the console.
5. **Better State Management**: Provides consistent auth state across the app.

## Troubleshooting

If you encounter issues after migration:

1. **Auth State Not Updated**: Make sure your component is wrapped in the `AuthProvider`.
2. **Cached Data Issues**: Call `invalidateUserCache()` if you need fresh data.
3. **Missing User Data**: Check if you're trying to access user data before the auth state is initialized.

For any questions or issues, please contact the development team. 