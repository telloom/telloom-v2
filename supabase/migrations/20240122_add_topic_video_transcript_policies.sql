-- Enable RLS
ALTER TABLE "TopicVideoTranscript" ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Allow service role full access on TopicVideoTranscript" ON "TopicVideoTranscript";
DROP POLICY IF EXISTS "Allow users to view their own topic video transcripts" ON "TopicVideoTranscript";
DROP POLICY IF EXISTS "Allow users to manage their own topic video transcripts" ON "TopicVideoTranscript";
DROP POLICY IF EXISTS "Allow admins full access on TopicVideoTranscript" ON "TopicVideoTranscript";

-- Create policies
CREATE POLICY "Allow service role full access on TopicVideoTranscript"
ON "TopicVideoTranscript"
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Users can view transcripts for their own topic videos
CREATE POLICY "Allow users to view their own topic video transcripts"
ON "TopicVideoTranscript"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "TopicVideo"
    WHERE "TopicVideo"."id" = "TopicVideoTranscript"."topicVideoId"
    AND "TopicVideo"."profileSharerId" = auth.uid()
  )
);

-- Users can manage transcripts for their own topic videos
CREATE POLICY "Allow users to manage their own topic video transcripts"
ON "TopicVideoTranscript"
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "TopicVideo"
    WHERE "TopicVideo"."id" = "TopicVideoTranscript"."topicVideoId"
    AND "TopicVideo"."profileSharerId" = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "TopicVideo"
    WHERE "TopicVideo"."id" = "TopicVideoTranscript"."topicVideoId"
    AND "TopicVideo"."profileSharerId" = auth.uid()
  )
);

-- Allow admins full access
CREATE POLICY "Allow admins full access on TopicVideoTranscript"
ON "TopicVideoTranscript"
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Grant permissions
GRANT ALL ON "TopicVideoTranscript" TO authenticated;
GRANT ALL ON "TopicVideoTranscript" TO service_role; 