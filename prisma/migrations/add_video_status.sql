-- Add status column to Video table
ALTER TABLE "Video" ADD COLUMN "status" "VideoStatus" DEFAULT 'WAITING';

-- Update existing videos to have a status
UPDATE "Video" SET "status" = 'READY' WHERE "muxPlaybackId" IS NOT NULL;
UPDATE "Video" SET "status" = 'ERRORED' WHERE "muxPlaybackId" IS NULL AND "muxAssetId" IS NOT NULL;
UPDATE "Video" SET "status" = 'WAITING' WHERE "muxPlaybackId" IS NULL AND "muxAssetId" IS NULL; 