-- ***********************************************************************
-- *               Script to Drop All RLS Policies and Functions         *
-- ***********************************************************************

-- ==========================================================
-- Drop All RLS Policies from Tables in the 'public' Schema
-- ==========================================================

DO
$$
DECLARE
    tbl RECORD;
    pol RECORD;
BEGIN
    FOR tbl IN
        SELECT schemaname, tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        FOR pol IN
            SELECT policyname
            FROM pg_policies
            WHERE schemaname = tbl.schemaname
              AND tablename = tbl.tablename
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', pol.policyname, tbl.schemaname, tbl.tablename);
        END LOOP;
    END LOOP;
END;
$$;

-- ==========================================================
-- Drop Helper Functions (e.g., is_admin)
-- ==========================================================

DROP FUNCTION IF EXISTS is_admin() CASCADE;

-- ==========================================================
-- Disable RLS on All Tables in the 'public' Schema (Optional)
-- ==========================================================

DO
$$
DECLARE
    tbl RECORD;
BEGIN
    FOR tbl IN
        SELECT schemaname, tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE %I.%I DISABLE ROW LEVEL SECURITY;', tbl.schemaname, tbl.tablename);
    END LOOP;
END;
$$;

-- ***********************************************************************
-- *                 End of Script to Clear Existing Policies            *
-- ***********************************************************************

-- ***********************************************************************
-- *            Corrected Combined SQL Code for Supabase Database        *
-- *          RLS Policies, Functions, and Triggers without Notifications*
-- ***********************************************************************

-- ==========================================================
-- Enable Extensions (if not already enabled)
-- ==========================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================================
-- Helper Function to Check Admin Status
-- ==========================================================
-- This function checks if the current user is an admin.
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public."Profile" WHERE "id" = auth.uid() AND "isAdmin" = TRUE
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ==========================================================
-- Row-Level Security Policies for All Tables
-- ==========================================================

-- ==========================================================
-- Table: Profile
-- ==========================================================
ALTER TABLE public."Profile" ENABLE ROW LEVEL SECURITY;

-- Admin Policy
CREATE POLICY "Admins can do anything on Profile"
ON public."Profile"
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Allow individual users to access and update their own profile
CREATE POLICY "Allow individual users to SELECT their own profile"
ON public."Profile"
FOR SELECT
USING ("id" = auth.uid());

CREATE POLICY "Allow individual users to UPDATE their own profile"
ON public."Profile"
FOR UPDATE
USING ("id" = auth.uid())
WITH CHECK ("id" = auth.uid());

-- ==========================================================
-- Table: ProfileRole
-- ==========================================================
ALTER TABLE public."ProfileRole" ENABLE ROW LEVEL SECURITY;

-- Admin Policy
CREATE POLICY "Admins can do anything on ProfileRole"
ON public."ProfileRole"
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Users can view their own profile roles
CREATE POLICY "Users can view their own profile roles"
ON public."ProfileRole"
FOR SELECT
USING ("profileId" = auth.uid());

-- ==========================================================
-- Table: ProfileSharer
-- ==========================================================
ALTER TABLE public."ProfileSharer" ENABLE ROW LEVEL SECURITY;

-- Admin Policy
CREATE POLICY "Admins can do anything on ProfileSharer"
ON public."ProfileSharer"
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Sharers can access their own ProfileSharer record
CREATE POLICY "Sharers can access their own ProfileSharer"
ON public."ProfileSharer"
FOR ALL
USING ("profileId" = auth.uid())
WITH CHECK ("profileId" = auth.uid());

-- ==========================================================
-- Table: ProfileListener
-- ==========================================================
ALTER TABLE public."ProfileListener" ENABLE ROW LEVEL SECURITY;

-- Admin Policy
CREATE POLICY "Admins can do anything on ProfileListener"
ON public."ProfileListener"
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Listeners can access their own follow records
CREATE POLICY "Listeners can access their own follow records"
ON public."ProfileListener"
FOR ALL
USING ("listenerId" = auth.uid())
WITH CHECK ("listenerId" = auth.uid());

-- Sharers can view their followers
CREATE POLICY "Sharers can view their followers"
ON public."ProfileListener"
FOR SELECT
USING ("sharerId" = (
  SELECT "id" FROM public."ProfileSharer" WHERE "profileId" = auth.uid()
));

