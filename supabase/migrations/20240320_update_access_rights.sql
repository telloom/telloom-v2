-- Create policies for Video access
DROP POLICY IF EXISTS "Users can view videos" ON "Video";
DROP POLICY IF EXISTS "Users can manage videos" ON "Video";

CREATE POLICY "Users can view videos"
ON "Video"
FOR SELECT
USING (
  -- Video owner (Sharer)
  auth.uid() IN (
    SELECT "profileId"
    FROM "ProfileSharer"
    WHERE id = "Video"."profileSharerId"
  ) OR
  -- Executor for the Sharer
  EXISTS (
    SELECT 1 
    FROM "ProfileExecutor"
    WHERE "executorId" = auth.uid()
    AND "sharerId" = "Video"."profileSharerId"
  ) OR
  -- Active Listener for the Sharer
  EXISTS (
    SELECT 1 
    FROM "ProfileListener"
    WHERE "listenerId" = auth.uid()
    AND "sharerId" = "Video"."profileSharerId"
    AND "hasAccess" = true
  )
);

CREATE POLICY "Users can manage videos"
ON "Video"
FOR ALL
USING (
  -- Video owner (Sharer)
  auth.uid() IN (
    SELECT "profileId"
    FROM "ProfileSharer"
    WHERE id = "Video"."profileSharerId"
  ) OR
  -- Executor for the Sharer
  EXISTS (
    SELECT 1 
    FROM "ProfileExecutor"
    WHERE "executorId" = auth.uid()
    AND "sharerId" = "Video"."profileSharerId"
  )
)
WITH CHECK (
  -- Video owner (Sharer)
  auth.uid() IN (
    SELECT "profileId"
    FROM "ProfileSharer"
    WHERE id = "Video"."profileSharerId"
  ) OR
  -- Executor for the Sharer
  EXISTS (
    SELECT 1 
    FROM "ProfileExecutor"
    WHERE "executorId" = auth.uid()
    AND "sharerId" = "Video"."profileSharerId"
  )
);

-- Create policies for PromptResponse access
DROP POLICY IF EXISTS "Users can view prompt responses" ON "PromptResponse";
DROP POLICY IF EXISTS "Users can manage prompt responses" ON "PromptResponse";

CREATE POLICY "Users can view prompt responses"
ON "PromptResponse"
FOR SELECT
USING (
  -- Response owner (Sharer)
  auth.uid() IN (
    SELECT "profileId"
    FROM "ProfileSharer"
    WHERE id = "PromptResponse"."profileSharerId"
  ) OR
  -- Executor for the Sharer
  EXISTS (
    SELECT 1 
    FROM "ProfileExecutor"
    WHERE "executorId" = auth.uid()
    AND "sharerId" = "PromptResponse"."profileSharerId"
  ) OR
  -- Active Listener for the Sharer
  EXISTS (
    SELECT 1 
    FROM "ProfileListener"
    WHERE "listenerId" = auth.uid()
    AND "sharerId" = "PromptResponse"."profileSharerId"
    AND "hasAccess" = true
  )
);

CREATE POLICY "Users can manage prompt responses"
ON "PromptResponse"
FOR ALL
USING (
  -- Response owner (Sharer)
  auth.uid() IN (
    SELECT "profileId"
    FROM "ProfileSharer"
    WHERE id = "PromptResponse"."profileSharerId"
  ) OR
  -- Executor for the Sharer
  EXISTS (
    SELECT 1 
    FROM "ProfileExecutor"
    WHERE "executorId" = auth.uid()
    AND "sharerId" = "PromptResponse"."profileSharerId"
  )
)
WITH CHECK (
  -- Response owner (Sharer)
  auth.uid() IN (
    SELECT "profileId"
    FROM "ProfileSharer"
    WHERE id = "PromptResponse"."profileSharerId"
  ) OR
  -- Executor for the Sharer
  EXISTS (
    SELECT 1 
    FROM "ProfileExecutor"
    WHERE "executorId" = auth.uid()
    AND "sharerId" = "PromptResponse"."profileSharerId"
  )
);

-- Create function to handle follow requests
CREATE OR REPLACE FUNCTION public.handle_follow_request(sharer_id uuid)
RETURNS uuid AS $$
DECLARE
  v_request_id uuid;
BEGIN
  -- Create follow request
  INSERT INTO "FollowRequest" (
    "sharerId",
    "requestorId",
    "status",
    "createdAt"
  )
  VALUES (
    sharer_id,
    auth.uid(),
    'PENDING',
    now()
  )
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle follow request response
CREATE OR REPLACE FUNCTION public.handle_follow_request_response(request_id uuid, should_approve boolean)
RETURNS void AS $$
DECLARE
  v_request "FollowRequest"%ROWTYPE;
BEGIN
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
    -- Create listener relationship
    INSERT INTO "ProfileListener" (
      "sharerId",
      "listenerId",
      "sharedSince",
      "hasAccess",
      "createdAt"
    )
    VALUES (
      v_request."sharerId",
      v_request."requestorId",
      now(),
      true,
      now()
    );

    -- Add listener role if not exists
    INSERT INTO "ProfileRole" ("profileId", "role", "createdAt")
    VALUES (v_request."requestorId", 'LISTENER', now())
    ON CONFLICT ("profileId", "role") DO NOTHING;

    -- Update request status
    UPDATE "FollowRequest"
    SET status = 'APPROVED',
        "approvedAt" = now(),
        "updatedAt" = now()
    WHERE id = request_id;
  ELSE
    -- Update request status
    UPDATE "FollowRequest"
    SET status = 'DENIED',
        "deniedAt" = now(),
        "updatedAt" = now()
    WHERE id = request_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create policies for FollowRequest
DROP POLICY IF EXISTS "Users can view follow requests" ON "FollowRequest";
DROP POLICY IF EXISTS "Users can create follow requests" ON "FollowRequest";
DROP POLICY IF EXISTS "Users can manage follow requests" ON "FollowRequest";

CREATE POLICY "Users can view follow requests"
ON "FollowRequest"
FOR SELECT
USING (
  -- Requestor can view their own requests
  auth.uid() = "requestorId" OR
  -- Sharer can view requests directed to them
  auth.uid() IN (
    SELECT "profileId"
    FROM "ProfileSharer"
    WHERE id = "sharerId"
  )
);

CREATE POLICY "Users can create follow requests"
ON "FollowRequest"
FOR INSERT
WITH CHECK (
  -- User can only create requests for themselves
  auth.uid() = "requestorId" AND
  -- Cannot create duplicate pending requests
  NOT EXISTS (
    SELECT 1 FROM "FollowRequest" fr
    WHERE fr."requestorId" = auth.uid()
    AND fr."sharerId" = "FollowRequest"."sharerId"
    AND fr.status = 'PENDING'
  ) AND
  -- Cannot create request if already a listener
  NOT EXISTS (
    SELECT 1 FROM "ProfileListener" pl
    WHERE pl."listenerId" = auth.uid()
    AND pl."sharerId" = "FollowRequest"."sharerId"
    AND pl."hasAccess" = true
  )
);

CREATE POLICY "Users can manage follow requests"
ON "FollowRequest"
FOR UPDATE
USING (
  -- Sharer can manage requests directed to them
  auth.uid() IN (
    SELECT "profileId"
    FROM "ProfileSharer"
    WHERE id = "sharerId"
  )
)
WITH CHECK (
  -- Sharer can manage requests directed to them
  auth.uid() IN (
    SELECT "profileId"
    FROM "ProfileSharer"
    WHERE id = "sharerId"
  )
); 