-- Allow null values for updatedAt in ProfileListener table
ALTER TABLE "ProfileListener" ALTER COLUMN "updatedAt" DROP NOT NULL; 