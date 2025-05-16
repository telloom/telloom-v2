-- supabase/mcp_functions/get_listener_following_sharers.sql
DROP FUNCTION IF EXISTS public.get_listener_following_sharers(uuid);

CREATE OR REPLACE FUNCTION public.get_listener_following_sharers(p_listener_id uuid)
RETURNS TABLE (
    "profileListenerId" uuid, 
    "sharerId" uuid, 
    "sharerProfileId" uuid, 
    "sharerFirstName" text,
    "sharerLastName" text,
    "sharerEmail" text, 
    "sharerAvatarUrl" text,
    "sharedSince" timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        pl.id AS "profileListenerId",
        ps.id AS "sharerId",
        p.id AS "sharerProfileId",
        p."firstName" AS "sharerFirstName",
        p."lastName" AS "sharerLastName",
        p.email AS "sharerEmail", 
        p."avatarUrl" AS "sharerAvatarUrl",
        pl."sharedSince"
    FROM
        "ProfileListener" pl
    JOIN
        "ProfileSharer" ps ON pl."sharerId" = ps.id
    JOIN
        "Profile" p ON ps."profileId" = p.id
    WHERE
        pl."listenerId" = p_listener_id AND pl."hasAccess" = TRUE
    ORDER BY
        p."lastName", p."firstName";
END;
$$; 