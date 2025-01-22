-- Add status and errorMessage columns to TopicVideo table
ALTER TABLE "TopicVideo" ADD COLUMN IF NOT EXISTS "status" "VideoStatus" NOT NULL DEFAULT 'WAITING';
ALTER TABLE "TopicVideo" ADD COLUMN IF NOT EXISTS "errorMessage" text; 