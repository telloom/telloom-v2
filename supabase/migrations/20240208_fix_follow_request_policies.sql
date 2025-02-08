-- Drop existing policies
DROP POLICY IF EXISTS "Users can view follow requests" ON "FollowRequest";
DROP POLICY IF EXISTS "Users can create follow requests" ON "FollowRequest";
DROP POLICY IF EXISTS "Users can manage follow requests" ON "FollowRequest";

-- Enable RLS
ALTER TABLE "FollowRequest" ENABLE ROW LEVEL SECURITY;

-- Simple policy for viewing follow requests
CREATE POLICY "view_follow_requests"
ON "FollowRequest"
FOR SELECT
TO authenticated
USING (
  -- Requestor can view their own requests
  auth.uid() = "requestorId" OR
  -- Sharer can view requests directed to them
  EXISTS (
    SELECT 1
    FROM "ProfileSharer"
    WHERE id = "sharerId"
    AND "profileId" = auth.uid()
  )
);

-- Simple policy for creating follow requests
CREATE POLICY "create_follow_requests"
ON "FollowRequest"
FOR INSERT
TO authenticated
WITH CHECK (
  -- User can only create requests for themselves
  auth.uid() = "requestorId"
);

-- Simple policy for updating follow requests
CREATE POLICY "update_follow_requests"
ON "FollowRequest"
FOR UPDATE
TO authenticated
USING (
  -- Only the sharer can update requests
  EXISTS (
    SELECT 1
    FROM "ProfileSharer"
    WHERE id = "sharerId"
    AND "profileId" = auth.uid()
  )
);

-- Grant necessary permissions
GRANT ALL ON "FollowRequest" TO authenticated; 