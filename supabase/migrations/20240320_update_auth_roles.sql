-- Drop existing policies and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO postgres;
GRANT ALL ON auth.users TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO postgres;

-- Add permissions for authenticator role
GRANT USAGE ON SCHEMA auth TO authenticator;
GRANT ALL ON auth.users TO authenticator;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO authenticator;

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public."Profile" TO authenticated;
GRANT ALL ON public."ProfileRole" TO authenticated;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON public."Profile" TO anon;
GRANT ALL ON public."ProfileRole" TO anon;

-- Create function to handle new user creation with role assignment
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_now timestamptz;
  v_profile_id uuid;
  v_role_id uuid;
BEGIN
  -- Log the start of the function and the input data with more detail
  RAISE LOG 'handle_new_user() started for user % (%) with metadata: %', 
    new.email,
    new.id, 
    new.raw_user_meta_data;

  -- Set variables
  v_now := now();
  v_profile_id := new.id;
  v_role_id := gen_random_uuid();

  BEGIN
    -- Create Profile record with minimal required fields
    RAISE LOG 'Creating Profile record for user % with email %', new.id, new.email;
    
    INSERT INTO public."Profile" (
      id,
      email,
      createdAt,
      updatedAt
    )
    VALUES (
      v_profile_id,
      new.email,
      v_now,
      v_now
    );
    
    RAISE LOG 'Profile record created successfully for user %', new.id;

    -- Create initial ProfileRole record (LISTENER)
    RAISE LOG 'Creating ProfileRole record for user % with role LISTENER', new.id;
    
    INSERT INTO public."ProfileRole" (
      id,
      profileId,
      role
    )
    VALUES (
      v_role_id,
      v_profile_id,
      'LISTENER'
    );
    
    RAISE LOG 'ProfileRole record created successfully for user %', new.id;
    RAISE LOG 'handle_new_user() completed successfully for user %', new.id;
    
    RETURN new;
  EXCEPTION
    WHEN OTHERS THEN
      -- Enhanced error logging
      RAISE LOG 'Error in handle_new_user() for user % (%)', new.email, new.id;
      RAISE LOG 'Error details - Code: %, Message: %, State: %', SQLSTATE, SQLERRM, SQLSTATE;
      RAISE LOG 'Error context - Detail: %, Hint: %', ERRDETAIL, ERRHINT;
      
      -- Re-raise the error to ensure it's not silently swallowed
      RAISE EXCEPTION 'Failed to create user profile: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
  END;
END;
$$;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Update Profile policies
DROP POLICY IF EXISTS "Users can view own profile" ON "Profile";
DROP POLICY IF EXISTS "Users can update own profile" ON "Profile";
DROP POLICY IF EXISTS "Users can insert own profile" ON "Profile";

CREATE POLICY "Users can view own profile"
ON "Profile"
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON "Profile"
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON "Profile"
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Update ProfileRole policies
DROP POLICY IF EXISTS "Users can view own roles" ON "ProfileRole";
DROP POLICY IF EXISTS "Users can insert own roles" ON "ProfileRole";
DROP POLICY IF EXISTS "Users can update own roles" ON "ProfileRole";
DROP POLICY IF EXISTS "Users can delete own roles" ON "ProfileRole";

CREATE POLICY "Users can view own roles"
ON "ProfileRole"
FOR SELECT
USING (auth.uid() = "profileId");

CREATE POLICY "Users can insert own roles"
ON "ProfileRole"
FOR INSERT
WITH CHECK (auth.uid() = "profileId");

CREATE POLICY "Users can update own roles"
ON "ProfileRole"
FOR UPDATE
USING (auth.uid() = "profileId")
WITH CHECK (auth.uid() = "profileId");

CREATE POLICY "Users can delete own roles"
ON "ProfileRole"
FOR DELETE
USING (auth.uid() = "profileId");

-- Enable RLS
ALTER TABLE public."Profile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ProfileRole" ENABLE ROW LEVEL SECURITY;

-- Update ProfileSharer policies
DROP POLICY IF EXISTS "Users can manage own sharer profile" ON "ProfileSharer";

CREATE POLICY "Users can view own sharer profile"
ON "ProfileSharer"
FOR SELECT
USING (auth.uid() = "profileId");

CREATE POLICY "Users can insert own sharer profile"
ON "ProfileSharer"
FOR INSERT
WITH CHECK (auth.uid() = "profileId");

CREATE POLICY "Users can update own sharer profile"
ON "ProfileSharer"
FOR UPDATE
USING (auth.uid() = "profileId")
WITH CHECK (auth.uid() = "profileId");

CREATE POLICY "Users can delete own sharer profile"
ON "ProfileSharer"
FOR DELETE
USING (auth.uid() = "profileId");

-- Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM "ProfileRole"
    WHERE "profileId" = user_id
    AND role = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create admin policies for all tables
CREATE POLICY "Admins can do anything"
ON "Profile"
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can do anything"
ON "ProfileRole"
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can do anything"
ON "ProfileSharer"
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Create invitation system policies
DROP POLICY IF EXISTS "Users can view own invitations" ON "Invitation";
DROP POLICY IF EXISTS "Users can create invitations" ON "Invitation";
DROP POLICY IF EXISTS "Users can update own invitations" ON "Invitation";

CREATE POLICY "Users can view own invitations"
ON "Invitation"
FOR SELECT
USING (
  auth.uid() = "inviterId" OR 
  auth.uid() IN (
    SELECT id FROM "Profile" WHERE email = "inviteeEmail"
  )
);

CREATE POLICY "Users can create invitations"
ON "Invitation"
FOR INSERT
WITH CHECK (
  auth.uid() = "inviterId" AND
  EXISTS (
    SELECT 1 FROM "ProfileSharer"
    WHERE "profileId" = auth.uid()
    AND id = "sharerId"
  )
);

CREATE POLICY "Users can update own invitations"
ON "Invitation"
FOR UPDATE
USING (
  auth.uid() = "inviterId" OR
  auth.uid() IN (
    SELECT id FROM "Profile" WHERE email = "inviteeEmail"
  )
)
WITH CHECK (
  auth.uid() = "inviterId" OR
  auth.uid() IN (
    SELECT id FROM "Profile" WHERE email = "inviteeEmail"
  )
);

-- Create function to handle invitation acceptance
CREATE OR REPLACE FUNCTION public.handle_invitation_acceptance(invitation_id uuid)
RETURNS void AS $$
DECLARE
  v_invitation "Invitation"%ROWTYPE;
BEGIN
  -- Get invitation details
  SELECT * INTO v_invitation
  FROM "Invitation"
  WHERE id = invitation_id
  AND status = 'PENDING'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or already processed invitation';
  END IF;

  -- Update invitation status
  UPDATE "Invitation"
  SET status = 'ACCEPTED',
      "acceptedAt" = now()
  WHERE id = invitation_id;

  -- Create appropriate relationship based on role
  IF v_invitation.role = 'EXECUTOR' THEN
    INSERT INTO "ProfileExecutor" ("sharerId", "executorId", "createdAt")
    VALUES (v_invitation."sharerId", auth.uid(), now());
  ELSIF v_invitation.role = 'LISTENER' THEN
    INSERT INTO "ProfileListener" ("sharerId", "listenerId", "sharedSince", "hasAccess", "createdAt")
    VALUES (v_invitation."sharerId", auth.uid(), now(), true, now());
  END IF;

  -- Add role if not exists
  INSERT INTO "ProfileRole" ("profileId", "role", "createdAt")
  VALUES (auth.uid(), v_invitation.role, now())
  ON CONFLICT ("profileId", "role") DO NOTHING;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 