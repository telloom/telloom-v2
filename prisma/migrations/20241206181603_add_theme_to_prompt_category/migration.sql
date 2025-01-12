-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

-- CreateEnum
CREATE TYPE "Theme" AS ENUM ('LIFE_EXPERIENCES', 'HEALTH_AND_WELLBEING', 'WELLBEING', 'BUSINESS', 'FOOD', 'CUSTOM', 'VALUES_AND_BELIEFS', 'PERSONAL_HISTORY', 'CAREER_AND_EDUCATION', 'CHALLENGES_AND_RESILIENCE', 'RELATIONSHIPS_AND_COMMUNITY', 'HOBBIES_AND_INTERESTS', 'CULTURAL_AND_HERITAGE');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('LISTENER', 'SHARER', 'EXECUTOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "VideoStatus" AS ENUM ('WAITING', 'PREPARING', 'ASSET_CREATED', 'READY', 'ERRORED');

-- CreateTable
CREATE TABLE "Entitlement" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "revenuecatId" TEXT NOT NULL,
    "lookupKey" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Entitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObjectCategory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "categoryName" TEXT NOT NULL,
    "description" TEXT,
    "airtableRecordId" TEXT,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ObjectCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Object" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID,
    "objectName" TEXT NOT NULL,
    "objectDescription" TEXT,
    "airtableRecordId" TEXT,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6),
    "promptResponseId" UUID,
    "categoryId" UUID,

    CONSTRAINT "Object_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offering" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "revenuecatId" TEXT NOT NULL,
    "lookupKey" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "isCurrent" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Offering_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Package" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "revenuecatId" TEXT NOT NULL,
    "offeringId" UUID,
    "productId" UUID,
    "lookupKey" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "position" INTEGER,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Package_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "revenuecatId" TEXT NOT NULL,
    "storeIdentifier" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "displayName" TEXT,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" UUID NOT NULL,
    "fullName" TEXT,
    "username" TEXT,
    "avatarUrl" TEXT,
    "email" TEXT,
    "passwordHash" TEXT,
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
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileRole" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "role" "Role" NOT NULL,

    CONSTRAINT "ProfileRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileSharer" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profileId" UUID NOT NULL,
    "subscriptionStatus" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileSharer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileExecutor" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sharerId" UUID NOT NULL,
    "executorId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileExecutor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileListener" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "listenerId" UUID NOT NULL,
    "sharerId" UUID NOT NULL,
    "sharedSince" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hasAccess" BOOLEAN NOT NULL DEFAULT true,
    "lastViewed" TIMESTAMP(3),
    "notifications" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ProfileListener_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sharerId" UUID NOT NULL,
    "inviterId" UUID,
    "inviteeEmail" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptCategory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category" TEXT,
    "description" TEXT,
    "theme" "Theme",
    "airtableId" TEXT,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopicFavorite" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profileId" UUID NOT NULL,
    "promptCategoryId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TopicFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopicQueueItem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profileId" UUID NOT NULL,
    "promptCategoryId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TopicQueueItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptResponseAttachment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "promptResponseId" UUID NOT NULL,
    "profileSharerId" UUID NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER,
    "title" TEXT,
    "description" TEXT,
    "estimatedYear" INTEGER,
    "uploadedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptResponseAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptResponse" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profileSharerId" UUID NOT NULL,
    "videoId" UUID,
    "responseNotes" TEXT,
    "privacyLevel" TEXT NOT NULL DEFAULT 'Private',
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6),
    "airtableRecordId" TEXT,
    "promptId" UUID,
    "search_vector" tsvector,

    CONSTRAINT "PromptResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptResponseFavorite" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profileId" UUID NOT NULL,
    "promptResponseId" UUID NOT NULL,
    "favoritedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptResponseFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptResponseRecentlyWatched" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profileId" UUID NOT NULL,
    "promptResponseId" UUID NOT NULL,
    "watchedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptResponseRecentlyWatched_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prompt" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "promptText" VARCHAR(255) NOT NULL,
    "promptType" VARCHAR(255) DEFAULT 'default',
    "isContextEstablishing" BOOLEAN DEFAULT false,
    "airtableId" VARCHAR,
    "createdAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "promptCategoryId" UUID,
    "categoryAirtableId" VARCHAR,
    "isObjectPrompt" BOOLEAN,
    "search_vector" tsvector,

    CONSTRAINT "Prompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "revenuecatId" TEXT NOT NULL,
    "userId" UUID,
    "productId" UUID,
    "purchasedAt" TIMESTAMPTZ(6) NOT NULL,
    "store" TEXT NOT NULL,
    "revenueInUsd" DECIMAL NOT NULL,
    "status" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "storePurchaseIdentifier" TEXT,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResponsePermission" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID,
    "permissionLevel" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "responseId" UUID,

    CONSTRAINT "ResponsePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionEntitlement" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "subscriptionId" UUID NOT NULL,
    "entitlementId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionEntitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "revenuecatId" TEXT NOT NULL,
    "userId" UUID,
    "productId" UUID,
    "startsAt" TIMESTAMPTZ(6) NOT NULL,
    "currentPeriodStartsAt" TIMESTAMPTZ(6) NOT NULL,
    "currentPeriodEndsAt" TIMESTAMPTZ(6),
    "givesAccess" BOOLEAN NOT NULL,
    "autoRenewalStatus" TEXT,
    "status" TEXT NOT NULL,
    "store" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "storeSubscriptionIdentifier" TEXT,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThematicVideo" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "profileSharerId" UUID NOT NULL,
    "muxAssetId" TEXT,
    "muxPlaybackId" TEXT,
    "muxUploadId" TEXT,
    "passthrough" TEXT,
    "duration" DOUBLE PRECISION,
    "aspectRatio" TEXT,
    "videoQuality" TEXT,
    "maxWidth" DECIMAL,
    "maxHeight" DECIMAL,
    "maxFrameRate" DECIMAL,
    "languageCode" TEXT,
    "resolutionTier" TEXT,
    "url" TEXT NOT NULL,
    "metadata" JSONB,
    "airtableRecordId" TEXT,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThematicVideo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoTranscript" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "videoId" UUID NOT NULL,
    "transcript" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "VideoTranscript_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Video" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profileSharerId" UUID NOT NULL,
    "muxAssetId" TEXT,
    "muxPlaybackId" TEXT,
    "muxUploadId" TEXT,
    "passthrough" TEXT,
    "duration" DOUBLE PRECISION,
    "aspectRatio" TEXT,
    "videoQuality" TEXT,
    "maxWidth" DECIMAL,
    "maxHeight" DECIMAL,
    "maxFrameRate" DECIMAL,
    "languageCode" TEXT,
    "resolutionTier" TEXT,
    "airtableRecordId" TEXT,
    "promptId" UUID,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ListenerPromptViews" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_ListenerPromptViews_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ListenerVideoViews" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_ListenerVideoViews_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_PromptResponseToThematicVideo" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_PromptResponseToThematicVideo_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Profile_username_key" ON "Profile"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_email_key" ON "Profile"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_passwordHash_key" ON "Profile"("passwordHash");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileRole_profileId_role_key" ON "ProfileRole"("profileId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileSharer_profileId_key" ON "ProfileSharer"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileExecutor_sharerId_key" ON "ProfileExecutor"("sharerId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileListener_listenerId_sharerId_key" ON "ProfileListener"("listenerId", "sharerId");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_sharerId_inviteeEmail_role_key" ON "Invitation"("sharerId", "inviteeEmail", "role");

-- CreateIndex
CREATE UNIQUE INDEX "TopicFavorite_profileId_promptCategoryId_key" ON "TopicFavorite"("profileId", "promptCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "TopicQueueItem_profileId_promptCategoryId_key" ON "TopicQueueItem"("profileId", "promptCategoryId");

-- CreateIndex
CREATE INDEX "prompt_response_search_idx" ON "PromptResponse" USING GIN ("search_vector");

-- CreateIndex
CREATE INDEX "prompt_search_idx" ON "Prompt" USING GIN ("search_vector");

-- CreateIndex
CREATE UNIQUE INDEX "ThematicVideo_muxAssetId_key" ON "ThematicVideo"("muxAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "ThematicVideo_muxPlaybackId_key" ON "ThematicVideo"("muxPlaybackId");

-- CreateIndex
CREATE UNIQUE INDEX "ThematicVideo_muxUploadId_key" ON "ThematicVideo"("muxUploadId");

-- CreateIndex
CREATE UNIQUE INDEX "ThematicVideo_passthrough_key" ON "ThematicVideo"("passthrough");

-- CreateIndex
CREATE UNIQUE INDEX "VideoTranscript_videoId_key" ON "VideoTranscript"("videoId");

-- CreateIndex
CREATE UNIQUE INDEX "Video_muxAssetId_key" ON "Video"("muxAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "Video_muxPlaybackId_key" ON "Video"("muxPlaybackId");

-- CreateIndex
CREATE UNIQUE INDEX "Video_muxUploadId_key" ON "Video"("muxUploadId");

-- CreateIndex
CREATE UNIQUE INDEX "Video_passthrough_key" ON "Video"("passthrough");

-- CreateIndex
CREATE INDEX "_ListenerPromptViews_B_index" ON "_ListenerPromptViews"("B");

-- CreateIndex
CREATE INDEX "_ListenerVideoViews_B_index" ON "_ListenerVideoViews"("B");

-- CreateIndex
CREATE INDEX "_PromptResponseToThematicVideo_B_index" ON "_PromptResponseToThematicVideo"("B");

-- AddForeignKey
ALTER TABLE "Object" ADD CONSTRAINT "Object_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ObjectCategory"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Object" ADD CONSTRAINT "Object_promptResponseId_fkey" FOREIGN KEY ("promptResponseId") REFERENCES "PromptResponse"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Package" ADD CONSTRAINT "Package_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "Offering"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Package" ADD CONSTRAINT "Package_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ProfileRole" ADD CONSTRAINT "ProfileRole_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileSharer" ADD CONSTRAINT "ProfileSharer_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileExecutor" ADD CONSTRAINT "ProfileExecutor_executorId_fkey" FOREIGN KEY ("executorId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileExecutor" ADD CONSTRAINT "ProfileExecutor_sharerId_fkey" FOREIGN KEY ("sharerId") REFERENCES "ProfileSharer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileListener" ADD CONSTRAINT "ProfileListener_listenerId_fkey" FOREIGN KEY ("listenerId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileListener" ADD CONSTRAINT "ProfileListener_sharerId_fkey" FOREIGN KEY ("sharerId") REFERENCES "ProfileSharer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_inviteeEmail_fkey" FOREIGN KEY ("inviteeEmail") REFERENCES "Profile"("email") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_sharerId_fkey" FOREIGN KEY ("sharerId") REFERENCES "ProfileSharer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicFavorite" ADD CONSTRAINT "TopicFavorite_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicFavorite" ADD CONSTRAINT "TopicFavorite_promptCategoryId_fkey" FOREIGN KEY ("promptCategoryId") REFERENCES "PromptCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicQueueItem" ADD CONSTRAINT "TopicQueueItem_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicQueueItem" ADD CONSTRAINT "TopicQueueItem_promptCategoryId_fkey" FOREIGN KEY ("promptCategoryId") REFERENCES "PromptCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptResponseAttachment" ADD CONSTRAINT "PromptResponseAttachment_profileSharerId_fkey" FOREIGN KEY ("profileSharerId") REFERENCES "ProfileSharer"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptResponseAttachment" ADD CONSTRAINT "PromptResponseAttachment_promptResponseId_fkey" FOREIGN KEY ("promptResponseId") REFERENCES "PromptResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptResponse" ADD CONSTRAINT "PromptResponse_profileSharerId_fkey" FOREIGN KEY ("profileSharerId") REFERENCES "ProfileSharer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptResponse" ADD CONSTRAINT "PromptResponse_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Prompt"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptResponse" ADD CONSTRAINT "PromptResponse_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PromptResponseFavorite" ADD CONSTRAINT "PromptResponseFavorite_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptResponseFavorite" ADD CONSTRAINT "PromptResponseFavorite_promptResponseId_fkey" FOREIGN KEY ("promptResponseId") REFERENCES "PromptResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptResponseRecentlyWatched" ADD CONSTRAINT "PromptResponseRecentlyWatched_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptResponseRecentlyWatched" ADD CONSTRAINT "PromptResponseRecentlyWatched_promptResponseId_fkey" FOREIGN KEY ("promptResponseId") REFERENCES "PromptResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prompt" ADD CONSTRAINT "Prompt_promptCategoryId_fkey" FOREIGN KEY ("promptCategoryId") REFERENCES "PromptCategory"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ResponsePermission" ADD CONSTRAINT "ResponsePermission_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "PromptResponse"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SubscriptionEntitlement" ADD CONSTRAINT "SubscriptionEntitlement_entitlementId_fkey" FOREIGN KEY ("entitlementId") REFERENCES "Entitlement"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SubscriptionEntitlement" ADD CONSTRAINT "SubscriptionEntitlement_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ThematicVideo" ADD CONSTRAINT "ThematicVideo_profileSharerId_fkey" FOREIGN KEY ("profileSharerId") REFERENCES "ProfileSharer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoTranscript" ADD CONSTRAINT "VideoTranscript_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_profileSharerId_fkey" FOREIGN KEY ("profileSharerId") REFERENCES "ProfileSharer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Prompt"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ListenerPromptViews" ADD CONSTRAINT "_ListenerPromptViews_A_fkey" FOREIGN KEY ("A") REFERENCES "ProfileListener"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ListenerPromptViews" ADD CONSTRAINT "_ListenerPromptViews_B_fkey" FOREIGN KEY ("B") REFERENCES "PromptResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ListenerVideoViews" ADD CONSTRAINT "_ListenerVideoViews_A_fkey" FOREIGN KEY ("A") REFERENCES "ProfileListener"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ListenerVideoViews" ADD CONSTRAINT "_ListenerVideoViews_B_fkey" FOREIGN KEY ("B") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PromptResponseToThematicVideo" ADD CONSTRAINT "_PromptResponseToThematicVideo_A_fkey" FOREIGN KEY ("A") REFERENCES "PromptResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PromptResponseToThematicVideo" ADD CONSTRAINT "_PromptResponseToThematicVideo_B_fkey" FOREIGN KEY ("B") REFERENCES "ThematicVideo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
