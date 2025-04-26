# Telloom Roles and Access Design

This document outlines the role-based access system implemented in Telloom, explaining how different roles interact with content and how the Row Level Security (RLS) policies enforce access control.

## 1. Role Structure

Telloom has four primary roles that determine a user's capabilities within the system:

1. **SHARER**: Users who share their personal histories through the platform. They create content and can designate executors.
2. **EXECUTOR**: Users who can manage content on behalf of sharers, typically designated to handle a sharer's affairs if they become unable to do so.
3. **LISTENER**: Users who consume content that sharers have shared with them.
4. **ADMIN**: Special users with administrative privileges across the platform.

### Key Relationships

- A user can have multiple roles (e.g., someone can be both a SHARER and an EXECUTOR).
- EXECUTOR role is particularly important as it creates a relationship between the executor and one or more sharers, allowing the executor to act on behalf of those sharers.

## 2. Database Schema

The role system is implemented through several interconnected tables:

### Core Tables

- **Profile**: Base user profile information.
- **ProfileRole**: Assigns roles to profiles (many-to-many relationship).
- **ProfileSharer**: Extended information for users with the SHARER role.
- **ProfileListener**: Extended information for users with the LISTENER role.
- **ProfileExecutor**: Relationship table that connects executors to sharers they represent.

### Schema Relationships

```
Profile (1) --- (N) ProfileRole (role assignments)
Profile (1) --- (0..1) ProfileSharer (if user is a SHARER)
Profile (1) --- (N) ProfileExecutor.executorId (if user is an EXECUTOR)
ProfileSharer (1) --- (N) ProfileExecutor.sharerId (sharers can have multiple executors)
```

## 3. Helper Functions

To prevent infinite recursion in RLS policies, we've implemented a set of helper functions:

### Base-Level Functions

These functions check specific access patterns and avoid circular dependencies:

1. **`is_admin()`**: Checks if the current user has admin privileges.
    ```sql
    CREATE OR REPLACE FUNCTION public.is_admin()
    RETURNS boolean
    LANGUAGE sql
    SECURITY DEFINER
    AS $$
      SELECT
        COALESCE(
          (
            SELECT
              CASE
                WHEN raw_app_meta_data->>'role' = 'admin' THEN TRUE
                WHEN raw_app_meta_data->'is_super_admin' = 'true' THEN TRUE
                ELSE FALSE
              END
            FROM auth.users
            WHERE id = auth.uid()
          ),
          FALSE
        )
    $$;
    ```

2. **`is_sharer_owner(sharer_id)`**: Checks if the current user is the owner of a ProfileSharer record.
    ```sql
    CREATE OR REPLACE FUNCTION public.is_sharer_owner(sharer_id uuid)
    RETURNS boolean
    LANGUAGE sql
    SECURITY DEFINER
    AS $$
      SELECT EXISTS (
        SELECT 1
        FROM "ProfileSharer" ps
        WHERE ps.id = sharer_id
          AND ps."profileId" = auth.uid()
      )
    $$;
    ```

3. **`is_executor_for_sharer(sharer_id)`**: Checks if the current user is an executor for a sharer.
    ```sql
    CREATE OR REPLACE FUNCTION public.is_executor_for_sharer(sharer_id uuid)
    RETURNS boolean
    LANGUAGE sql
    SECURITY DEFINER
    AS $$
      SELECT EXISTS (
        SELECT 1
        FROM "ProfileExecutor" pe
        WHERE pe."sharerId" = sharer_id
          AND pe."executorId" = auth.uid()
      )
    $$;
    ```

### High-Level Access Function

This function composes the base-level checks:

```sql
CREATE OR REPLACE FUNCTION public.has_sharer_access(sharer_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    CASE
      WHEN public.is_admin() THEN TRUE
      WHEN public.is_sharer_owner(sharer_id) THEN TRUE
      WHEN public.is_executor_for_sharer(sharer_id) THEN TRUE
      ELSE FALSE
    END
$$;
```

### RPC Functions for Emergency Access

These functions bypass RLS for emergency role resolution:

1. **`get_executor_for_user(user_id)`**: Gets executor relationships for a user.
2. **`is_admin(user_id)`**: Checks admin status for a specific user.
3. **`has_sharer_access_check(user_id, sharer_id)`**: Checks if a user has access to a sharer.
4. **`get_user_role_emergency(user_id)`**: Gets comprehensive role information when RLS is causing issues.

## 4. RLS Policies

### ProfileSharer Table Policies

