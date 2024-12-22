-- First, ensure we're in the right schema and reset search path
SET search_path TO public;

DO $$ 
BEGIN
    -- Only proceed if tables exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Video') AND
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'PromptResponse') AND
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Prompt') AND
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'PromptCategory') THEN

        -- Temporarily disable RLS
        ALTER TABLE "Video" DISABLE ROW LEVEL SECURITY;
        ALTER TABLE "PromptResponse" DISABLE ROW LEVEL SECURITY;
        ALTER TABLE "Prompt" DISABLE ROW LEVEL SECURITY;
        ALTER TABLE "PromptCategory" DISABLE ROW LEVEL SECURITY;

        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view own videos" ON "Video";
        DROP POLICY IF EXISTS "Users can manage own videos" ON "Video";
        DROP POLICY IF EXISTS "Service role can manage all videos" ON "Video";
        DROP POLICY IF EXISTS "service_role_all" ON "Video";
        DROP POLICY IF EXISTS "Users can view own prompt responses" ON "PromptResponse";
        DROP POLICY IF EXISTS "Users can manage own prompt responses" ON "PromptResponse";
        DROP POLICY IF EXISTS "Service role can manage all prompt responses" ON "PromptResponse";
        DROP POLICY IF EXISTS "Anyone can view prompts" ON "Prompt";
        DROP POLICY IF EXISTS "Anyone can view prompt categories" ON "PromptCategory";

        -- Create policies for PromptCategory (viewable by all authenticated users)
        CREATE POLICY "Anyone can view prompt categories"
        ON "PromptCategory"
        FOR SELECT
        TO authenticated
        USING (true);

        -- Create policies for Prompt (viewable by all authenticated users)
        CREATE POLICY "Anyone can view prompts"
        ON "Prompt"
        FOR SELECT
        TO authenticated
        USING (true);

        -- Create policies for PromptResponse
        CREATE POLICY "Users can view own prompt responses"
        ON "PromptResponse"
        FOR SELECT
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM "ProfileSharer" ps
                WHERE ps.id = "PromptResponse"."profileSharerId"
                AND ps."profileId" = auth.uid()
            )
        );

        CREATE POLICY "Users can manage own prompt responses"
        ON "PromptResponse"
        FOR ALL
        TO authenticated
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

        -- Create policies for Video
        CREATE POLICY "Users can view own videos"
        ON "Video"
        FOR SELECT
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM "ProfileSharer" ps
                WHERE ps.id = "Video"."profileSharerId"
                AND ps."profileId" = auth.uid()
            )
        );

        CREATE POLICY "Users can manage own videos"
        ON "Video"
        FOR ALL
        TO authenticated
        USING (
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

        CREATE POLICY "Service role can manage all prompt responses"
        ON "PromptResponse"
        FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);

        -- Re-enable RLS
        ALTER TABLE "Video" ENABLE ROW LEVEL SECURITY;
        ALTER TABLE "PromptResponse" ENABLE ROW LEVEL SECURITY;
        ALTER TABLE "Prompt" ENABLE ROW LEVEL SECURITY;
        ALTER TABLE "PromptCategory" ENABLE ROW LEVEL SECURITY;

        -- Reset permissions
        GRANT USAGE ON SCHEMA public TO postgres;
        GRANT USAGE ON SCHEMA public TO authenticated;
        GRANT USAGE ON SCHEMA public TO service_role;

        -- Grant table permissions
        GRANT ALL ON "Video" TO authenticated;
        GRANT ALL ON "Video" TO service_role;
        GRANT ALL ON "PromptResponse" TO authenticated;
        GRANT ALL ON "PromptResponse" TO service_role;
        GRANT SELECT ON "Prompt" TO authenticated;
        GRANT SELECT ON "PromptCategory" TO authenticated;

        -- Ensure sequences are accessible
        GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
        GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
    END IF;
END $$;
 