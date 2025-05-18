-- supabase/mcp_functions/handle_follow_request_response.sql
CREATE OR REPLACE FUNCTION public.handle_follow_request_response(request_id uuid, should_approve boolean)
RETURNS void AS $$
DECLARE
  v_request "FollowRequest"%ROWTYPE;
  v_now timestamptz;
  v_listener_id uuid;
  v_sharer_profile_id uuid; -- To store the Sharer's main profile ID (auth.users ID)
BEGIN
  v_now := now();

  SELECT * INTO v_request
  FROM "FollowRequest"
  WHERE id = request_id
  AND status = 'PENDING'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or already processed follow request. Request ID: %, Status: %', request_id, (SELECT status FROM "FollowRequest" WHERE id = request_id);
  END IF;

  -- Get the Sharer's main profileId (auth.uid equivalent for the sharer)
  SELECT "profileId" INTO v_sharer_profile_id
  FROM "ProfileSharer"
  WHERE id = v_request."sharerId";

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sharer profile not found for follow request. SharerRecordID: %', v_request."sharerId";
  END IF;

  -- Verify the current user (auth.uid()) is the Sharer OR an active Executor for the Sharer
  IF NOT (
    -- Case 1: The current user IS the Sharer associated with the follow request
    (auth.uid() = v_sharer_profile_id) OR
    -- Case 2: The current user is an Executor for the Sharer (existence implies active)
    EXISTS (
      SELECT 1
      FROM "ProfileExecutor" pe
      WHERE pe."sharerId" = v_request."sharerId" -- This links to ProfileSharer.id
      AND pe."executorId" = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Not authorized to handle this follow request. User must be the Sharer or an Executor for the Sharer. Acting User: %, Target Sharer Profile ID: %', auth.uid(), v_sharer_profile_id;
  END IF;

  IF should_approve THEN
    v_listener_id := gen_random_uuid();

    INSERT INTO "ProfileListener" (
      "id",
      "sharerId",
      "listenerId",
      "sharedSince",
      "hasAccess",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      v_listener_id,
      v_request."sharerId",
      v_request."requestorId",
      v_now,
      true,
      v_now,
      v_now
    );

    INSERT INTO "ProfileRole" ("id", "profileId", "role", "createdAt", "updatedAt")
    VALUES (
      gen_random_uuid(),
      v_request."requestorId",
      'LISTENER',
      v_now,
      v_now
    )
    ON CONFLICT ("profileId", "role") DO NOTHING;

    UPDATE "FollowRequest"
    SET status = 'APPROVED',
        "approvedAt" = v_now,
        "updatedAt" = v_now
    WHERE id = request_id;
  ELSE
    UPDATE "FollowRequest"
    SET status = 'DENIED',
        "deniedAt" = v_now,
        "updatedAt" = v_now
    WHERE id = request_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 