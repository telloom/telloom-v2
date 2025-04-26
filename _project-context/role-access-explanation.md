# Telloom Roles and Access Design

## Overview

Telloom uses a role-based access system with four primary roles:

- **SHARER**: Creates and manages personal video content
- **LISTENER**: Views content shared by a Sharer
- **EXECUTOR**: Manages a Sharer's content with nearly the same privileges
- **ADMIN**: Has system-wide superuser capabilities

This document explains how these roles are implemented in the database, highlighting the approach to prevent infinite recursion in Row Level Security (RLS) policies.

## Database Schema

The key tables in our role structure are:

- `Profile`: Main user profile (1:1 with auth.users)
- `ProfileRole`: Assigns roles to users
- `ProfileSharer`: Sharer-specific data
- `ProfileListener`: Links a Listener to a Sharer
- `ProfileExecutor`: Links an Executor to a Sharer

## Helper Functions

To avoid infinite recursion in policies, we use a layered approach with separate helper functions:

### 1. Base-Level Functions

These functions directly check specific access patterns:

```sql
-- Checks if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND ((raw_app_meta_data->>'role')::text = 'admin' 
         OR COALESCE((raw_app_meta_data->>'is_super_admin')::boolean, false) = true)
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Checks if user is the owner of a ProfileSharer record
CREATE OR REPLACE FUNCTION public.is_sharer_owner(sharer_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM "ProfileSharer" ps
    WHERE ps.id = sharer_id AND ps."profileId" = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Checks if user is an executor for a sharer
CREATE OR REPLACE FUNCTION public.is_executor_for_sharer(sharer_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM "ProfileExecutor" pe
    WHERE pe."sharerId" = sharer_id AND pe."executorId" = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;
```

### 2. High-Level Access Function

This function composes the base functions to provide a single access check point:

```sql
CREATE OR REPLACE FUNCTION public.has_sharer_access(sharer_id uuid)
RETURNS boolean AS $$
  SELECT 
    public.is_admin() OR 
    public.is_sharer_owner(sharer_id) OR 
    public.is_executor_for_sharer(sharer_id);
$$ LANGUAGE sql SECURITY DEFINER;
```

## Row Level Security (RLS) Policies

### Special Policy Handling for Base Tables

To prevent infinite recursion, the `ProfileSharer` and `ProfileExecutor` tables have direct policies that don't use the `has_sharer_access` function:

```sql
-- ProfileSharer direct policies
CREATE POLICY "ProfileSharer_admin_direct_policy" ON "ProfileSharer"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "ProfileSharer_owner_direct_policy" ON "ProfileSharer"  
  FOR ALL USING ("profileId" = auth.uid()) WITH CHECK ("profileId" = auth.uid());

CREATE POLICY "ProfileSharer_executor_direct_policy" ON "ProfileSharer"
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM "ProfileExecutor" pe
    WHERE pe."sharerId" = "ProfileSharer"."id" AND pe."executorId" = auth.uid()
  ));

-- ProfileExecutor direct policies
CREATE POLICY "ProfileExecutor_admin_direct_policy" ON "ProfileExecutor"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "ProfileExecutor_owner_direct_policy" ON "ProfileExecutor"
  FOR ALL USING ("executorId" = auth.uid()) WITH CHECK ("executorId" = auth.uid());

CREATE POLICY "ProfileExecutor_sharer_direct_policy" ON "ProfileExecutor"
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM "ProfileSharer" ps
    WHERE ps.id = "ProfileExecutor"."sharerId" AND ps."profileId" = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "ProfileSharer" ps
    WHERE ps.id = "ProfileExecutor"."sharerId" AND ps."profileId" = auth.uid()
  ));
```

### Content Tables Policies

Other content tables like `Video`, `PromptResponse`, etc. can safely use the high-level `has_sharer_access` function:

```sql
CREATE POLICY "content_access_policy" ON "ContentTable"
  FOR ALL 
  USING (public.has_sharer_access("profileSharerId"))
  WITH CHECK (public.has_sharer_access("profileSharerId"));
```

