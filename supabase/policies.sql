-- First disable RLS
ALTER TABLE "Profile" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ProfileRole" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Prompt" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "PromptCategory" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "PromptResponse" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Video" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ProfileSharer" DISABLE ROW LEVEL SECURITY;

-- Create new tables for user-specific favorites and queue items if they don't exist
CREATE TABLE IF NOT EXISTS "TopicFavorite" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "profileId" uuid NOT NULL,
    "promptCategoryId" uuid NOT NULL,
    "createdAt" timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "TopicFavorite_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TopicFavorite_profileId_fkey" FOREIGN KEY ("profileId")
        REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TopicFavorite_promptCategoryId_fkey" FOREIGN KEY ("promptCategoryId")
        REFERENCES "PromptCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TopicFavorite_profileId_promptCategoryId_key" UNIQUE ("profileId", "promptCategoryId")
);

CREATE TABLE IF NOT EXISTS "TopicQueueItem" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "profileId" uuid NOT NULL,
    "promptCategoryId" uuid NOT NULL,
    "createdAt" timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "TopicQueueItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TopicQueueItem_profileId_fkey" FOREIGN KEY ("profileId")
        REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TopicQueueItem_promptCategoryId_fkey" FOREIGN KEY ("promptCategoryId")
        REFERENCES "PromptCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TopicQueueItem_profileId_promptCategoryId_key" UNIQUE ("profileId", "promptCategoryId")
);

-- Drop existing policies
DROP POLICY IF EXISTS "profile_select" ON "Profile";
DROP POLICY IF EXISTS "profile_insert" ON "Profile";
DROP POLICY IF EXISTS "profile_update" ON "Profile";
DROP POLICY IF EXISTS "profile_role_select" ON "ProfileRole";
DROP POLICY IF EXISTS "profile_role_insert" ON "ProfileRole";
DROP POLICY IF EXISTS "profile_role_update" ON "ProfileRole";
DROP POLICY IF EXISTS "profile_sharer_select" ON "ProfileSharer";
DROP POLICY IF EXISTS "profile_sharer_insert" ON "ProfileSharer";
DROP POLICY IF EXISTS "profile_sharer_update" ON "ProfileSharer";
DROP POLICY IF EXISTS "prompt_select" ON "Prompt";
DROP POLICY IF EXISTS "prompt_category_select" ON "PromptCategory";
DROP POLICY IF EXISTS "prompt_response_crud_sharer" ON "PromptResponse";
DROP POLICY IF EXISTS "prompt_response_select" ON "PromptResponse";
DROP POLICY IF EXISTS "video_crud_sharer" ON "Video";
DROP POLICY IF EXISTS "video_select" ON "Video";
DROP POLICY IF EXISTS "users_can_read_own_favorites" ON "TopicFavorite";
DROP POLICY IF EXISTS "users_can_manage_own_favorites" ON "TopicFavorite";
DROP POLICY IF EXISTS "users_can_read_own_queue_items" ON "TopicQueueItem";
DROP POLICY IF EXISTS "users_can_manage_own_queue_items" ON "TopicQueueItem";

-- Grant necessary permissions to authenticated users
GRANT ALL ON "Profile" TO authenticated;
GRANT ALL ON "ProfileRole" TO authenticated;
GRANT ALL ON "Prompt" TO authenticated;
GRANT ALL ON "PromptCategory" TO authenticated;
GRANT ALL ON "PromptResponse" TO authenticated;
GRANT ALL ON "Video" TO authenticated;
GRANT ALL ON "ProfileSharer" TO authenticated;
GRANT ALL ON "TopicFavorite" TO authenticated;
GRANT ALL ON "TopicQueueItem" TO authenticated;

-- Grant permissions to service role
GRANT ALL ON "Profile" TO service_role;
GRANT ALL ON "ProfileRole" TO service_role;
GRANT ALL ON "Prompt" TO service_role;
GRANT ALL ON "PromptCategory" TO service_role;
GRANT ALL ON "PromptResponse" TO service_role;
GRANT ALL ON "Video" TO service_role;
GRANT ALL ON "ProfileSharer" TO service_role;
GRANT ALL ON "TopicFavorite" TO service_role;
GRANT ALL ON "TopicQueueItem" TO service_role;

-- Enable RLS
ALTER TABLE "Profile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProfileRole" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Prompt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PromptCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PromptResponse" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Video" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProfileSharer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TopicFavorite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TopicQueueItem" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "authenticated_access" ON "Profile";
DROP POLICY IF EXISTS "authenticated_access" ON "ProfileRole";
DROP POLICY IF EXISTS "authenticated_access" ON "PromptCategory";
DROP POLICY IF EXISTS "authenticated_access" ON "Prompt";
DROP POLICY IF EXISTS "authenticated_access" ON "PromptResponse";
DROP POLICY IF EXISTS "authenticated_access" ON "Video";
DROP POLICY IF EXISTS "authenticated_access" ON "ProfileSharer";

