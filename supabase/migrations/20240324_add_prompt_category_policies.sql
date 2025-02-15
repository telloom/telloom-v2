-- Enable RLS on PromptCategory table
ALTER TABLE "PromptCategory" ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing prompt categories
CREATE POLICY "Anyone can view prompt categories"
ON "PromptCategory"
FOR SELECT
TO authenticated
USING (true);

-- Grant necessary permissions
GRANT SELECT ON "PromptCategory" TO authenticated; 