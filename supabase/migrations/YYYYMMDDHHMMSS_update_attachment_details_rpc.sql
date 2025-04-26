-- supabase/migrations/YYYYMMDDHHMMSS_update_attachment_details_rpc.sql
-- Function for executors or sharers to update attachment details and tags

CREATE OR REPLACE FUNCTION public.update_attachment_details(
    p_attachment_id UUID,
    p_title TEXT,
    p_description TEXT,
    p_date_captured DATE,
    p_year_captured INT,
    p_person_tag_ids UUID[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Use definer to manage tags potentially owned by sharer
SET search_path = public
AS $$
DECLARE
    v_sharer_id UUID;
    v_profile_id UUID;
    tag_id UUID;
BEGIN
    -- 1. Get the associated sharer ID and profile ID for permission check
    SELECT "profileSharerId" INTO v_sharer_id
    FROM "PromptResponseAttachment"
    WHERE id = p_attachment_id;

    IF v_sharer_id IS NULL THEN
        RAISE EXCEPTION 'Attachment not found: %', p_attachment_id;
    END IF;

    -- Get the profile ID associated with the sharer ID
    SELECT ps."profileId" INTO v_profile_id
    FROM "ProfileSharer" ps
    WHERE ps.id = v_sharer_id;

    -- 2. Permission Check: Ensure the current user is the sharer owner OR an executor for that sharer
    IF NOT (
        auth.uid() = v_profile_id OR -- Check if the user is the sharer owner
        EXISTS ( -- Check if the user is an executor for this sharer
            SELECT 1
            FROM "ProfileExecutor" pe
            WHERE pe."sharerId" = v_sharer_id AND pe."executorId" = auth.uid()
        )
    ) THEN
        RAISE EXCEPTION 'Permission denied to update attachment %. User % is not the sharer or an authorized executor.', p_attachment_id, auth.uid();
    END IF;

    -- 3. Update PromptResponseAttachment table
    UPDATE "PromptResponseAttachment"
    SET
        title = p_title,
        description = p_description,
        "dateCaptured" = p_date_captured,
        "yearCaptured" = p_year_captured,
        "updatedAt" = now()
    WHERE id = p_attachment_id;

    -- 4. Manage Person Tags (delete old, insert new)
    -- Delete existing tags for this attachment
    DELETE FROM "PromptResponseAttachmentPersonTag"
    WHERE "promptResponseAttachmentId" = p_attachment_id;

    -- Insert new tags if any are provided
    IF array_length(p_person_tag_ids, 1) > 0 THEN
        FOREACH tag_id IN ARRAY p_person_tag_ids
        LOOP
            -- Ensure the tag exists and belongs to the *correct* sharer
            -- (although permission check should cover this, double-check for safety)
            IF EXISTS (SELECT 1 FROM "PersonTag" pt WHERE pt.id = tag_id AND pt."profileSharerId" = v_sharer_id) THEN
                INSERT INTO "PromptResponseAttachmentPersonTag" ("promptResponseAttachmentId", "personTagId")
                VALUES (p_attachment_id, tag_id);
            ELSE
                 RAISE WARNING 'Skipping tag ID % because it does not exist or does not belong to sharer %', tag_id, v_sharer_id;
            END IF;
        END LOOP;
    END IF;

END;
$$; 