-- Create proper policies for Profile
CREATE POLICY "Users can view own profile"
ON "Profile"
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON "Profile" 
FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON "Profile"
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Create proper policies for ProfileRole
CREATE POLICY "Users can view own roles"
ON "ProfileRole"
FOR SELECT
USING (auth.uid()::text = "profileId"::text);

CREATE POLICY "Users can insert own roles"
ON "ProfileRole"
FOR INSERT
WITH CHECK (auth.uid()::text = "profileId"::text);

CREATE POLICY "Users can update own roles"
ON "ProfileRole"
FOR UPDATE
USING (auth.uid()::text = "profileId"::text);

CREATE POLICY "Users can delete own roles"
ON "ProfileRole"
FOR DELETE
USING (auth.uid()::text = "profileId"::text);

-- Create policies for favorites
CREATE POLICY "users_can_read_own_favorites" ON "TopicFavorite"
    FOR SELECT TO authenticated
    USING (auth.uid()::text = "profileId"::text);

CREATE POLICY "users_can_insert_own_favorites" ON "TopicFavorite"
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid()::text = "profileId"::text);

CREATE POLICY "users_can_delete_own_favorites" ON "TopicFavorite"
    FOR DELETE TO authenticated
    USING (auth.uid()::text = "profileId"::text);

-- Create policies for queue items
CREATE POLICY "users_can_read_own_queue_items" ON "TopicQueueItem"
    FOR SELECT TO authenticated
    USING (auth.uid()::text = "profileId"::text);

CREATE POLICY "users_can_insert_own_queue_items" ON "TopicQueueItem"
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid()::text = "profileId"::text);

CREATE POLICY "users_can_delete_own_queue_items" ON "TopicQueueItem"
    FOR DELETE TO authenticated
    USING (auth.uid()::text = "profileId"::text);

-- Grant usage on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Verify the policies
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
    'Profile', 
    'ProfileRole', 
    'Prompt', 
    'PromptCategory', 
    'PromptResponse', 
    'Video', 
    'ProfileSharer',
    'TopicFavorite',
    'TopicQueueItem'
);

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant table permissions
GRANT ALL ON "Profile" TO authenticated;
GRANT ALL ON "ProfileRole" TO authenticated;
GRANT SELECT ON "PromptCategory" TO authenticated;
GRANT SELECT ON "Prompt" TO authenticated;
GRANT ALL ON "PromptResponse" TO authenticated;
GRANT ALL ON "Video" TO authenticated;
GRANT ALL ON "ProfileSharer" TO authenticated;
GRANT ALL ON "TopicFavorite" TO authenticated;
GRANT ALL ON "TopicQueueItem" TO authenticated;

-- Enable RLS
ALTER TABLE "Profile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProfileRole" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PromptCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Prompt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PromptResponse" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Video" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProfileSharer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TopicFavorite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TopicQueueItem" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "authenticated_access" ON "Profile";
DROP POLICY IF EXISTS "authenticated_access" ON "ProfileRole";
DROP POLICY IF EXISTS "authenticated_access" ON "PromptCategory";
DROP POLICY IF EXISTS "authenticated_access" ON "Prompt";
DROP POLICY IF EXISTS "authenticated_access" ON "PromptResponse";
DROP POLICY IF EXISTS "authenticated_access" ON "Video";
DROP POLICY IF EXISTS "authenticated_access" ON "ProfileSharer";

-- Create proper policies for Profile
CREATE POLICY "Users can view own profile"
ON "Profile"
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON "Profile" 
FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON "Profile"
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Create proper policies for ProfileRole
CREATE POLICY "Users can view own roles"
ON "ProfileRole"
FOR SELECT
USING (auth.uid()::text = "profileId"::text);

CREATE POLICY "Users can insert own roles"
ON "ProfileRole"
FOR INSERT
WITH CHECK (auth.uid()::text = "profileId"::text);

CREATE POLICY "Users can update own roles"
ON "ProfileRole"
FOR UPDATE
USING (auth.uid()::text = "profileId"::text);

CREATE POLICY "Users can delete own roles"
ON "ProfileRole"
FOR DELETE
USING (auth.uid()::text = "profileId"::text);

-- Create policies for PromptCategory
CREATE POLICY "Anyone can view prompt categories"
ON "PromptCategory"
FOR SELECT
TO authenticated
USING (true);

