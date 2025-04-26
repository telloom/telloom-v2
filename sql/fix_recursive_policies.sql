-- ========================================================
-- Fix for Infinite Recursion in RLS Policies
-- ========================================================
-- This script addresses the infinite recursion issue in RLS policies
-- for ProfileSharer and ProfileExecutor tables by:
-- 1. Redefining helper functions to avoid recursion
-- 2. Creating direct policies that don't rely on helper functions
-- 3. Enabling RLS for the affected tables

-- ========================================================
-- STEP 1: Drop existing policies to prevent dependency issues
-- ========================================================

-- Drop policies on ProfileSharer table
DROP POLICY IF EXISTS "Profiles can view own sharer" ON "ProfileSharer";
DROP POLICY IF EXISTS "Profiles can update own sharer" ON "ProfileSharer";
DROP POLICY IF EXISTS "Profiles can delete own sharer" ON "ProfileSharer";
DROP POLICY IF EXISTS "Profiles can insert own sharer" ON "ProfileSharer";
DROP POLICY IF EXISTS "Executors can view sharers they represent" ON "ProfileSharer";

-- Drop policies on ProfileExecutor table
DROP POLICY IF EXISTS "Sharers can manage executors" ON "ProfileExecutor";
DROP POLICY IF EXISTS "Executors can view own relationships" ON "ProfileExecutor";
DROP POLICY IF EXISTS "Admins can manage all executors" ON "ProfileExecutor";

-- ========================================================
-- STEP 2: Redefine helper functions to avoid recursion
-- ========================================================

-- Drop existing helper functions WITH CASCADE to handle dependencies
DROP FUNCTION IF EXISTS public.has_sharer_access(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

-- Create a base-level function to check if a user is an admin
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

-- Create a base-level function to check if a user is the owner of a ProfileSharer record
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

-- Create a base-level function to check if a user is an executor for a sharer
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

-- Recreate the has_sharer_access function using the base-level functions
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

-- ========================================================
-- STEP 3: Create direct RLS policies for ProfileSharer table
-- ========================================================

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

-- Allow profiles to update their own sharer record
CREATE POLICY "Profiles can update own sharer" ON "ProfileSharer"
  FOR UPDATE
  USING (
    "profileId" = auth.uid() OR
    public.is_admin()
  )
  WITH CHECK (
    "profileId" = auth.uid() OR
    public.is_admin()
  );

-- Allow profiles to delete their own sharer record
CREATE POLICY "Profiles can delete own sharer" ON "ProfileSharer"
  FOR DELETE
  USING (
    "profileId" = auth.uid() OR
    public.is_admin()
  );

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

-- ========================================================
-- STEP 4: Create direct RLS policies for ProfileExecutor table
-- ========================================================

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

-- ========================================================
-- STEP 5: Enable Row Level Security on the tables if needed
-- ========================================================
ALTER TABLE "ProfileSharer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProfileExecutor" ENABLE ROW LEVEL SECURITY;

-- ========================================================
-- STEP 6: Recreate dependent policies that were dropped by CASCADE
-- ========================================================

-- Note: The following policies need to be recreated because they depended on
-- the has_sharer_access function that we dropped with CASCADE.
-- You may need to adjust these based on your specific schema.

-- Recreate FollowRequest policies
CREATE POLICY "FollowRequest_delete_policy" ON "FollowRequest"
  FOR DELETE
  USING (public.has_sharer_access("sharerId"));

-- Recreate PromptResponse policies
CREATE POLICY "PromptResponse_manage_policy" ON "PromptResponse"
  FOR ALL
  USING (public.has_sharer_access("profileSharerId"))
  WITH CHECK (public.has_sharer_access("profileSharerId"));

-- Recreate PromptResponseAttachmentPersonTag policies
CREATE POLICY "PromptResponseAttachmentPersonTag_access_policy" ON "PromptResponseAttachmentPersonTag"
  FOR ALL
  USING (
    public.is_admin() OR public.has_sharer_access((
      SELECT pr."profileSharerId"
      FROM "PromptResponse" pr
      JOIN "PromptResponseAttachment" pra ON pr.id = pra."promptResponseId"
      WHERE pra.id = "PromptResponseAttachmentPersonTag"."promptResponseAttachmentId"
    ))
  )
  WITH CHECK (
    public.is_admin() OR public.has_sharer_access((
      SELECT pr."profileSharerId"
      FROM "PromptResponse" pr
      JOIN "PromptResponseAttachment" pra ON pr.id = pra."promptResponseId"
      WHERE pra.id = "PromptResponseAttachmentPersonTag"."promptResponseAttachmentId"
    ))
  ); 