-- ==========================================================
-- Table: ProfileExecutor
-- ==========================================================
ALTER TABLE public."ProfileExecutor" ENABLE ROW LEVEL SECURITY;

-- Admin Policy
CREATE POLICY "Admins can do anything on ProfileExecutor"
ON public."ProfileExecutor"
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Executors can access their own executor records
CREATE POLICY "Executors can access their own executor records"
ON public."ProfileExecutor"
FOR ALL
USING ("executorId" = auth.uid())
WITH CHECK ("executorId" = auth.uid());

-- Sharers can view their assigned executor
CREATE POLICY "Sharers can view their assigned executor"
ON public."ProfileExecutor"
FOR SELECT
USING ("sharerId" = (
  SELECT "id" FROM public."ProfileSharer" WHERE "profileId" = auth.uid()
));

-- ==========================================================
-- Table: Invitation
-- ==========================================================
ALTER TABLE public."Invitation" ENABLE ROW LEVEL SECURITY;

-- Admin Policy
CREATE POLICY "Admins can do anything on Invitation"
ON public."Invitation"
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Inviters can access invitations they sent
CREATE POLICY "Inviters can access invitations they sent"
ON public."Invitation"
FOR ALL
USING ("inviterId" = auth.uid())
WITH CHECK ("inviterId" = auth.uid());

-- Invitees can access invitations sent to them
CREATE POLICY "Invitees can access invitations sent to them"
ON public."Invitation"
FOR SELECT
USING ("inviteeEmail" = (
  SELECT "email" FROM public."Profile" WHERE "id" = auth.uid()
));

-- ==========================================================
-- Table: PromptResponse
-- ==========================================================
ALTER TABLE public."PromptResponse" ENABLE ROW LEVEL SECURITY;

-- Admin Policy
CREATE POLICY "Admins can do anything on PromptResponse"
ON public."PromptResponse"
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Sharers can access their own prompt responses
CREATE POLICY "Sharers can access their own prompt responses"
ON public."PromptResponse"
FOR ALL
USING (
  "profileSharerId" = (
    SELECT "id" FROM public."ProfileSharer" WHERE "profileId" = auth.uid()
  )
)
WITH CHECK (
  "profileSharerId" = (
    SELECT "id" FROM public."ProfileSharer" WHERE "profileId" = auth.uid()
  )
);

-- Listeners can view prompt responses from sharers they follow
CREATE POLICY "Listeners can view prompt responses from sharers they follow"
ON public."PromptResponse"
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public."ProfileListener" pl
    WHERE pl."listenerId" = auth.uid()
      AND pl."sharerId" = "profileSharerId"
      AND pl."hasAccess" = TRUE
  ) AND "privacyLevel" = 'Public'
);

-- ==========================================================
-- Table: Video
-- ==========================================================
ALTER TABLE public."Video" ENABLE ROW LEVEL SECURITY;

-- Admin Policy
CREATE POLICY "Admins can do anything on Video"
ON public."Video"
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Sharers can access their own videos
CREATE POLICY "Sharers can access their own videos"
ON public."Video"
FOR ALL
USING (
  "profileSharerId" = (
    SELECT "id" FROM public."ProfileSharer" WHERE "profileId" = auth.uid()
  )
)
WITH CHECK (
  "profileSharerId" = (
    SELECT "id" FROM public."ProfileSharer" WHERE "profileId" = auth.uid()
  )
);

-- Listeners can view videos from sharers they follow
CREATE POLICY "Listeners can view videos from sharers they follow"
ON public."Video"
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public."ProfileListener" pl
    WHERE pl."listenerId" = auth.uid()
      AND pl."sharerId" = "profileSharerId"
      AND pl."hasAccess" = TRUE
  )
);

-- ==========================================================
-- Table: VideoTranscript
-- ==========================================================
ALTER TABLE public."VideoTranscript" ENABLE ROW LEVEL SECURITY;

