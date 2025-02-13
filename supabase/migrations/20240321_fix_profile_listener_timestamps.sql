-- Drop existing function
DROP FUNCTION IF EXISTS public.handle_follow_request_response;

-- Recreate function with proper timestamp handling
CREATE OR REPLACE FUNCTION public.handle_follow_request_response(request_id uuid, should_approve boolean)
RETURNS void AS $$
DECLARE
  v_request "FollowRequest"%ROWTYPE;
  v_now timestamptz;
  v_listener_id uuid;
BEGIN
  -- Get current timestamp
  v_now := now();

  -- Get request details
  SELECT * INTO v_request
  FROM "FollowRequest"
  WHERE id = request_id
  AND status = 'PENDING'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or already processed follow request';
  END IF;

  -- Verify the current user is the sharer
  IF NOT EXISTS (
    SELECT 1 FROM "ProfileSharer" ps
    WHERE ps.id = v_request."sharerId"
    AND ps."profileId" = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to handle this follow request';
  END IF;

  IF should_approve THEN
    -- Generate UUID for ProfileListener
    v_listener_id := gen_random_uuid();

    -- Create listener relationship
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

    -- Add listener role if not exists
    INSERT INTO "ProfileRole" ("id", "profileId", "role", "createdAt", "updatedAt")
    VALUES (
      gen_random_uuid(),
      v_request."requestorId",
      'LISTENER',
      v_now,
      v_now
    )
    ON CONFLICT ("profileId", "role") DO NOTHING;

    -- Update request status
    UPDATE "FollowRequest"
    SET status = 'APPROVED',
        "approvedAt" = v_now,
        "updatedAt" = v_now
    WHERE id = request_id;
  ELSE
    -- Update request status
    UPDATE "FollowRequest"
    SET status = 'DENIED',
        "deniedAt" = v_now,
        "updatedAt" = v_now
    WHERE id = request_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 