## RPC Functions for Bypassing RLS

To completely avoid infinite recursion issues, we use RPC functions with `SECURITY DEFINER` to bypass RLS for certain critical operations:

### 1. Executor Relationships

```sql
CREATE OR REPLACE FUNCTION public.get_executor_for_user(user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'has_executor_relationship', COUNT(pe.id) > 0,
    'executor_relationships', COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', pe.id,
          'sharerId', pe."sharerId",
          'executorId', pe."executorId",
          'createdAt', pe."createdAt",
          'sharer', jsonb_build_object(
            'id', ps.id,
            'profileId', ps."profileId",
            'profile', jsonb_build_object(
              'id', p.id,
              'firstName', p."firstName",
              'lastName', p."lastName",
              'email', p.email,
              'avatarUrl', p."avatarUrl",
              'createdAt', p."createdAt"
            )
          )
        )
      ) FILTER (WHERE pe.id IS NOT NULL), 
      '[]'::jsonb
    )
  )
  INTO result
  FROM "ProfileExecutor" pe
  JOIN "ProfileSharer" ps ON pe."sharerId" = ps.id
  JOIN "Profile" p ON ps."profileId" = p.id
  WHERE pe."executorId" = user_id;

  RETURN result;
END;
$$;
```

### 2. Pending Invitations

```sql
CREATE OR REPLACE FUNCTION public.get_pending_invitations(email_param text, role_type text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT 
    jsonb_agg(
      jsonb_build_object(
        'id', i.id,
        'token', i.token,
        'createdAt', i."createdAt",
        'sharerId', i."sharerId",
        'inviteeEmail', i."inviteeEmail",
        'role', i.role,
        'status', i.status,
        'sharer', jsonb_build_object(
          'id', ps.id,
          'profile', jsonb_build_object(
            'id', p.id,
            'firstName', p."firstName",
            'lastName', p."lastName",
            'email', p.email,
            'avatarUrl', p."avatarUrl"
          )
        )
      )
    )
  INTO result
  FROM "Invitation" i
  JOIN "ProfileSharer" ps ON i."sharerId" = ps.id
  JOIN "Profile" p ON ps."profileId" = p.id
  WHERE 
    i."inviteeEmail" = email_param 
    AND i.status = 'PENDING'
    AND (role_type IS NULL OR i.role::text = role_type);

  -- Return empty array if no results
  IF result IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  RETURN result;
END;
$$;
```

## Role Access in Next.js Server Components

In our Next.js server components, we use these RPC functions to avoid RLS issues when accessing role-related data:

### Executor Dashboard Example

```typescript
// In role-executor/page.tsx
async function RoleExecutorPageContent() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Use the get_executor_for_user RPC function instead of directly querying tables
  const { data: executorData } = await supabase
    .rpc('get_executor_for_user', { user_id: user.id });

  // Extract the relationships from the response
  const executorRelationships = executorData?.executor_relationships || [];

  // Get pending invitations using a different approach
  const { data: invitationsData } = await supabase
    .rpc('get_pending_invitations', { 
      email_param: user.email,
      role_type: 'EXECUTOR'
    });
    
  // Render UI with relationships and invitations...
}
```

## Avoiding Infinite Recursion

The original problem was caused by:

1. `has_sharer_access()` querying both `ProfileSharer` AND `ProfileExecutor`
2. RLS policies on those same tables calling `has_sharer_access()`
3. This created a circular dependency causing infinite recursion

This is now fixed by using a multi-layered approach:

1. **Direct RLS Policies**: Using direct checks in policies for the base tables (`ProfileSharer`, `ProfileExecutor`) rather than the composite `has_sharer_access()` function
2. **Separate Helper Functions**: Splitting the helper function into separate targeted functions to prevent circular dependencies
3. **RPC Functions**: Using `SECURITY DEFINER` RPC functions that bypass RLS entirely for critical role-based queries
4. **Composite Access Function**: Using the composite function `has_sharer_access()` only for content tables, not for the base role tables

