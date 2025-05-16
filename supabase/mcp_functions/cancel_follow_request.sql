-- supabase/mcp_functions/cancel_follow_request.sql
CREATE OR REPLACE FUNCTION public.cancel_follow_request(p_request_id uuid, p_requestor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target_request "FollowRequest"%ROWTYPE;
    deleted_count integer;
BEGIN
    -- Check if the request exists and belongs to the requestor and is pending
    SELECT * INTO target_request
    FROM "FollowRequest"
    WHERE id = p_request_id AND "requestorId" = p_requestor_id AND status = 'PENDING';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Follow request not found, not pending, or not owned by the user.');
    END IF;

    -- Delete the follow request
    WITH deleted_rows AS (
        DELETE FROM "FollowRequest"
        WHERE id = p_request_id
        RETURNING *
    )
    SELECT count(*) INTO deleted_count FROM deleted_rows;

    IF deleted_count = 0 THEN
        -- This case should ideally not be reached if the initial check passes,
        -- but it's a safeguard.
        RETURN jsonb_build_object('success', false, 'error', 'Failed to delete follow request.');
    END IF;

    -- Successfully deleted
    RETURN jsonb_build_object('success', true, 'message', 'Follow request cancelled successfully.');

EXCEPTION
    WHEN others THEN
        RAISE WARNING 'Error in cancel_follow_request: % - %', SQLSTATE, SQLERRM;
        RETURN jsonb_build_object('success', false, 'error', 'An unexpected error occurred: ' || SQLERRM);
END;
$$; 