-- Create policies for Prompt
CREATE POLICY "Anyone can view prompts"
ON "Prompt"
FOR SELECT
TO authenticated
USING (true);

-- Drop existing policies for PromptResponse
DROP POLICY IF EXISTS "Users can view own prompt responses" ON "PromptResponse";
DROP POLICY IF EXISTS "Users can insert own prompt responses" ON "PromptResponse";
DROP POLICY IF EXISTS "Users can update own prompt responses" ON "PromptResponse";
DROP POLICY IF EXISTS "Users can delete own prompt responses" ON "PromptResponse";
DROP POLICY IF EXISTS "Service role can manage all prompt responses" ON "PromptResponse";

-- Create simplified policy for PromptResponse
CREATE POLICY "Users can manage own prompt responses"
ON "PromptResponse"
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM "ProfileSharer" ps
    WHERE ps.id = "PromptResponse"."profileSharerId"
    AND ps."profileId" = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "ProfileSharer" ps
    WHERE ps.id = "PromptResponse"."profileSharerId"
    AND ps."profileId" = auth.uid()
  )
);

-- Allow service role to manage all prompt responses
CREATE POLICY "Service role can manage all prompt responses"
ON "PromptResponse"
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Ensure proper grants
GRANT ALL ON "PromptResponse" TO authenticated;
GRANT ALL ON "PromptResponse" TO service_role;

-- Create policies for Video
CREATE POLICY "Users can manage own videos"
ON "Video"
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM "ProfileSharer" ps
    WHERE ps.id = "Video"."profileSharerId"
    AND ps."profileId" = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "ProfileSharer" ps
    WHERE ps.id = "Video"."profileSharerId"
    AND ps."profileId" = auth.uid()
  )
);

-- Allow service role to manage all videos (for webhooks)
CREATE POLICY "Service role can manage all videos"
ON "Video"
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create policies for ProfileSharer
CREATE POLICY "Users can manage own sharer profile"
ON "ProfileSharer"
FOR ALL
USING (auth.uid()::text = "profileId"::text);

-- Enable RLS
ALTER TABLE "public"."TopicFavorite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."TopicQueueItem" ENABLE ROW LEVEL SECURITY;

-- First drop all duplicate policies
DROP POLICY IF EXISTS "Users can view their own favorites" ON "TopicFavorite";
DROP POLICY IF EXISTS "Users can create their own favorites" ON "TopicFavorite";
DROP POLICY IF EXISTS "Users can delete their own favorites" ON "TopicFavorite";
DROP POLICY IF EXISTS "users_can_read_own_favorites" ON "TopicFavorite";
DROP POLICY IF EXISTS "users_can_insert_own_favorites" ON "TopicFavorite";
DROP POLICY IF EXISTS "users_can_delete_own_favorites" ON "TopicFavorite";

DROP POLICY IF EXISTS "Users can view their own queue items" ON "TopicQueueItem";
DROP POLICY IF EXISTS "Users can create their own queue items" ON "TopicQueueItem";
DROP POLICY IF EXISTS "Users can delete their own queue items" ON "TopicQueueItem";
DROP POLICY IF EXISTS "users_can_read_own_queue_items" ON "TopicQueueItem";
DROP POLICY IF EXISTS "users_can_insert_own_queue_items" ON "TopicQueueItem";
DROP POLICY IF EXISTS "users_can_delete_own_queue_items" ON "TopicQueueItem";

-- Then create fresh policies with unique names
-- TopicFavorite Policies
CREATE POLICY "enable_select_for_favorites"
ON "public"."TopicFavorite"
FOR SELECT
TO authenticated
USING (auth.uid() = "profileId");

CREATE POLICY "enable_insert_for_favorites"
ON "public"."TopicFavorite"
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = "profileId");

CREATE POLICY "enable_delete_for_favorites"
ON "public"."TopicFavorite"
FOR DELETE
TO authenticated
USING (auth.uid() = "profileId");

-- TopicQueueItem Policies
CREATE POLICY "enable_select_for_queue"
ON "public"."TopicQueueItem"
FOR SELECT
TO authenticated
USING (auth.uid() = "profileId");

CREATE POLICY "enable_insert_for_queue"
ON "public"."TopicQueueItem"
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = "profileId");

CREATE POLICY "enable_delete_for_queue"
ON "public"."TopicQueueItem"
FOR DELETE
TO authenticated
USING (auth.uid() = "profileId");

-- First, ensure the tables have the correct permissions
GRANT ALL ON "TopicFavorite" TO authenticated;
GRANT ALL ON "TopicQueueItem" TO authenticated;

