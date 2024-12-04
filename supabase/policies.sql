-- First, disable RLS temporarily to clean up
ALTER TABLE "Profile" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ProfileRole" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Prompt" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "PromptCategory" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "PromptResponse" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Video" DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies for these tables
DROP POLICY IF EXISTS "authenticated_select" ON "Profile";
DROP POLICY IF EXISTS "authenticated_select" ON "ProfileRole";
DROP POLICY IF EXISTS "authenticated_select" ON "Prompt";
DROP POLICY IF EXISTS "authenticated_select" ON "PromptCategory";
DROP POLICY IF EXISTS "authenticated_select" ON "PromptResponse";
DROP POLICY IF EXISTS "authenticated_select" ON "Video";

DROP POLICY IF EXISTS "Admins can do anything on Profile" ON "Profile";
DROP POLICY IF EXISTS "Admins can do anything on ProfileRole" ON "ProfileRole";
DROP POLICY IF EXISTS "Admins can do anything on Prompt" ON "Prompt";
DROP POLICY IF EXISTS "Admins can do anything on PromptCategory" ON "PromptCategory";
DROP POLICY IF EXISTS "Admins can do anything on PromptResponse" ON "PromptResponse";
DROP POLICY IF EXISTS "Admins can do anything on Video" ON "Video";

-- Re-enable RLS
ALTER TABLE "Profile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProfileRole" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Prompt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PromptCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PromptResponse" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Video" ENABLE ROW LEVEL SECURITY;

-- Create basic read policies for authenticated users
CREATE POLICY "enable_read_access"
ON "Profile"
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "enable_read_access"
ON "ProfileRole"
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "enable_read_access"
ON "Prompt"
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "enable_read_access"
ON "PromptCategory"
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "enable_read_access"
ON "PromptResponse"
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "enable_read_access"
ON "Video"
FOR SELECT
TO authenticated
USING (true);

-- Add write policies for Profile and ProfileRole
CREATE POLICY "enable_insert_own_profile"
ON "Profile"
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY "enable_update_own_profile"
ON "Profile"
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "enable_insert_own_role"
ON "ProfileRole"
FOR INSERT
TO authenticated
WITH CHECK ("profileId" = auth.uid());

CREATE POLICY "enable_update_own_role"
ON "ProfileRole"
FOR UPDATE
TO authenticated
USING ("profileId" = auth.uid())
WITH CHECK ("profileId" = auth.uid());

-- Insert test data if none exists
INSERT INTO "PromptCategory" (id, category, description)
SELECT 
  gen_random_uuid(), 
  'Family History', 
  'Questions about your family history and memories'
WHERE NOT EXISTS (SELECT 1 FROM "PromptCategory" LIMIT 1);

INSERT INTO "Prompt" (id, "promptText", "promptType", "isContextEstablishing", "promptCategoryId")
SELECT 
  gen_random_uuid(),
  'What is your earliest childhood memory?',
  'OPEN_ENDED',
  true,
  (SELECT id FROM "PromptCategory" LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM "Prompt" LIMIT 1);

-- Verify data exists
SELECT COUNT(*) FROM "PromptCategory";
SELECT COUNT(*) FROM "Prompt";

-- Verify policies
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('Profile', 'ProfileRole', 'Prompt', 'PromptCategory', 'PromptResponse', 'Video');
  