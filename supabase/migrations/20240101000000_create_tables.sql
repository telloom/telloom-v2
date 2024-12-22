-- Create Profile table first
CREATE TABLE IF NOT EXISTS "Profile" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "fullName" TEXT,
    "username" TEXT UNIQUE,
    "avatarUrl" TEXT,
    "email" TEXT UNIQUE,
    "passwordHash" TEXT UNIQUE,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "revenuecatAppUserId" TEXT,
    "status" TEXT,
    "airtableRecordId" TEXT,
    "addressStreet" TEXT,
    "addressUnit" TEXT,
    "addressCity" TEXT,
    "addressState" TEXT,
    "addressZipcode" TEXT,
    "executorFirstName" TEXT,
    "executorLastName" TEXT,
    "executorRelation" TEXT,
    "executorPhone" TEXT,
    "executorEmail" TEXT,
    "isAdmin" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ
);

-- Create ProfileSharer table
CREATE TABLE IF NOT EXISTS "ProfileSharer" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "profileId" UUID UNIQUE REFERENCES "Profile"(id) ON DELETE CASCADE,
    "subscriptionStatus" BOOLEAN,
    "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- Create PromptCategory table
CREATE TABLE IF NOT EXISTS "PromptCategory" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "category" TEXT,
    "description" TEXT,
    "theme" TEXT,
    "airtableId" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- Create Prompt table
CREATE TABLE IF NOT EXISTS "Prompt" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "promptText" VARCHAR(255),
    "promptType" VARCHAR(255) DEFAULT 'default',
    "isContextEstablishing" BOOLEAN DEFAULT false,
    "airtableId" VARCHAR,
    "createdAt" TIMESTAMP DEFAULT now(),
    "updatedAt" TIMESTAMP DEFAULT now(),
    "promptCategoryId" UUID REFERENCES "PromptCategory"(id) ON DELETE NO ACTION,
    "categoryAirtableId" VARCHAR,
    "isObjectPrompt" BOOLEAN,
    "search_vector" tsvector
);

-- Create Video table
CREATE TABLE IF NOT EXISTS "Video" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "profileSharerId" UUID NOT NULL REFERENCES "ProfileSharer"(id) ON DELETE CASCADE,
    "muxAssetId" TEXT UNIQUE,
    "muxPlaybackId" TEXT UNIQUE,
    "muxUploadId" TEXT UNIQUE,
    "passthrough" TEXT UNIQUE,
    "duration" FLOAT,
    "aspectRatio" TEXT,
    "videoQuality" TEXT,
    "maxWidth" DECIMAL,
    "maxHeight" DECIMAL,
    "maxFrameRate" DECIMAL,
    "languageCode" TEXT,
    "resolutionTier" TEXT,
    "airtableRecordId" TEXT,
    "promptId" UUID REFERENCES "Prompt"(id) ON DELETE NO ACTION,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- Create PromptResponse table
CREATE TABLE IF NOT EXISTS "PromptResponse" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "profileSharerId" UUID NOT NULL REFERENCES "ProfileSharer"(id) ON DELETE CASCADE,
    "videoId" UUID REFERENCES "Video"(id) ON DELETE SET NULL ON UPDATE NO ACTION,
    "responseText" TEXT,
    "privacyLevel" TEXT DEFAULT 'Private',
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now(),
    "airtableRecordId" TEXT,
    "promptId" UUID REFERENCES "Prompt"(id) ON DELETE NO ACTION,
    "search_vector" tsvector
); 