For the `ProfileSharer` table, we need direct policies that don't rely on the `has_sharer_access` function:

```sql
-- Allow profiles to view their own sharer record
CREATE POLICY "Profiles can view own sharer" ON "ProfileSharer"
  FOR SELECT
  USING (
    "profileId" = auth.uid() OR
    public.is_admin()
  );

-- Allow profiles to insert their own sharer record
CREATE POLICY "Profiles can insert own sharer" ON "ProfileSharer"
  FOR INSERT
  WITH CHECK (
    "profileId" = auth.uid() OR
    public.is_admin()
  );

-- Similar policies for UPDATE and DELETE...

-- Allow executors to view ProfileSharer records they are associated with
CREATE POLICY "Executors can view sharers they represent" ON "ProfileSharer"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM "ProfileExecutor" pe
      WHERE pe."sharerId" = "ProfileSharer".id
        AND pe."executorId" = auth.uid()
    )
  );
```

### ProfileExecutor Table Policies

For the `ProfileExecutor` table, we also need direct policies:

```sql
-- Allow sharers to manage executors for their sharer record
CREATE POLICY "Sharers can manage executors" ON "ProfileExecutor"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM "ProfileSharer" ps
      WHERE ps.id = "ProfileExecutor"."sharerId"
        AND ps."profileId" = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM "ProfileSharer" ps
      WHERE ps.id = "ProfileExecutor"."sharerId"
        AND ps."profileId" = auth.uid()
    )
  );

-- Allow executors to view their own relationships
CREATE POLICY "Executors can view own relationships" ON "ProfileExecutor"
  FOR SELECT
  USING (
    "executorId" = auth.uid()
  );

-- Allow admins to manage all executor relationships
CREATE POLICY "Admins can manage all executors" ON "ProfileExecutor"
  FOR ALL
  USING (
    public.is_admin()
  )
  WITH CHECK (
    public.is_admin()
  );
```

### Other Tables

For other tables that store content (e.g., `PromptResponse`, `Video`, etc.), we can use the `has_sharer_access` function safely:

```sql
CREATE POLICY "User can manage their own videos" ON "Video"
  FOR ALL
  USING (public.has_sharer_access("profileSharerId"))
  WITH CHECK (public.has_sharer_access("profileSharerId"));
```

## 5. Approach to Avoid Infinite Recursion

The key issue we faced was that the `has_sharer_access()` function was querying both `ProfileSharer` and `ProfileExecutor`, and then RLS policies on those same tables were also calling this function, creating an infinite loop.

Our solution approach:

1. **Direct Checks in Base Tables**: For the base tables (`ProfileSharer` and `ProfileExecutor`), we use direct checks in the policies rather than calling `has_sharer_access`.

2. **Split Helper Functions**: We split the helper functions into targeted functions that check specific aspects of access.

3. **RPC Emergency Functions**: We added RPC functions with `SECURITY DEFINER` to bypass RLS when needed for emergency access.

4. **Client-Side Fallbacks**: In TypeScript, we implemented robust client-side helpers with multiple fallback mechanisms.

## 6. Client-Side Role Helpers

In TypeScript, we've implemented the following helpers:

1. **`getEffectiveSharerId`**: Gets the effective sharer ID for the current user with fallbacks.
2. **`hasSharerProfile`**: Checks if the user has a SHARER profile.
3. **`hasExecutorRelationship`**: Checks if the user has an EXECUTOR relationship.
4. **`getAppropriateRoleRoute`**: Determines the appropriate route based on the user's roles.
5. **`isAdmin`**: Checks if the user has admin privileges.
6. **`hasSharerAccess`**: Verifies if the user has access to a sharer's content.

These client-side helpers implement multiple fallback mechanisms and use the admin client when necessary to bypass RLS issues.

## 7. Maintaining the Role System

When modifying the role system, follow these guidelines:

1. **Never use `has_sharer_access()` in RLS policies for `ProfileSharer` or `ProfileExecutor`**: This will cause infinite recursion.
2. **Use direct checks in base table policies**: Always use direct checks for tables that form the foundation of the role system.
3. **Test emergency functions**: Ensure the RPC emergency functions work correctly for bypassing RLS.
4. **Keep client-side helpers in sync**: When modifying database functions, update the TypeScript helpers accordingly.
5. **Document relationships**: Always document new relationships between roles and how they affect access control.

By following this design, Telloom maintains a robust role-based access control system that correctly handles the EXECUTOR role's ability to manage content on behalf of SHARERS while preventing infinite recursion in RLS policies. 