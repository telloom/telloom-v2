-- Fix PersonTag and PromptResponseAttachmentPersonTag policies
-- This migration addresses permission issues when accessing these tables via the admin client

-- First, let's ensure the tables have RLS enabled
ALTER TABLE IF EXISTS "PersonTag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "PromptResponseAttachmentPersonTag" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "PersonTag_admin_policy" ON "PersonTag";
DROP POLICY IF EXISTS "PersonTag_sharer_policy" ON "PersonTag";
DROP POLICY IF EXISTS "PersonTag_executor_policy" ON "PersonTag";
DROP POLICY IF EXISTS "PromptResponseAttachmentPersonTag_access_policy" ON "PromptResponseAttachmentPersonTag";

-- Create direct policies for PersonTag to avoid infinite recursion
CREATE POLICY "PersonTag_admin_policy" ON "PersonTag"
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "PersonTag_sharer_policy" ON "PersonTag"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "ProfileSharer" ps
      WHERE ps.id = "PersonTag"."profileSharerId"
      AND ps."profileId" = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "ProfileSharer" ps
      WHERE ps.id = "PersonTag"."profileSharerId"
      AND ps."profileId" = auth.uid()
    )
  );

CREATE POLICY "PersonTag_executor_policy" ON "PersonTag"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "ProfileExecutor" pe
      WHERE pe."sharerId" = "PersonTag"."profileSharerId"
      AND pe."executorId" = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "ProfileExecutor" pe
      WHERE pe."sharerId" = "PersonTag"."profileSharerId"
      AND pe."executorId" = auth.uid()
    )
  );

-- Create direct policies for PromptResponseAttachmentPersonTag to avoid infinite recursion
CREATE POLICY "PromptResponseAttachmentPersonTag_admin_policy" ON "PromptResponseAttachmentPersonTag"
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "PromptResponseAttachmentPersonTag_sharer_policy" ON "PromptResponseAttachmentPersonTag"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "PromptResponseAttachment" pra
      JOIN "PromptResponse" pr ON pr.id = pra."promptResponseId"
      JOIN "ProfileSharer" ps ON ps.id = pr."profileSharerId"
      WHERE pra.id = "PromptResponseAttachmentPersonTag"."promptResponseAttachmentId"
      AND ps."profileId" = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "PromptResponseAttachment" pra
      JOIN "PromptResponse" pr ON pr.id = pra."promptResponseId"
      JOIN "ProfileSharer" ps ON ps.id = pr."profileSharerId"
      WHERE pra.id = "PromptResponseAttachmentPersonTag"."promptResponseAttachmentId"
      AND ps."profileId" = auth.uid()
    )
  );

CREATE POLICY "PromptResponseAttachmentPersonTag_executor_policy" ON "PromptResponseAttachmentPersonTag"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "PromptResponseAttachment" pra
      JOIN "PromptResponse" pr ON pr.id = pra."promptResponseId"
      JOIN "ProfileExecutor" pe ON pe."sharerId" = pr."profileSharerId"
      WHERE pra.id = "PromptResponseAttachmentPersonTag"."promptResponseAttachmentId"
      AND pe."executorId" = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "PromptResponseAttachment" pra
      JOIN "PromptResponse" pr ON pr.id = pra."promptResponseId"
      JOIN "ProfileExecutor" pe ON pe."sharerId" = pr."profileSharerId"
      WHERE pra.id = "PromptResponseAttachmentPersonTag"."promptResponseAttachmentId"
      AND pe."executorId" = auth.uid()
    )
  );

-- Create RPC function to safely get PersonTags for a sharer
CREATE OR REPLACE FUNCTION get_person_tags_for_sharer(sharer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT 
    jsonb_agg(
      jsonb_build_object(
        'id', pt.id,
        'name', pt.name,
        'profileSharerId', pt."profileSharerId",
        'createdAt', pt."createdAt"
      )
    )
  FROM "PersonTag" pt
  WHERE pt."profileSharerId" = sharer_id
  INTO result;
  
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- Create RPC function to safely get attachment person tags
CREATE OR REPLACE FUNCTION get_attachment_person_tags(attachment_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT 
    jsonb_agg(
      jsonb_build_object(
        'promptResponseAttachmentId', prapt."promptResponseAttachmentId",
        'personTagId', prapt."personTagId",
        'personTag', jsonb_build_object(
          'id', pt.id,
          'name', pt.name
        )
      )
    )
  FROM "PromptResponseAttachmentPersonTag" prapt
  JOIN "PersonTag" pt ON pt.id = prapt."personTagId"
  WHERE prapt."promptResponseAttachmentId" = ANY(attachment_ids)
  INTO result;
  
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;