-- Admin Policy
CREATE POLICY "Admins can do anything on VideoTranscript"
ON public."VideoTranscript"
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Sharers can access their own video transcripts
CREATE POLICY "Sharers can access their own video transcripts"
ON public."VideoTranscript"
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public."Video" v
    JOIN public."ProfileSharer" ps ON v."profileSharerId" = ps."id"
    WHERE v."id" = "videoId" AND ps."profileId" = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public."Video" v
    JOIN public."ProfileSharer" ps ON v."profileSharerId" = ps."id"
    WHERE v."id" = "videoId" AND ps."profileId" = auth.uid()
  )
);

-- Listeners can view transcripts of accessible videos
CREATE POLICY "Listeners can view transcripts of accessible videos"
ON public."VideoTranscript"
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public."Video" v
    WHERE v."id" = "videoId"
      AND EXISTS (
        SELECT 1 FROM public."ProfileListener" pl
        WHERE pl."listenerId" = auth.uid()
          AND pl."sharerId" = v."profileSharerId"
          AND pl."hasAccess" = TRUE
      )
  )
);

-- ==========================================================
-- Table: PromptResponseAttachment
-- ==========================================================
ALTER TABLE public."PromptResponseAttachment" ENABLE ROW LEVEL SECURITY;

-- Admin Policy
CREATE POLICY "Admins can do anything on PromptResponseAttachment"
ON public."PromptResponseAttachment"
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Sharers can access their own attachments
CREATE POLICY "Sharers can access their own attachments"
ON public."PromptResponseAttachment"
FOR ALL
USING (
  "profileSharerId" = (
    SELECT "id" FROM public."ProfileSharer" WHERE "profileId" = auth.uid()
  )
)
WITH CHECK (
  "profileSharerId" = (
    SELECT "id" FROM public."ProfileSharer" WHERE "profileId" = auth.uid()
  )
);

-- Listeners can view attachments from accessible prompt responses
CREATE POLICY "Listeners can view attachments from accessible prompt responses"
ON public."PromptResponseAttachment"
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public."PromptResponse" pr
    WHERE pr."id" = "promptResponseId"
      AND pr."privacyLevel" = 'Public'
      AND EXISTS (
        SELECT 1 FROM public."ProfileListener" pl
        WHERE pl."listenerId" = auth.uid()
          AND pl."sharerId" = pr."profileSharerId"
          AND pl."hasAccess" = TRUE
      )
  )
);

-- ==========================================================
-- Table: Object
-- ==========================================================
ALTER TABLE public."Object" ENABLE ROW LEVEL SECURITY;

-- Admin Policy
CREATE POLICY "Admins can do anything on Object"
ON public."Object"
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Sharers can insert objects
CREATE POLICY "Sharers can insert objects"
ON public."Object"
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public."ProfileRole"
    WHERE "profileId" = auth.uid() AND "role" = 'SHARER'
  ) AND
  (
    "userId" = auth.uid()
    OR
    (
      "promptResponseId" IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM public."PromptResponse" pr
        JOIN public."ProfileSharer" ps ON pr."profileSharerId" = ps."id"
        WHERE pr."id" = "promptResponseId" AND ps."profileId" = auth.uid()
      )
    )
  )
);

-- Sharers can access their own objects
CREATE POLICY "Sharers can access their own objects"
ON public."Object"
FOR SELECT
USING (
  "userId" = auth.uid()
  OR
  (
    "promptResponseId" IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public."PromptResponse" pr
      JOIN public."ProfileSharer" ps ON pr."profileSharerId" = ps."id"
      WHERE pr."id" = "promptResponseId" AND ps."profileId" = auth.uid()
    )
  )
);

CREATE POLICY "Sharers can update their own objects"
ON public."Object"
FOR UPDATE
USING (
  "userId" = auth.uid()
  OR
  (
    "promptResponseId" IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public."PromptResponse" pr
      JOIN public."ProfileSharer" ps ON pr."profileSharerId" = ps."id"
      WHERE pr."id" = "promptResponseId" AND ps."profileId" = auth.uid()
    )
  )
)
WITH CHECK (
  "userId" = auth.uid()
  OR
  (
    "promptResponseId" IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public."PromptResponse" pr
      JOIN public."ProfileSharer" ps ON pr."profileSharerId" = ps."id"
      WHERE pr."id" = "promptResponseId" AND ps."profileId" = auth.uid()
    )
  )
);