-- Then verify RLS is enabled
ALTER TABLE "public"."TopicFavorite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."TopicQueueItem" ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies with simpler conditions
DROP POLICY IF EXISTS "enable_select_for_favorites" ON "TopicFavorite";
DROP POLICY IF EXISTS "enable_insert_for_favorites" ON "TopicFavorite";
DROP POLICY IF EXISTS "enable_delete_for_favorites" ON "TopicFavorite";

CREATE POLICY "enable_select_for_favorites"
ON "public"."TopicFavorite"
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "enable_insert_for_favorites"
ON "public"."TopicFavorite"
FOR INSERT TO authenticated
WITH CHECK (auth.uid()::text = "profileId"::text);

CREATE POLICY "enable_delete_for_favorites"
ON "public"."TopicFavorite"
FOR DELETE TO authenticated
USING (auth.uid()::text = "profileId"::text);

-- Same for queue items
DROP POLICY IF EXISTS "enable_select_for_queue" ON "TopicQueueItem";
DROP POLICY IF EXISTS "enable_insert_for_queue" ON "TopicQueueItem";
DROP POLICY IF EXISTS "enable_delete_for_queue" ON "TopicQueueItem";

CREATE POLICY "enable_select_for_queue"
ON "public"."TopicQueueItem"
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "enable_insert_for_queue"
ON "public"."TopicQueueItem"
FOR INSERT TO authenticated
WITH CHECK (auth.uid()::text = "profileId"::text);

CREATE POLICY "enable_delete_for_queue"
ON "public"."TopicQueueItem"
FOR DELETE TO authenticated
USING (auth.uid()::text = "profileId"::text);

-- Drop existing policies for Video and PromptResponse tables
DROP POLICY IF EXISTS "Users can manage own videos" ON "Video";
DROP POLICY IF EXISTS "Service role can manage all videos" ON "Video";
DROP POLICY IF EXISTS "Users can manage own prompt responses" ON "PromptResponse";
DROP POLICY IF EXISTS "Service role can manage all prompt responses" ON "PromptResponse";

-- Create policies for Video table
CREATE POLICY "Users can manage own videos"
ON "Video"
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM "ProfileSharer" ps
    WHERE ps.id = "Video"."profileSharerId"
    AND ps."profileId" = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "ProfileSharer" ps
    WHERE ps.id = "Video"."profileSharerId"
    AND ps."profileId" = auth.uid()
  )
);

-- Allow service role to manage all videos (for webhooks)
CREATE POLICY "Service role can manage all videos"
ON "Video"
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create policies for PromptResponse table
CREATE POLICY "Users can view own prompt responses"
ON "PromptResponse"
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM "ProfileSharer" ps
  WHERE ps.id = "PromptResponse"."profileSharerId"
  AND ps."profileId" = auth.uid()
));

CREATE POLICY "Users can insert own prompt responses"
ON "PromptResponse"
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM "ProfileSharer" ps
  WHERE ps.id = "PromptResponse"."profileSharerId"
  AND ps."profileId" = auth.uid()
));

CREATE POLICY "Users can update own prompt responses"
ON "PromptResponse"
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM "ProfileSharer" ps
  WHERE ps.id = "PromptResponse"."profileSharerId"
  AND ps."profileId" = auth.uid()
));

CREATE POLICY "Users can delete own prompt responses"
ON "PromptResponse"
FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM "ProfileSharer" ps
  WHERE ps.id = "PromptResponse"."profileSharerId"
  AND ps."profileId" = auth.uid()
));

-- Allow service role to manage all prompt responses
CREATE POLICY "Service role can manage all prompt responses"
ON "PromptResponse"
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Ensure proper grants
GRANT ALL ON "Video" TO authenticated;
GRANT ALL ON "Video" TO service_role;
GRANT ALL ON "PromptResponse" TO authenticated;
GRANT ALL ON "PromptResponse" TO service_role;

-- Grant schema-level permissions to service role
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Enable RLS
ALTER TABLE "ProfileRole" ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their own roles
CREATE POLICY "Users can read their own roles"
ON "ProfileRole"
FOR SELECT
TO authenticated
USING (
  auth.uid() = "profileId"
);

-- Allow system to read roles for auth checks
CREATE POLICY "System can read all roles"
ON "ProfileRole"
FOR SELECT
TO service_role
USING (true);

-- Add policies for Video access
CREATE POLICY "Users can view videos"
ON "Video"
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can manage own videos"
ON "Video"
FOR ALL
TO authenticated
USING (auth.uid()::text = "profileSharerId"::text);

-- Add policies for PromptResponse access
CREATE POLICY "Users can view prompt responses"
ON "PromptResponse"
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can manage own prompt responses"
ON "PromptResponse"
FOR ALL
TO authenticated
USING (auth.uid()::text = "profileSharerId"::text);
  