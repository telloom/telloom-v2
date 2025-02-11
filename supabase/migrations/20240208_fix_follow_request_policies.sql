-- Drop existing policies
DROP POLICY IF EXISTS "view_follow_requests" ON "FollowRequest";
DROP POLICY IF EXISTS "create_follow_requests" ON "FollowRequest";
DROP POLICY IF EXISTS "update_follow_requests" ON "FollowRequest";

-- Enable RLS
ALTER TABLE "FollowRequest" ENABLE ROW LEVEL SECURITY;

-- Policy for viewing follow requests with Profile access
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

-- Add policy for Profile table to allow viewing requestor profiles
CREATE POLICY "view_requestor_profiles"
ON "Profile"
FOR SELECT
TO authenticated
USING (
  -- Users can view their own profile
  auth.uid() = id OR
  -- Users can view profiles of people who have sent them follow requests
  EXISTS (
    SELECT 1 
    FROM "FollowRequest" fr
    JOIN "ProfileSharer" ps ON fr."sharerId" = ps.id
    WHERE fr."requestorId" = "Profile".id
    AND ps."profileId" = auth.uid()
  ) OR
  -- Users can view profiles of sharers they've sent requests to
  EXISTS (
    SELECT 1
    FROM "FollowRequest" fr
    WHERE fr."requestorId" = auth.uid()
    AND "Profile".id IN (
      SELECT "profileId"
      FROM "ProfileSharer"
      WHERE id = fr."sharerId"
    )
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
GRANT ALL ON "Profile" TO authenticated; 