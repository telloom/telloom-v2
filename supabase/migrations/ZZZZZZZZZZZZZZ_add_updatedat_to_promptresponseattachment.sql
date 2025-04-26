-- supabase/migrations/ZZZZZZZZZZZZZZ_add_updatedat_to_promptresponseattachment.sql
-- Add updatedAt column to PromptResponseAttachment and setup auto-update trigger

-- 1. Add the column with a default value
ALTER TABLE public."PromptResponseAttachment"
ADD COLUMN "updatedAt" TIMESTAMPTZ DEFAULT now();

-- 2. Ensure the column is not null if desired (optional, but good practice)
ALTER TABLE public."PromptResponseAttachment"
ALTER COLUMN "updatedAt" SET NOT NULL;

-- 3. Create a trigger function to update the timestamp
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Apply the trigger to the table
-- Drop existing trigger first if it exists (for idempotency)
DROP TRIGGER IF EXISTS set_timestamp ON public."PromptResponseAttachment";
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON public."PromptResponseAttachment"
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

-- Optional: Backfill existing rows if needed (unlikely needed for new column)
-- UPDATE public."PromptResponseAttachment" SET "updatedAt" = "uploadedAt" WHERE "updatedAt" IS NULL; 