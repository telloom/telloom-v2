-- Add timestamp columns to ProfileRole table
DO $$ 
BEGIN
  -- Add createdAt column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ProfileRole' AND column_name = 'createdAt') THEN
    ALTER TABLE "ProfileRole" ADD COLUMN "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  -- Add updatedAt column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ProfileRole' AND column_name = 'updatedAt') THEN
    ALTER TABLE "ProfileRole" ADD COLUMN "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  -- Set default values for existing rows
  UPDATE "ProfileRole" SET 
    "createdAt" = NOW() WHERE "createdAt" IS NULL;
  UPDATE "ProfileRole" SET 
    "updatedAt" = NOW() WHERE "updatedAt" IS NULL;

  -- Add not-null constraints
  ALTER TABLE "ProfileRole" 
    ALTER COLUMN "createdAt" SET NOT NULL,
    ALTER COLUMN "updatedAt" SET NOT NULL;
END $$; 