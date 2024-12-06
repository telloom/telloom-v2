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

-- Create basic policies for authenticated users
CREATE POLICY "authenticated_access" ON "Profile" FOR ALL TO authenticated USING (true);
CREATE POLICY "authenticated_access" ON "ProfileRole" FOR ALL TO authenticated USING (true);
CREATE POLICY "authenticated_access" ON "Prompt" FOR ALL TO authenticated USING (true);
CREATE POLICY "authenticated_access" ON "PromptCategory" FOR ALL TO authenticated USING (true);
CREATE POLICY "authenticated_access" ON "PromptResponse" FOR ALL TO authenticated USING (true);
CREATE POLICY "authenticated_access" ON "Video" FOR ALL TO authenticated USING (true);
CREATE POLICY "authenticated_access" ON "ProfileSharer" FOR ALL TO authenticated USING (true);

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
  