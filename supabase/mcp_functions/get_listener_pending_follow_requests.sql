-- supabase/mcp_functions/get_listener_pending_follow_requests.sql
DROP FUNCTION IF EXISTS public.get_listener_pending_follow_requests(uuid);

CREATE OR REPLACE FUNCTION public.get_listener_pending_follow_requests(p_listener_id uuid)
RETURNS TABLE (
    "requestId" uuid,
    "sharerProfileId" uuid, 
    "sharerId" uuid, 
    "sharerFirstName" text,
    "sharerLastName" text,
    "sharerEmail" text, 
    "sharerAvatarUrl" text,
    "requestStatus" public.follow_request_status,
    "requestCreatedAt" timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        fr.id AS "requestId",
        p.id AS "sharerProfileId",
        ps.id AS "sharerId",
        p."firstName" AS "sharerFirstName",
        p."lastName" AS "sharerLastName",
        p.email AS "sharerEmail",
        p."avatarUrl" AS "sharerAvatarUrl",
        fr.status AS "requestStatus",
        fr."createdAt" as "requestCreatedAt"
    FROM
        "FollowRequest" fr
    JOIN
        "ProfileSharer" ps ON fr."sharerId" = ps.id
    JOIN
        "Profile" p ON ps."profileId" = p.id
    WHERE
        fr."requestorId" = p_listener_id AND fr.status = 'PENDING'
    ORDER BY
        fr."createdAt" DESC;
END;
$$; 