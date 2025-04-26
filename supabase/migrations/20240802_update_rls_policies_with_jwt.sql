-- Migration: Update RLS policies to use JWT claims
-- Created: August 2, 2024

-- 1. Helper functions that use JWT claims instead of database queries

-- Function to check if user is a sharer from JWT claims
CREATE OR REPLACE FUNCTION public.is_sharer_from_jwt()
RETURNS boolean AS $$
BEGIN
  RETURN COALESCE((auth.jwt()->>'app_metadata')::jsonb->>'is_sharer', 'false')::boolean;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Function to check if user has executor role from JWT claims
CREATE OR REPLACE FUNCTION public.has_executor_role_from_jwt()
RETURNS boolean AS $$
BEGIN
  RETURN COALESCE((auth.jwt()->>'app_metadata')::jsonb->>'has_executor', 'false')::boolean;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Function to get user's roles from JWT claims
CREATE OR REPLACE FUNCTION public.get_roles_from_jwt()
RETURNS text[] AS $$
BEGIN
  RETURN COALESCE((auth.jwt()->>'app_metadata')::jsonb->'roles', '[]'::jsonb)::text[];
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Function to check if user has specific role from JWT
CREATE OR REPLACE FUNCTION public.has_role_from_jwt(role_name text)
RETURNS boolean AS $$
BEGIN
  RETURN role_name = ANY(public.get_roles_from_jwt());
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Function to get sharer ID from JWT claims
CREATE OR REPLACE FUNCTION public.get_sharer_id_from_jwt()
RETURNS uuid AS $$
DECLARE
  sharer_id text;
BEGIN
  sharer_id := (auth.jwt()->>'app_metadata')::jsonb->>'sharer_id';
  IF sharer_id IS NULL OR sharer_id = 'null' THEN
    RETURN NULL;
  END IF;
  RETURN sharer_id::uuid;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- 2. Update key policies for performance and to use JWT claims

-- Update Video table policies
DROP POLICY IF EXISTS "content_access_policy" ON "Video";
CREATE POLICY "content_access_policy" ON "Video"
  FOR ALL 
  USING (
    -- Use a combination of JWT claims for common cases and database checks for others
    (
      -- If user is a sharer accessing their own videos
      (public.is_sharer_from_jwt() AND "profileSharerId" = public.get_sharer_id_from_jwt())
      OR
      -- Admin case
      public.is_admin()
    )
    OR
    -- For executor access, we still need to check the database since the specific
    -- sharer-executor relationship isn't in the JWT
    public.is_executor_for_sharer("profileSharerId")
  )
  WITH CHECK (
    -- Same check for write operations
    (
      (public.is_sharer_from_jwt() AND "profileSharerId" = public.get_sharer_id_from_jwt())
      OR
      public.is_admin()
    )
    OR
    public.is_executor_for_sharer("profileSharerId")
  );

-- Update PromptResponse table policies
DROP POLICY IF EXISTS "content_access_policy" ON "PromptResponse";
CREATE POLICY "content_access_policy" ON "PromptResponse"
  FOR ALL 
  USING (
    (
      (public.is_sharer_from_jwt() AND "profileSharerId" = public.get_sharer_id_from_jwt())
      OR
      public.is_admin()
    )
    OR
    public.is_executor_for_sharer("profileSharerId")
  )
  WITH CHECK (
    (
      (public.is_sharer_from_jwt() AND "profileSharerId" = public.get_sharer_id_from_jwt())
      OR
      public.is_admin()
    )
    OR
    public.is_executor_for_sharer("profileSharerId")
  );

-- Update PromptCategory table policies (previously incorrectly named as "Topic")
DROP POLICY IF EXISTS "content_access_policy" ON "PromptCategory";
CREATE POLICY "content_access_policy" ON "PromptCategory"
  FOR ALL 
  USING (
    -- All authenticated users can access prompt categories
    -- as they are shared resource not specific to any user
    auth.role() = 'authenticated'
  )
  WITH CHECK (
    -- Only admins can modify prompt categories
    public.is_admin()
  );

-- Add comment to document the changes
COMMENT ON FUNCTION public.is_sharer_from_jwt IS 'Checks if the current user is a sharer based on JWT claims';
COMMENT ON FUNCTION public.has_executor_role_from_jwt IS 'Checks if the current user has executor role based on JWT claims';
COMMENT ON FUNCTION public.get_roles_from_jwt IS 'Gets the current user''s roles from JWT claims';
COMMENT ON FUNCTION public.has_role_from_jwt IS 'Checks if the current user has a specific role based on JWT claims';
COMMENT ON FUNCTION public.get_sharer_id_from_jwt IS 'Gets the current user''s sharer ID from JWT claims'; 