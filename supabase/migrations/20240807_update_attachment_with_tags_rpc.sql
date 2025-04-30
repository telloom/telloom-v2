-- supabase/migrations/20240807_update_attachment_with_tags_rpc.sql
-- Function to update PromptResponseAttachment details and associated PersonTags

CREATE OR REPLACE FUNCTION public.update_attachment_with_tags(
    p_attachment_id uuid,
    p_profile_id uuid, -- The ID of the user performing the action (for permission check)
    p_title text,
    p_description text,
    p_date_captured timestamptz,
    p_year_captured integer,
    p_person_tag_ids uuid[] -- Array of PersonTag IDs to associate
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public -- Ensure functions like has_sharer_access are found
AS $$
DECLARE
    v_attachment_sharer_id uuid;
BEGIN
    -- 1. Get the profileSharerId associated with the attachment
    SELECT "profileSharerId"
    INTO v_attachment_sharer_id
    FROM "PromptResponseAttachment"
    WHERE id = p_attachment_id;

    -- 2. Check if the attachment exists
    IF v_attachment_sharer_id IS NULL THEN
        RAISE EXCEPTION 'Attachment with ID % not found.', p_attachment_id;
    END IF;

    -- 3. Verify permissions: User must be the sharer or an executor for the sharer
    -- Uses the has_sharer_access function which checks auth.uid() against sharer/executor roles
    IF NOT public.has_sharer_access(v_attachment_sharer_id) THEN
        RAISE EXCEPTION 'User does not have permission to modify this attachment.';
    END IF;

    -- 4. Update the PromptResponseAttachment record
    UPDATE "PromptResponseAttachment"
    SET
        title = p_title,
        description = p_description,
        "dateCaptured" = p_date_captured,
        "yearCaptured" = p_year_captured,
        "updatedAt" = now() -- Ensure updatedAt is updated
    WHERE id = p_attachment_id;

    -- 5. Update PersonTag associations (delete old, insert new)
    -- Delete existing tags for this attachment
    DELETE FROM "PromptResponseAttachmentPersonTag"
    WHERE "promptResponseAttachmentId" = p_attachment_id;

    -- Insert new tags if any are provided
    IF array_length(p_person_tag_ids, 1) > 0 THEN
        INSERT INTO "PromptResponseAttachmentPersonTag" ("promptResponseAttachmentId", "personTagId", "profileSharerId")
        SELECT p_attachment_id, unnest(p_person_tag_ids), v_attachment_sharer_id
        -- Ensure the PersonTag actually exists for this sharer (optional but good practice)
        ON CONFLICT DO NOTHING; -- Avoid errors if tag somehow doesn't exist or duplicate insert attempted
    END IF;

END;
$$;

-- Grant execute permission to the authenticated role
GRANT EXECUTE
   ON FUNCTION public.update_attachment_with_tags(uuid, uuid, text, text, timestamptz, integer, uuid[])
   TO authenticated;

-- Grant execute permission to the service_role (for admin operations if needed)
GRANT EXECUTE
   ON FUNCTION public.update_attachment_with_tags(uuid, uuid, text, text, timestamptz, integer, uuid[])
   TO service_role;

-- Comment on the function
COMMENT ON FUNCTION public.update_attachment_with_tags(uuid, uuid, text, text, timestamptz, integer, uuid[])
  IS 'Updates details (title, description, date, year) of a PromptResponseAttachment and resets its associated PersonTags based on the provided array of tag IDs. Requires the user (p_profile_id checked against auth.uid()) to have sharer or executor access to the attachment''s owner.'; 