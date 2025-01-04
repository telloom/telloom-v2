-- Enable RLS
ALTER TABLE "PersonTag" ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Allow users to select their own tags
CREATE POLICY "Users can view their own tags"
ON "PersonTag"
FOR SELECT
USING (
  auth.uid() IN (
    SELECT "Profile".id
    FROM "Profile"
    JOIN "ProfileSharer" ON "Profile".id = "ProfileSharer".profile_id
    WHERE "ProfileSharer".id = "PersonTag".profile_sharer_id
  )
);

-- Allow users to insert their own tags
CREATE POLICY "Users can insert their own tags"
ON "PersonTag"
FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT "Profile".id
    FROM "Profile"
    JOIN "ProfileSharer" ON "Profile".id = "ProfileSharer".profile_id
    WHERE "ProfileSharer".id = profile_sharer_id
  )
);

-- Allow users to update their own tags
CREATE POLICY "Users can update their own tags"
ON "PersonTag"
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT "Profile".id
    FROM "Profile"
    JOIN "ProfileSharer" ON "Profile".id = "ProfileSharer".profile_id
    WHERE "ProfileSharer".id = "PersonTag".profile_sharer_id
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT "Profile".id
    FROM "Profile"
    JOIN "ProfileSharer" ON "Profile".id = "ProfileSharer".profile_id
    WHERE "ProfileSharer".id = profile_sharer_id
  )
);

-- Allow users to delete their own tags
CREATE POLICY "Users can delete their own tags"
ON "PersonTag"
FOR DELETE
USING (
  auth.uid() IN (
    SELECT "Profile".id
    FROM "Profile"
    JOIN "ProfileSharer" ON "Profile".id = "ProfileSharer".profile_id
    WHERE "ProfileSharer".id = "PersonTag".profile_sharer_id
  )
); 