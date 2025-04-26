-- supabase/migrations/new_get_executor_topic_list_rpc.sql

-- Function to get prompt categories for an executor viewing a specific sharer,
-- including favorite/queue status and prompt completion count for that sharer.

CREATE OR REPLACE FUNCTION public.get_executor_topic_list(
    p_executor_id uuid,
    p_sharer_id uuid
)
RETURNS TABLE (
    id uuid,
    category text,
    description text,
    theme text,
    prompts jsonb, -- Keep prompts separate for now, can join later if needed
    completed_prompt_count bigint,
    total_prompt_count bigint,
    is_favorite boolean,
    is_in_queue boolean
)
LANGUAGE sql
STABLE -- Indicates the function doesn't modify the database
SECURITY DEFINER -- Allows using service_role for checks if needed, but prefer checking within SQL
AS $$
WITH CategoryPrompts AS (
    -- Select all prompts for each category
    SELECT
        pc.id AS category_id,
        jsonb_agg(
            jsonb_build_object(
                'id', p.id,
                'promptText', p."promptText",
                'promptType', p."promptType",
                'isContextEstablishing', p."isContextEstablishing",
                'promptCategoryId', p."promptCategoryId"
                -- Add other prompt fields if needed by TopicCard later
            ) ORDER BY p.id -- Ensure consistent order if needed
        ) AS prompts_json,
        COUNT(p.id) AS total_prompts
    FROM public."PromptCategory" pc
    LEFT JOIN public."Prompt" p ON pc.id = p."promptCategoryId"
    GROUP BY pc.id
),
SharerResponses AS (
    -- Count prompts within each category that have at least one response from the specific sharer
    SELECT
        p."promptCategoryId",
        COUNT(DISTINCT p.id) AS completed_count
    FROM public."Prompt" p
    JOIN public."PromptResponse" pr ON p.id = pr."promptId"
    WHERE pr."profileSharerId" = p_sharer_id
    GROUP BY p."promptCategoryId"
),
ExecutorFavorites AS (
    -- Check if the executor favorited the topic for this sharer
    SELECT
        "promptCategoryId",
        TRUE AS is_fav
    FROM public."TopicFavorite"
    WHERE "profileId" = p_executor_id
      AND "role" = 'EXECUTOR'
      AND "sharerId" = p_sharer_id
),
ExecutorQueue AS (
    -- Check if the executor added the topic to the queue for this sharer
    SELECT
        "promptCategoryId",
        TRUE AS is_queued
    FROM public."TopicQueueItem"
    WHERE "profileId" = p_executor_id
      AND "role" = 'EXECUTOR'
      AND "sharerId" = p_sharer_id
)
-- Final selection combining all data
SELECT
    pc.id,
    pc.category,
    pc.description,
    pc.theme,
    COALESCE(cp.prompts_json, '[]'::jsonb) AS prompts,
    COALESCE(sr.completed_count, 0) AS completed_prompt_count,
    COALESCE(cp.total_prompts, 0) AS total_prompt_count,
    COALESCE(ef.is_fav, FALSE) AS is_favorite,
    COALESCE(eq.is_queued, FALSE) AS is_in_queue
FROM public."PromptCategory" pc
LEFT JOIN CategoryPrompts cp ON pc.id = cp.category_id
LEFT JOIN SharerResponses sr ON pc.id = sr."promptCategoryId"
LEFT JOIN ExecutorFavorites ef ON pc.id = ef."promptCategoryId"
LEFT JOIN ExecutorQueue eq ON pc.id = eq."promptCategoryId"
ORDER BY pc.category;

$$;

-- Grant execute permission to the authenticated role
GRANT EXECUTE ON FUNCTION public.get_executor_topic_list(uuid, uuid) TO authenticated;

-- Optional: Grant execute permission to service_role as well if needed elsewhere
-- GRANT EXECUTE ON FUNCTION public.get_executor_topc_list(uuid, uuid) TO service_role; 