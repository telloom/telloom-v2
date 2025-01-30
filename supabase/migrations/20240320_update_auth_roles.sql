-- Drop existing policies and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create function to handle new user creation with role assignment
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create Profile record
  INSERT INTO public."Profile" (
    id,
    email,
    firstName,
    lastName,
    createdAt,
    updatedAt
  )
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'firstName',
    new.raw_user_meta_data->>'lastName',
    now(),
    now()
  );

  -- Assign initial LISTENER role
  INSERT INTO public."ProfileRole" (
    profileId,
    role,
    createdAt
  )
  VALUES (
    new.id,
    'LISTENER',
    now()
  );

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

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