CREATE POLICY "Sharers can delete their own objects"
ON public."Object"
FOR DELETE
USING (
  "userId" = auth.uid()
  OR
  (
    "promptResponseId" IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public."PromptResponse" pr
      JOIN public."ProfileSharer" ps ON pr."profileSharerId" = ps."id"
      WHERE pr."id" = "promptResponseId" AND ps."profileId" = auth.uid()
    )
  )
);

-- Listeners can view objects from accessible prompt responses
CREATE POLICY "Listeners can view objects from accessible prompt responses"
ON public."Object"
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public."PromptResponse" pr
    WHERE pr."id" = "promptResponseId"
      AND pr."privacyLevel" = 'Public'
      AND EXISTS (
        SELECT 1 FROM public."ProfileListener" pl
        WHERE pl."listenerId" = auth.uid()
          AND pl."sharerId" = pr."profileSharerId"
          AND pl."hasAccess" = TRUE
      )
  )
);

-- ==========================================================
-- Table: PromptResponseFavorite
-- ==========================================================
ALTER TABLE public."PromptResponseFavorite" ENABLE ROW LEVEL SECURITY;

-- Admin Policy
CREATE POLICY "Admins can do anything on PromptResponseFavorite"
ON public."PromptResponseFavorite"
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Users can access their own favorites
CREATE POLICY "Users can access their own favorites"
ON public."PromptResponseFavorite"
FOR ALL
USING ("profileId" = auth.uid())
WITH CHECK ("profileId" = auth.uid());

-- ==========================================================
-- Table: PromptResponseRecentlyWatched
-- ==========================================================
ALTER TABLE public."PromptResponseRecentlyWatched" ENABLE ROW LEVEL SECURITY;

-- Admin Policy
CREATE POLICY "Admins can do anything on PromptResponseRecentlyWatched"
ON public."PromptResponseRecentlyWatched"
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Users can access their own recently watched records
CREATE POLICY "Users can access their own recently watched records"
ON public."PromptResponseRecentlyWatched"
FOR ALL
USING ("profileId" = auth.uid())
WITH CHECK ("profileId" = auth.uid());

-- ==========================================================
-- Table: Purchase
-- ==========================================================
ALTER TABLE public."Purchase" ENABLE ROW LEVEL SECURITY;

-- Admin Policy
CREATE POLICY "Admins can do anything on Purchase"
ON public."Purchase"
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Users can access their own purchases
CREATE POLICY "Users can access their own purchases"
ON public."Purchase"
FOR ALL
USING ("userId" = auth.uid())
WITH CHECK ("userId" = auth.uid());

-- ==========================================================
-- Table: Subscription
-- ==========================================================
ALTER TABLE public."Subscription" ENABLE ROW LEVEL SECURITY;

-- Admin Policy
CREATE POLICY "Admins can do anything on Subscription"
ON public."Subscription"
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Users can access their own subscriptions
CREATE POLICY "Users can access their own subscriptions"
ON public."Subscription"
FOR ALL
USING ("userId" = auth.uid())
WITH CHECK ("userId" = auth.uid());

-- ==========================================================
-- Table: SubscriptionEntitlement
-- ==========================================================
ALTER TABLE public."SubscriptionEntitlement" ENABLE ROW LEVEL SECURITY;

-- Admin Policy
CREATE POLICY "Admins can do anything on SubscriptionEntitlement"
ON public."SubscriptionEntitlement"
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Users can access their own subscription entitlements
CREATE POLICY "Users can access their own subscription entitlements"
ON public."SubscriptionEntitlement"
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public."Subscription" s
    WHERE s."id" = "subscriptionId" AND s."userId" = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public."Subscription" s
    WHERE s."id" = "subscriptionId" AND s."userId" = auth.uid()
  )
);

-- ==========================================================
-- Table: ResponsePermission
-- ==========================================================
ALTER TABLE public."ResponsePermission" ENABLE ROW LEVEL SECURITY;

-- Admin Policy
CREATE POLICY "Admins can do anything on ResponsePermission"
ON public."ResponsePermission"
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Users can access permissions assigned to them
CREATE POLICY "Users can access their own response permissions"
ON public."ResponsePermission"
FOR SELECT
USING ("userId" = auth.uid());

-- Sharers can manage permissions for their responses
CREATE POLICY "Sharers can insert permissions for their responses"
ON public."ResponsePermission"
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public."PromptResponse" pr
    JOIN public."ProfileSharer" ps ON pr."profileSharerId" = ps."id"
    WHERE pr."id" = "responseId" AND ps."profileId" = auth.uid()
  )
);

