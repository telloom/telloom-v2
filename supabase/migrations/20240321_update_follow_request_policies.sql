-- Drop all existing policies
DROP POLICY IF EXISTS "view_follow_requests" ON "FollowRequest";
DROP POLICY IF EXISTS "create_follow_requests" ON "FollowRequest";
DROP POLICY IF EXISTS "update_follow_requests" ON "FollowRequest";

-- Enable RLS
ALTER TABLE "FollowRequest" ENABLE ROW LEVEL SECURITY;

-- Create simplified policies that avoid recursion

-- Policy for viewing follow requests
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
    WHERE id = "FollowRequest"."sharerId"
    AND "profileId" = auth.uid()
  )
);

-- Policy for creating follow requests
CREATE POLICY "create_follow_requests"
ON "FollowRequest"
FOR INSERT
TO authenticated
WITH CHECK (
  -- User can only create requests for themselves
  auth.uid() = "requestorId" AND
  -- Verify the sharer exists
  EXISTS (
    SELECT 1 FROM "ProfileSharer"
    WHERE id = "sharerId"
  )
);

-- Policy for updating follow requests
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