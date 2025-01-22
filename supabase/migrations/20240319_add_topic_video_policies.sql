-- Create admin check function if it doesn't exist
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM "ProfileRole"
        WHERE "profileId" = auth.uid()
        AND role = 'ADMIN'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- First ensure RLS is enabled
ALTER TABLE "TopicVideo" ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view own topic videos" ON "TopicVideo";
DROP POLICY IF EXISTS "Users can manage own topic videos" ON "TopicVideo";
DROP POLICY IF EXISTS "Service role can manage all topic videos" ON "TopicVideo";
DROP POLICY IF EXISTS "Admins can do anything on TopicVideo" ON "TopicVideo";

-- Create policies for TopicVideo
CREATE POLICY "Users can view own topic videos"
ON "TopicVideo"
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "ProfileSharer" ps
        WHERE ps.id = "TopicVideo"."profileSharerId"
        AND ps."profileId" = auth.uid()
    )
);

CREATE POLICY "Users can manage own topic videos"
ON "TopicVideo"
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "ProfileSharer" ps
        WHERE ps.id = "TopicVideo"."profileSharerId"
        AND ps."profileId" = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM "ProfileSharer" ps
        WHERE ps.id = "TopicVideo"."profileSharerId"
        AND ps."profileId" = auth.uid()
    )
);

-- Allow service role to manage all topic videos (for webhooks)
CREATE POLICY "Service role can manage all topic videos"
ON "TopicVideo"
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Admin policy
CREATE POLICY "Admins can do anything on TopicVideo"
ON "TopicVideo"
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Grant necessary permissions
GRANT ALL ON "TopicVideo" TO authenticated;
GRANT ALL ON "TopicVideo" TO service_role; 