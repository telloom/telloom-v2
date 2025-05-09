-- supabase/mcp_functions/get_listener_topic_attachments_for_dialog.sql
-- This function retrieves all attachments for a given topic, accessible by an authorized listener, the sharer/executor, or an admin.
CREATE OR REPLACE FUNCTION public.get_listener_topic_attachments_for_dialog(
    p_profile_sharer_id UUID,
    p_prompt_topic_id UUID
)
RETURNS TABLE (
    id UUID,
    "storagePath" TEXT,
    "fileType" TEXT,
    "fileName" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE,
    "promptText" TEXT,
    "promptResponseId" UUID,
    "promptId" UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public -- Ensures the function runs with the permissions of the definer and public schema is in search path
AS $$
BEGIN
    -- Access Check:
    -- Verify that the calling user is either an admin,
    -- has sharer-level access (owner or executor) to the specified sharer profile,
    -- or has listener-level access (approved listener) to the specified sharer profile.
    -- The p_profile_sharer_id parameter refers to the ProfileSharer.id.
    IF NOT (
        public.is_admin() OR
        public.has_sharer_access(p_profile_sharer_id) OR
        public.has_listener_access(p_profile_sharer_id)
    ) THEN
        RAISE EXCEPTION 'User does not have sufficient permissions to view attachments for this topic.';
    END IF;

    -- Return Query:
    -- Selects attachment details along with related prompt information.
    -- Filters by the provided profileSharerId and promptTopicId.
    RETURN QUERY
    SELECT
        pra.id,
        pra."storagePath",
        pra."fileType",
        pra."fileName",
        pra."createdAt",
        p."promptText",
        pr.id AS "promptResponseId", -- Alias for clarity
        p.id AS "promptId"          -- Alias for clarity
    FROM
        "PromptResponseAttachment" pra
    JOIN
        "PromptResponse" pr ON pra."promptResponseId" = pr.id
    JOIN
        "Prompt" p ON pr."promptId" = p.id
    WHERE
        pr."profileSharerId" = p_profile_sharer_id -- Ensures attachments belong to the specified sharer
        AND p."promptTopicId" = p_prompt_topic_id;  -- Filters attachments by the specified topic
END;
$$; 