## Client-Side Role Helpers

The TypeScript helper functions in `utils/supabase/role-helpers.ts` provide client-side support for:

1. Determining effective roles
2. Routing users to the appropriate role-based sections of the app
3. Checking permissions for UI elements

## Navigation and Routing Structure

The application uses a consistent routing pattern based on roles:

1. `/select-role`: When a user has multiple roles, they select which to use
2. `/role-executor`: Lists all sharers for which the user is an executor
3. `/role-executor/[id]`: Manage a specific sharer's content as their executor
4. `/role-sharer`: Main dashboard for sharers
5. `/role-listener`: Main dashboard for listeners

## Maintenance Guidelines

When modifying the role system:

1. DO NOT use `has_sharer_access()` in RLS policies for `ProfileSharer` or `ProfileExecutor`
2. Use specific direct checks for those tables
3. For content tables, use `has_sharer_access()` for consistent access control
4. Use RPC functions with `SECURITY DEFINER` for complex queries that might trigger RLS recursion
5. Keep the folder structure (`role-sharer`, `role-executor`, `role-listener`) intact
6. When handling role transitions, consider using Redux to maintain state consistency
7. For dynamic routes with role-specific IDs, always resolve params via `Promise.resolve()` in server components 

## Session Caching and Performance Optimizations

To improve performance and reduce database load, Telloom implements a multi-level caching strategy for authentication:

### API-Level Caching

- The `/api/auth/session` endpoint uses an in-memory cache with a 1-minute TTL
- Session information is cached using Supabase cookie values as keys
- This drastically reduces database queries for frequent session checks
- Different users maintain separate cache entries based on their unique cookies

```typescript
// Example implementation in /api/auth/session/route.ts
const sessionCache = new Map<string, SessionCacheEntry>();
const SESSION_CACHE_TTL = 60 * 1000; // 1 minute cache TTL

// Get a unique identifier for the current request based on cookies
const cookieEntries = [...cookieStore.getAll()]
  .filter(cookie => cookie.name.includes('supabase'))
  .map(cookie => `${cookie.name}:${cookie.value.substring(0, 20)}`);

const cacheKey = cookieEntries.join('|');
const now = Date.now();

// Check the cache first if we have cookies
if (cacheKey) {
  const cachedSession = sessionCache.get(cacheKey);
  if (cachedSession && now - cachedSession.timestamp < SESSION_CACHE_TTL) {
    console.log('[API] Using cached session data');
    return NextResponse.json({ 
      session: cachedSession.userId ? {
        user: {
          id: cachedSession.userId,
          email: cachedSession.email,
        }
      } : null 
    });
  }
}
```

### Client-Side Session Management

- Session checks occur every 2 minutes instead of every 30 seconds
- Additional checks happen on initial page load, user state changes, and route changes
- Client-side caching for user data with a 2-minute TTL
- Role transitions include delays to ensure state consistency

### Performance Benefits

- **Reduced Database Load**: Minimizes Supabase authentication queries
- **Faster Page Transitions**: Cached session data speeds up role-based routing
- **Consistent UX**: Fewer loading states during navigation
- **Lower API Costs**: Significant reduction in API calls to Supabase Auth

### Best Practices for Role-Based Routes

When implementing role-based routes that depend on authentication state:

1. Use the centralized authentication context for client components
2. For server components, use the helper functions in `utils/supabase/role-helpers.ts`
3. Set appropriate cache invalidation when switching roles:
   ```typescript
   // When switching roles
   invalidateSessionCache();
   await setRoleCookie(newRole);
   router.push(`/role-${newRole.toLowerCase()}`);
   ```
4. Validate roles in layout components for protected routes
5. Use RPC functions for role relationship queries to avoid RLS recursion issues

This caching approach maintains security while significantly improving performance across the application, especially for role-based features that require frequent authentication checks. 