-- Drop the old responseText column since we're using responseNotes now
ALTER TABLE "PromptResponse" DROP COLUMN IF EXISTS "responseText";

-- Drop and recreate responseNotes to ensure clean state
ALTER TABLE "PromptResponse" DROP COLUMN IF EXISTS "responseNotes";
ALTER TABLE "PromptResponse" ADD COLUMN "responseNotes" TEXT;

-- Update any triggers that might reference responseText
DO $$ 
BEGIN
    -- Drop triggers if they exist
    DROP TRIGGER IF EXISTS update_prompt_response_search_vector ON "PromptResponse";
    
    -- Recreate the search vector trigger
    CREATE TRIGGER update_prompt_response_search_vector
    BEFORE INSERT OR UPDATE ON "PromptResponse"
    FOR EACH ROW
    EXECUTE FUNCTION tsvector_update_trigger(
        search_vector,
        'pg_catalog.english',
        responseNotes
    );
END $$; 