CREATE POLICY "Sharers can update permissions for their responses"
ON public."ResponsePermission"
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public."PromptResponse" pr
    JOIN public."ProfileSharer" ps ON pr."profileSharerId" = ps."id"
    WHERE pr."id" = "responseId" AND ps."profileId" = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public."PromptResponse" pr
    JOIN public."ProfileSharer" ps ON pr."profileSharerId" = ps."id"
    WHERE pr."id" = "responseId" AND ps."profileId" = auth.uid()
  )
);

CREATE POLICY "Sharers can delete permissions for their responses"
ON public."ResponsePermission"
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public."PromptResponse" pr
    JOIN public."ProfileSharer" ps ON pr."profileSharerId" = ps."id"
    WHERE pr."id" = "responseId" AND ps."profileId" = auth.uid()
  )
);

-- ==========================================================
-- Table: ThematicVideo
-- ==========================================================
ALTER TABLE public."ThematicVideo" ENABLE ROW LEVEL SECURITY;

-- Admin Policy
CREATE POLICY "Admins can do anything on ThematicVideo"
ON public."ThematicVideo"
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Sharers can access their own thematic videos
CREATE POLICY "Sharers can access their own thematic videos"
ON public."ThematicVideo"
FOR ALL
USING (
  "profileSharerId" = (
    SELECT "id" FROM public."ProfileSharer" WHERE "profileId" = auth.uid()
  )
)
WITH CHECK (
  "profileSharerId" = (
    SELECT "id" FROM public."ProfileSharer" WHERE "profileId" = auth.uid()
  )
);

-- Listeners can view thematic videos from sharers they follow
CREATE POLICY "Listeners can view thematic videos from sharers they follow"
ON public."ThematicVideo"
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public."ProfileListener" pl
    WHERE pl."listenerId" = auth.uid()
      AND pl."sharerId" = "profileSharerId"
      AND pl."hasAccess" = TRUE
  )
);

-- ==========================================================
-- Tables with Public Read Access (Admins Can Modify)
-- ==========================================================

-- Table: Entitlement
ALTER TABLE public."Entitlement" ENABLE ROW LEVEL SECURITY;

-- Admin Policy
CREATE POLICY "Admins can do anything on Entitlement"
ON public."Entitlement"
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Allow SELECT to all users
CREATE POLICY "Allow SELECT on entitlements to all users"
ON public."Entitlement"
FOR SELECT
USING (true);

-- Table: Product
ALTER TABLE public."Product" ENABLE ROW LEVEL SECURITY;

-- Admin Policy
CREATE POLICY "Admins can do anything on Product"
ON public."Product"
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Allow SELECT to all users
CREATE POLICY "Allow SELECT on products to all users"
ON public."Product"
FOR SELECT
USING (true);

-- Table: Package
ALTER TABLE public."Package" ENABLE ROW LEVEL SECURITY;

-- Admin Policy
CREATE POLICY "Admins can do anything on Package"
ON public."Package"
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Allow SELECT to all users
CREATE POLICY "Allow SELECT on packages to all users"
ON public."Package"
FOR SELECT
USING (true);

-- Table: Offering
ALTER TABLE public."Offering" ENABLE ROW LEVEL SECURITY;

-- Admin Policy
CREATE POLICY "Admins can do anything on Offering"
ON public."Offering"
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Allow SELECT to all users
CREATE POLICY "Allow SELECT on offerings to all users"
ON public."Offering"
FOR SELECT
USING (true);

-- Table: PromptCategory
ALTER TABLE public."PromptCategory" ENABLE ROW LEVEL SECURITY;

-- Admin Policy
CREATE POLICY "Admins can do anything on PromptCategory"
ON public."PromptCategory"
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Allow SELECT to all users
CREATE POLICY "Allow SELECT on prompt categories to all users"
ON public."PromptCategory"
FOR SELECT
USING (true);

-- Table: Prompt
ALTER TABLE public."Prompt" ENABLE ROW LEVEL SECURITY;

