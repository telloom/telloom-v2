-- supabase/mcp_functions/get_listener_prompt_response_details.sql
-- Fetches details for a single prompt response for a listener, ensuring access, and provides navigation info.

CREATE OR REPLACE FUNCTION get_listener_prompt_response_details(
    p_prompt_id UUID,
    p_sharer_profile_id UUID, -- This is Profile.id of the sharer
    p_listener_profile_id UUID -- This is Profile.id of the current listener user
)
RETURNS TABLE (
    "promptId" UUID,
    "promptText" TEXT,
    "topicId" UUID,
    "topicName" TEXT,
    "responseId" UUID,
    "responseVideoId" UUID,
    "responseVideoMuxPlaybackId" TEXT,
    "responseVideoMuxAssetId" TEXT,
    "responseDateRecorded" TIMESTAMPTZ,
    "responseSummary" TEXT,
    "responseTranscriptId" UUID,
    "responseTranscriptText" TEXT,
    "responseAttachments" JSONB,
    "navigablePromptIds" UUID[],
    "currentPromptIndex" INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sharer_id_from_profile UUID; -- This will be ProfileSharer.id
    v_listener_has_access BOOLEAN;
    v_topic_id UUID;
    v_navigable_prompt_ids UUID[];
    v_current_prompt_index INTEGER;
BEGIN
    -- Get ProfileSharer.id from Profile.id for consistent access checks
    SELECT ps."id" INTO v_sharer_id_from_profile
    FROM "ProfileSharer" ps
    WHERE ps."profileId" = p_sharer_profile_id;

    IF v_sharer_id_from_profile IS NULL THEN
        RAISE WARNING 'Sharer profile mapping not found for Profile.id: %', p_sharer_profile_id;
        RETURN;
    END IF;

    -- Check listener access
    SELECT EXISTS (
        SELECT 1
        FROM "ProfileListener" pl
        WHERE pl."listenerId" = p_listener_profile_id
          AND pl."sharerId" = v_sharer_id_from_profile
          AND pl."hasAccess" = true
    ) INTO v_listener_has_access;

    IF NOT v_listener_has_access THEN
        RAISE EXCEPTION 'Access Denied: Listener % does not have access to sharer Profile.id % (ProfileSharer.id %)',
            p_listener_profile_id, p_sharer_profile_id, v_sharer_id_from_profile;
        RETURN;
    END IF;

    -- Get the topic ID for the current prompt
    SELECT p."promptCategoryId" INTO v_topic_id
    FROM "Prompt" p
    WHERE p.id = p_prompt_id;

    IF v_topic_id IS NULL THEN
        RAISE WARNING 'Topic not found for prompt ID: %', p_prompt_id;
        RETURN;
    END IF;

    -- Get all prompt IDs in the same topic that have a response from this sharer
    WITH PromptsInTopicWithResponses AS (
        SELECT p_nav.id AS prompt_id, ROW_NUMBER() OVER (ORDER BY p_nav."createdAt" ASC, p_nav.id ASC) as rn
        FROM "Prompt" p_nav
        JOIN "PromptResponse" pr_nav ON p_nav.id = pr_nav."promptId"
        WHERE p_nav."promptCategoryId" = v_topic_id
          AND pr_nav."profileSharerId" = v_sharer_id_from_profile
        ORDER BY p_nav."createdAt" ASC, p_nav.id ASC
    )
    SELECT 
        array_agg(pitwr.prompt_id ORDER BY pitwr.rn ASC),
        (SELECT pitwr.rn - 1 FROM PromptsInTopicWithResponses pitwr WHERE pitwr.prompt_id = p_prompt_id)
    INTO v_navigable_prompt_ids, v_current_prompt_index
    FROM PromptsInTopicWithResponses pitwr;

    -- If access is granted, proceed to fetch prompt details
    RETURN QUERY
    SELECT
        p.id AS "promptId",
        p."promptText"::TEXT AS "promptText",
        pc.id AS "topicId",
        pc.category AS "topicName",
        pr.id AS "responseId",
        pr."videoId" AS "responseVideoId",
        v."muxPlaybackId" AS "responseVideoMuxPlaybackId",
        v."muxAssetId" AS "responseVideoMuxAssetId",
        v."dateRecorded" AS "responseDateRecorded",
        pr.summary AS "responseSummary",
        prvt.id AS "responseTranscriptId", 
        prvt.transcript AS "responseTranscriptText",
        (
            SELECT jsonb_agg(jsonb_build_object(
                'id', pra.id,
                'fileUrl', pra."fileUrl",
                'fileName', pra."fileName",
                'fileType', pra."fileType",
                'title', pra.title,
                'description', pra.description,
                'dateCaptured', pra."dateCaptured",
                'yearCaptured', pra."yearCaptured"
            ))
            FROM "PromptResponseAttachment" pra
            WHERE pra."promptResponseId" = pr.id
            AND pra."profileSharerId" = v_sharer_id_from_profile 
        ) AS "responseAttachments",
        v_navigable_prompt_ids AS "navigablePromptIds",
        v_current_prompt_index AS "currentPromptIndex"
    FROM "Prompt" p
    JOIN "PromptCategory" pc ON p."promptCategoryId" = pc.id
    LEFT JOIN "PromptResponse" pr ON pr."promptId" = p.id AND pr."profileSharerId" = v_sharer_id_from_profile 
    LEFT JOIN "Video" v ON v.id = pr."videoId"
    LEFT JOIN "VideoTranscript" prvt ON prvt."videoId" = v.id 
    WHERE p.id = p_prompt_id;

END;
$$;

-- Example Call:
-- SELECT * FROM get_listener_prompt_response_details(
--   '<prompt_uuid>',          -- p_prompt_id
--   '<sharer_profile_uuid>',  -- p_sharer_profile_id (Profile.id of the sharer)
--   '<listener_profile_uuid>' -- p_listener_profile_id (Profile.id of the current user)
-- ); 