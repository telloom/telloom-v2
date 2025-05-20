-- supabase/mcp_functions/get_listener_topic_list.sql
-- RPC function to fetch topic list for a listener, including listener-specific descriptions.

DROP FUNCTION IF EXISTS public.get_listener_topic_list(uuid, uuid);
CREATE OR REPLACE FUNCTION public.get_listener_topic_list(p_listener_id uuid, p_sharer_id uuid)
 RETURNS TABLE(id uuid, category text, description text, "descriptionListener" text, theme text, completed_prompt_count bigint, total_prompt_count bigint, is_favorite boolean, is_in_queue boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_has_access boolean;
BEGIN
    -- 1. Authorization Check
    SELECT EXISTS (
        SELECT 1
        FROM "ProfileListener" pl
        WHERE pl."listenerId" = p_listener_id
          AND pl."sharerId" = p_sharer_id
          AND pl."hasAccess" = true
    ) INTO v_has_access;

    IF NOT v_has_access THEN
        RAISE EXCEPTION 'Access Denied: Listener % does not have access to sharer %', p_listener_id, p_sharer_id;
    END IF;

    -- 2. Fetch Topics
    RETURN QUERY
    WITH TopicCounts AS (
        SELECT
            p."promptCategoryId",
            COUNT(DISTINCT pr.id) FILTER (WHERE pr."profileSharerId" = p_sharer_id) AS completed_count,
            COUNT(DISTINCT p.id) AS total_count
        FROM
            "Prompt" p
        LEFT JOIN
            "PromptResponse" pr ON p.id = pr."promptId" AND pr."profileSharerId" = p_sharer_id
        GROUP BY
            p."promptCategoryId"
    )
    SELECT
        pc.id,
        pc.category::text,
        pc.description::text,
        pc."descriptionListener"::text, -- Corrected casing with quotes
        pc.theme::text,
        COALESCE(tc.completed_count, 0)::bigint AS completed_prompt_count,
        COALESCE(tc.total_count, 0)::bigint AS total_prompt_count,
        EXISTS (
            SELECT 1
            FROM "TopicFavorite" tf
            WHERE tf."promptCategoryId" = pc.id
              AND tf."profileId" = p_listener_id
              AND tf.role = 'LISTENER'
        ) AS is_favorite,
        EXISTS (
            SELECT 1
            FROM "TopicQueueItem" tq
            WHERE tq."promptCategoryId" = pc.id
              AND tq."profileId" = p_listener_id
              AND tq.role = 'LISTENER'
        ) AS is_in_queue
    FROM
        "PromptCategory" pc
    LEFT JOIN
        TopicCounts tc ON pc.id = tc."promptCategoryId"
    WHERE EXISTS ( -- Only include topics where the sharer has AT LEAST ONE response
      SELECT 1
      FROM "Prompt" p
      JOIN "PromptResponse" pr ON p.id = pr."promptId"
      WHERE p."promptCategoryId" = pc.id AND pr."profileSharerId" = p_sharer_id
    )
    ORDER BY
        pc.category;

END;
$function$; 