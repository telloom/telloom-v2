-- Add REVOKED to the status enum if it doesn't exist
DO $$ 
BEGIN 
    -- Check if REVOKED is already in the enum
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_type 
        JOIN pg_enum ON pg_type.oid = pg_enum.enumtypid 
        WHERE typname = 'follow_request_status' 
        AND enumlabel = 'REVOKED'
    ) THEN
        -- Add REVOKED to the enum
        ALTER TYPE follow_request_status ADD VALUE 'REVOKED';
    END IF;
END $$; 