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
$$;

-- Checks if user is the owner of a ProfileSharer record
CREATE OR REPLACE FUNCTION public.is_sharer_owner(sharer_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM "ProfileSharer" ps
    WHERE ps.id = sharer_id AND ps."profileId" = auth.uid()
  );
$$;

-- Checks if user is an executor for a sharer
CREATE OR REPLACE FUNCTION public.is_executor_for_sharer(sharer_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM "ProfileExecutor" pe
    WHERE pe."sharerId" = sharer_id AND pe."executorId" = auth.uid()
  );
$$;
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
$$;
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

## Avoiding Infinite Recursion

The original problem was caused by:

1. `has_sharer_access()` querying both `ProfileSharer` AND `ProfileExecutor`
2. RLS policies on those same tables calling `has_sharer_access()`
3. This created a circular dependency causing infinite recursion

This is now fixed by:

1. Using direct checks in policies for the base tables (`ProfileSharer`, `ProfileExecutor`)
2. Splitting the helper function into separate targeted functions
3. Using the composite function `has_sharer_access()` only for content tables

## Client-Side Role Helpers

The TypeScript helper functions in `utils/supabase/role-helpers.ts` provide client-side support for:

1. Determining effective roles
2. Routing users to the appropriate role-based sections of the app
3. Checking permissions for UI elements

## Maintenance Guidelines

When modifying the role system:

1. DO NOT use `has_sharer_access()` in RLS policies for `ProfileSharer` or `ProfileExecutor`
2. Use specific direct checks for those tables
3. For other content tables, use `has_sharer_access()` for consistent access control
4. Update client-side helpers in `utils/supabase/role-helpers.ts` to match database changes
5. Keep the folder structure (`role-sharer`, `role-executor`, `role-listener`) intact 