-- Admin Policy
CREATE POLICY "Admins can do anything on Prompt"
ON public."Prompt"
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Allow SELECT to all users
CREATE POLICY "Allow SELECT on prompts to all users"
ON public."Prompt"
FOR SELECT
USING (true);

-- Table: ObjectCategory
ALTER TABLE public."ObjectCategory" ENABLE ROW LEVEL SECURITY;

-- Admin Policy
CREATE POLICY "Admins can do anything on ObjectCategory"
ON public."ObjectCategory"
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Allow SELECT to all users
CREATE POLICY "Allow SELECT on object categories to all users"
ON public."ObjectCategory"
FOR SELECT
USING (true);

-- ==========================================================
-- Full-Text Search Setup
-- ==========================================================

-- Alter Tables to Add tsvector Columns
ALTER TABLE public."Prompt"
ADD COLUMN IF NOT EXISTS "search_vector" tsvector;

ALTER TABLE public."PromptResponse"
ADD COLUMN IF NOT EXISTS "search_vector" tsvector;

-- Populate tsvector Columns
UPDATE public."Prompt"
SET "search_vector" = to_tsvector('english', coalesce("promptText", ''));

UPDATE public."PromptResponse"
SET "search_vector" = to_tsvector('english', coalesce("responseNotes", ''));

-- Create Functions and Triggers to Update tsvector on Data Change

-- For Prompt
CREATE OR REPLACE FUNCTION update_prompt_search_vector() RETURNS TRIGGER AS $$
BEGIN
    NEW."search_vector" := to_tsvector('english', coalesce(NEW."promptText", ''));
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER prompt_search_vector_update
BEFORE INSERT OR UPDATE ON public."Prompt"
FOR EACH ROW EXECUTE FUNCTION update_prompt_search_vector();

-- For PromptResponse
CREATE OR REPLACE FUNCTION update_prompt_response_search_vector() RETURNS TRIGGER AS $$
BEGIN
    NEW."search_vector" := to_tsvector('english', coalesce(NEW."responseNotes", ''));
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER prompt_response_search_vector_update
BEFORE INSERT OR UPDATE ON public."PromptResponse"
FOR EACH ROW EXECUTE FUNCTION update_prompt_response_search_vector();

-- Create GIN Indexes
CREATE INDEX IF NOT EXISTS prompt_search_idx ON public."Prompt" USING GIN ("search_vector");
CREATE INDEX IF NOT EXISTS prompt_response_search_idx ON public."PromptResponse" USING GIN ("search_vector");

-- ==========================================================
-- Progress Calculation Function
-- ==========================================================

-- Function to Calculate Sharer's Progress on a Topic
CREATE OR REPLACE FUNCTION get_sharer_topic_progress(sharer_profile_id UUID, topic_id UUID)
RETURNS TABLE(
  total_prompts INT,
  completed_prompts INT,
  progress_percent DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    total.count AS total_prompts,
    completed.count AS completed_prompts,
    CASE
      WHEN total.count = 0 THEN 0
      ELSE (completed.count::DECIMAL / total.count::DECIMAL) * 100
    END AS progress_percent
  FROM
    (SELECT COUNT(*) FROM public."Prompt" p WHERE p."promptCategoryId" = topic_id) AS total,
    (SELECT COUNT(*) FROM public."PromptResponse" pr
     JOIN public."Prompt" p ON pr."promptId" = p."id"
     WHERE pr."profileSharerId" = (
       SELECT "id" FROM public."ProfileSharer" WHERE "profileId" = sharer_profile_id
     )
       AND p."promptCategoryId" = topic_id
    ) AS completed;
END;
$$ LANGUAGE plpgsql STABLE;

-- ==========================================================
-- New User Creation Trigger
-- ==========================================================

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public."Profile" (id, email, "firstName", "lastName", phone)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'firstName',
    NEW.raw_user_meta_data->>'lastName',
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the handle_new_user function
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================================
-- Final Notes
-- ==========================================================

-- Ensure that all identifiers are correctly quoted to handle case sensitivity.
-- Update any paths or identifiers as per your actual schema if they differ.
-- Test all policies and functions to ensure they work as expected.
-- Remember to replace placeholder values like 'sharer_profile_id' and 'topic_id' with actual IDs when calling functions.

-- ***********************************************************************
-- *                            End of SQL File                          *
-- ***********************************************************************