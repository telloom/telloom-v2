-- supabase/mcp_functions/get_listener_pending_invitations.sql
DROP FUNCTION IF EXISTS public.get_listener_pending_invitations(text);

CREATE OR REPLACE FUNCTION public.get_listener_pending_invitations(p_listener_email text)
RETURNS TABLE (
    "invitationId" uuid,
    "invitationToken" text,
    "inviterProfileId" uuid,
    "inviterProfileSharerId" uuid,
    "inviterFirstName" text,
    "inviterLastName" text,
    "inviterAvatarUrl" text,
    "invitationStatus" public."InvitationStatus",
    "createdAt" timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        i.id AS "invitationId",
        i.token AS "invitationToken",
        inviter_profile.id AS "inviterProfileId",
        i."sharerId" AS "inviterProfileSharerId",
        inviter_profile."firstName" AS "inviterFirstName",
        inviter_profile."lastName" AS "inviterLastName",
        inviter_profile."avatarUrl" AS "inviterAvatarUrl",
        i.status AS "invitationStatus",
        i."createdAt" as "createdAt"
    FROM
        "Invitation" i
    JOIN
        "ProfileSharer" inviter_ps ON i."sharerId" = inviter_ps.id
    JOIN
        "Profile" inviter_profile ON inviter_ps."profileId" = inviter_profile.id
    WHERE
        i."inviteeEmail" = p_listener_email
        AND i.role = 'LISTENER'
        AND i.status = 'PENDING'
    ORDER BY
        i."createdAt" DESC;
END;
$$; 