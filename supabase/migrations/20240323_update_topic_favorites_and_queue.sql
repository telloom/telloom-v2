-- Add role and relationship fields to TopicFavorite
ALTER TABLE "TopicFavorite" 
ADD COLUMN "role" TEXT,
ADD COLUMN "sharerId" UUID REFERENCES "ProfileSharer"("id"),
ADD COLUMN "executorId" UUID REFERENCES "ProfileExecutor"("id");

-- Add role and relationship fields to TopicQueueItem
ALTER TABLE "TopicQueueItem" 
ADD COLUMN "role" TEXT,
ADD COLUMN "sharerId" UUID REFERENCES "ProfileSharer"("id"),
ADD COLUMN "executorId" UUID REFERENCES "ProfileExecutor"("id");

-- Add check constraints for role values
ALTER TABLE "TopicFavorite" 
ADD CONSTRAINT "topic_favorite_role_check" 
CHECK ("role" IN ('SHARER', 'EXECUTOR'));

ALTER TABLE "TopicQueueItem" 
ADD CONSTRAINT "topic_queue_role_check" 
CHECK ("role" IN ('SHARER', 'EXECUTOR'));

-- Create indexes for better query performance
CREATE INDEX "topic_favorite_role_idx" ON "TopicFavorite"("role");
CREATE INDEX "topic_favorite_sharer_idx" ON "TopicFavorite"("sharerId");
CREATE INDEX "topic_favorite_executor_idx" ON "TopicFavorite"("executorId");

CREATE INDEX "topic_queue_role_idx" ON "TopicQueueItem"("role");
CREATE INDEX "topic_queue_sharer_idx" ON "TopicQueueItem"("sharerId");
CREATE INDEX "topic_queue_executor_idx" ON "TopicQueueItem"("executorId");

-- Backfill existing data as SHARER role
UPDATE "TopicFavorite"
SET "role" = 'SHARER',
    "sharerId" = (
      SELECT "ProfileSharer".id 
      FROM "ProfileSharer" 
      WHERE "ProfileSharer"."profileId" = "TopicFavorite"."profileId" 
      LIMIT 1
    )
WHERE "role" IS NULL;

UPDATE "TopicQueueItem"
SET "role" = 'SHARER',
    "sharerId" = (
      SELECT "ProfileSharer".id 
      FROM "ProfileSharer" 
      WHERE "ProfileSharer"."profileId" = "TopicQueueItem"."profileId" 
      LIMIT 1
    )
WHERE "role" IS NULL;

-- After backfill, make role column required
ALTER TABLE "TopicFavorite" ALTER COLUMN "role" SET NOT NULL;
ALTER TABLE "TopicQueueItem" ALTER COLUMN "role" SET NOT NULL;

-- Update RLS policies for TopicFavorite
DROP POLICY IF EXISTS "Users can view their own favorites" ON "TopicFavorite";
CREATE POLICY "users_can_view_own_favorites"
ON "TopicFavorite"
FOR SELECT
USING (
  -- Sharers can view their own favorites
  (role = 'SHARER' AND EXISTS (
    SELECT 1 FROM "ProfileSharer" 
    WHERE id = "sharerId" 
    AND "profileId" = auth.uid()
  ))
  OR
  -- Executors can view their own favorites for specific sharers
  (role = 'EXECUTOR' AND EXISTS (
    SELECT 1 FROM "ProfileExecutor" 
    WHERE id = "executorId" 
    AND "executorId" = auth.uid()
  ))
);

DROP POLICY IF EXISTS "Users can manage their own favorites" ON "TopicFavorite";
CREATE POLICY "users_can_manage_own_favorites"
ON "TopicFavorite"
FOR ALL
USING (
  -- Sharers can manage their own favorites
  (role = 'SHARER' AND EXISTS (
    SELECT 1 FROM "ProfileSharer" 
    WHERE id = "sharerId" 
    AND "profileId" = auth.uid()
  ))
  OR
  -- Executors can manage their own favorites for specific sharers
  (role = 'EXECUTOR' AND EXISTS (
    SELECT 1 FROM "ProfileExecutor" 
    WHERE id = "executorId" 
    AND "executorId" = auth.uid()
  ))
);

-- Update RLS policies for TopicQueueItem
DROP POLICY IF EXISTS "Users can view their own queue items" ON "TopicQueueItem";
CREATE POLICY "users_can_view_own_queue_items"
ON "TopicQueueItem"
FOR SELECT
USING (
  -- Sharers can view their own queue items
  (role = 'SHARER' AND EXISTS (
    SELECT 1 FROM "ProfileSharer" 
    WHERE id = "sharerId" 
    AND "profileId" = auth.uid()
  ))
  OR
  -- Executors can view their own queue items for specific sharers
  (role = 'EXECUTOR' AND EXISTS (
    SELECT 1 FROM "ProfileExecutor" 
    WHERE id = "executorId" 
    AND "executorId" = auth.uid()
  ))
);

DROP POLICY IF EXISTS "Users can manage their own queue items" ON "TopicQueueItem";
CREATE POLICY "users_can_manage_own_queue_items"
ON "TopicQueueItem"
FOR ALL
USING (
  -- Sharers can manage their own queue items
  (role = 'SHARER' AND EXISTS (
    SELECT 1 FROM "ProfileSharer" 
    WHERE id = "sharerId" 
    AND "profileId" = auth.uid()
  ))
  OR
  -- Executors can manage their own queue items for specific sharers
  (role = 'EXECUTOR' AND EXISTS (
    SELECT 1 FROM "ProfileExecutor" 
    WHERE id = "executorId" 
    AND "executorId" = auth.uid()
  ))
); 