-- Add timestamp columns to ProfileExecutor table
DO $$ 
BEGIN
  -- Add createdAt column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ProfileExecutor' AND column_name = 'createdAt') THEN
    ALTER TABLE "ProfileExecutor" ADD COLUMN "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  -- Add updatedAt column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ProfileExecutor' AND column_name = 'updatedAt') THEN
    ALTER TABLE "ProfileExecutor" ADD COLUMN "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  -- Set default values for existing rows
  UPDATE "ProfileExecutor" SET 
    "createdAt" = NOW() WHERE "createdAt" IS NULL;
  UPDATE "ProfileExecutor" SET 
    "updatedAt" = NOW() WHERE "updatedAt" IS NULL;

  -- Add not-null constraints
  ALTER TABLE "ProfileExecutor" 
    ALTER COLUMN "createdAt" SET NOT NULL,
    ALTER COLUMN "updatedAt" SET NOT NULL;
END $$; 