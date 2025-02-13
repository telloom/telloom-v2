-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Sharers can create listener relationships" ON "ProfileListener";

-- Add default values for timestamps if they don't exist
DO $$ 
BEGIN
  -- Check if the columns exist and add them if they don't
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ProfileListener' AND column_name = 'createdAt') THEN
    ALTER TABLE "ProfileListener" ADD COLUMN "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ProfileListener' AND column_name = 'updatedAt') THEN
    ALTER TABLE "ProfileListener" ADD COLUMN "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  -- Set default values for existing rows if needed
  UPDATE "ProfileListener" SET 
    "createdAt" = NOW() WHERE "createdAt" IS NULL;
  UPDATE "ProfileListener" SET 
    "updatedAt" = NOW() WHERE "updatedAt" IS NULL;

  -- Add not-null constraints
  ALTER TABLE "ProfileListener" 
    ALTER COLUMN "createdAt" SET NOT NULL,
    ALTER COLUMN "updatedAt" SET NOT NULL;
END $$;

-- Create policy for sharers to insert into ProfileListener
CREATE POLICY "Sharers can create listener relationships"
ON "ProfileListener"
FOR INSERT
WITH CHECK (
  -- Verify the current user is the sharer
  auth.uid() IN (
    SELECT "profileId"
    FROM "ProfileSharer"
    WHERE id = "sharerId"
  )
); 