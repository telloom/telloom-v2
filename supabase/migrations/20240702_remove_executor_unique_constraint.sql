-- Remove the unique constraint on sharerId in ProfileExecutor table
-- This allows multiple executors to be assigned to the same sharer
-- Migration created: July 2, 2024

DO $$
BEGIN
  -- Check if the ProfileExecutor table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'ProfileExecutor'
  ) THEN
    -- Drop the existing unique index on sharerId if it exists
    IF EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE tablename = 'ProfileExecutor' 
      AND indexname = 'ProfileExecutor_sharerId_key'
    ) THEN
      DROP INDEX "ProfileExecutor_sharerId_key";
      RAISE LOG 'Dropped unique index on sharerId in ProfileExecutor table';
    ELSE
      RAISE LOG 'Unique index on sharerId in ProfileExecutor table does not exist, skipping drop';
    END IF;
    
    -- Create a composite unique index on (executorId, sharerId) to maintain data integrity
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE tablename = 'ProfileExecutor' 
      AND indexname = 'ProfileExecutor_executorId_sharerId_key'
    ) THEN
      CREATE UNIQUE INDEX "ProfileExecutor_executorId_sharerId_key" 
      ON "ProfileExecutor" ("executorId", "sharerId");
      RAISE LOG 'Created composite unique index on (executorId, sharerId) in ProfileExecutor table';
    ELSE
      RAISE LOG 'Composite unique index on (executorId, sharerId) in ProfileExecutor table already exists, skipping creation';
    END IF;
  ELSE
    RAISE LOG 'Table ProfileExecutor does not exist, skipping migration';
  END IF;
  
  RAISE LOG 'Migration completed: Removed unique constraint on sharerId in ProfileExecutor table';
END $$; 