CREATE OR REPLACE FUNCTION public.get_listener_topic_prompts_and_responses(p_prompt_category_id uuid, p_sharer_profile_id uuid, p_listener_profile_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
    v_has_access boolean := false;
    result jsonb;
    v_ps_id uuid; -- To store ProfileSharer.id
BEGIN
    -- 0. Get ProfileSharer.id once
    SELECT id INTO v_ps_id FROM "ProfileSharer" WHERE "profileId" = p_sharer_profile_id LIMIT 1;

    IF v_ps_id IS NULL THEN
        RAISE EXCEPTION 'Sharer profile not found for profile ID %', p_sharer_profile_id;
    END IF;

    -- 1. Authorization Check: Ensure the listener has access to the sharer.
    SELECT EXISTS (
        SELECT 1
        FROM "ProfileListener" pl
        WHERE pl."listenerId" = p_listener_profile_id
          AND pl."sharerId" = v_ps_id -- Use cached ProfileSharer.id
          AND pl."hasAccess" = true
    ) INTO v_has_access;

    IF NOT v_has_access THEN
        RAISE EXCEPTION 'Access Denied: Listener % does not have access to sharer profile %.', p_listener_profile_id, p_sharer_profile_id;
    END IF;

    -- 2. Fetch Data
    SELECT
        jsonb_build_object(
            'id', pc.id,                         -- Corrected field name
            'category', pc.category,             -- Corrected field name
            'description', pc.description,       -- Corrected field name
            'theme', pc.theme::text,
            'prompts', COALESCE(
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', p.id,
                            'promptText', p."promptText",
                            'isContextEstablishing', p."isContextEstablishing",
                            'sharerResponse', (
                                SELECT jsonb_build_object(
                                    'id', pr_resp.id, -- PromptResponse.id
                                    'videoId', pr_resp."videoId",
                                    'summary', pr_resp.summary,
                                    'responseNotes', pr_resp."responseNotes",
                                    'createdAt', pr_resp."createdAt"::text,
                                    'updatedAt', pr_resp."updatedAt"::text,
                                    'video_muxPlaybackId', v."muxPlaybackId",
                                    'video_duration', v.duration,
                                    'video_status', v.status,
                                    'is_favorite', EXISTS (
                                        SELECT 1 FROM "PromptResponseFavorite" prf
                                        WHERE prf."promptResponseId" = pr_resp.id
                                          AND prf."profileId" = p_listener_profile_id
                                    ),
                                    'attachments', COALESCE(
                                        (
                                            SELECT jsonb_agg(
                                                 jsonb_build_object(
                                                     'id', pra.id,
                                                     'fileUrl', pra."fileUrl",
                                                     'fileType', pra."fileType",
                                                     'fileName', pra."fileName",
                                                     'title', pra.title,
                                                     'description', pra.description,
                                                     'dateCaptured', pra."dateCaptured"::text,
                                                     'yearCaptured', pra."yearCaptured",
                                                     'profileSharerId', pra."profileSharerId", -- This is ProfileSharer.id
                                                     'PersonTags', COALESCE(
                                                         (
                                                             SELECT jsonb_agg(
                                                                 jsonb_build_object(
                                                                     'id', pt.id,
                                                                     'name', pt.name,
                                                                     'relation', pt.relation::text
                                                                 )
                                                             )
                                                             FROM "PromptResponseAttachmentPersonTag" prapt
                                                             JOIN "PersonTag" pt ON prapt."personTagId" = pt.id
                                                             WHERE prapt."promptResponseAttachmentId" = pra.id
                                                         ),
                                                         '[]'::jsonb
                                                     )
                                                 ) ORDER BY pra."uploadedAt" ASC
                                            )
                                            FROM "PromptResponseAttachment" pra
                                            WHERE pra."promptResponseId" = pr_resp.id
                                        ), '[]'::jsonb
                                    )
                                )
                                FROM "PromptResponse" pr_resp
                                LEFT JOIN "Video" v ON pr_resp."videoId" = v.id
                                WHERE pr_resp."promptId" = p.id
                                  AND pr_resp."profileSharerId" = v_ps_id -- Use cached ProfileSharer.id
                                LIMIT 1
                            )
                        ) ORDER BY p."isContextEstablishing" DESC, p."createdAt" ASC, p.id ASC
                    )
                    FROM "Prompt" p
                    WHERE p."promptCategoryId" = pc.id
                ), '[]'::jsonb
            )
        )
    INTO result
    FROM "PromptCategory" pc
    WHERE pc.id = p_prompt_category_id;

    RETURN COALESCE(result, 'null'::jsonb);

EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '[get_listener_topic_prompts_and_responses] Error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
        RETURN jsonb_build_object('error', 'Failed to fetch topic details: ' || SQLERRM);
END;
$function$; 