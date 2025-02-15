-- Update policies for Prompt table
DROP POLICY IF EXISTS "Anyone can view prompts" ON "Prompt";
CREATE POLICY "Anyone can view prompts"
ON "Prompt"
FOR SELECT
TO authenticated
USING (true);

-- Update policies for PromptResponse table to ensure proper sharer access
DROP POLICY IF EXISTS "Sharers can access their own prompt responses" ON "PromptResponse";
CREATE POLICY "Sharers can access their own prompt responses"
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

-- Ensure proper access to prompt responses for sharers
DROP POLICY IF EXISTS "Sharers can view all prompt responses" ON "PromptResponse";
CREATE POLICY "Sharers can view all prompt responses"
ON "PromptResponse"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "ProfileRole" pr
    WHERE pr."profileId" = auth.uid()
    AND pr.role = 'SHARER'
  )
);

-- Grant necessary permissions
GRANT SELECT ON "Prompt" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "PromptResponse" TO authenticated; 