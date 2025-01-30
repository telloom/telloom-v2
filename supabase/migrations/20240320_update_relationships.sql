-- Update ProfileExecutor policies
DROP POLICY IF EXISTS "Users can view executor relationships" ON "ProfileExecutor";
DROP POLICY IF EXISTS "Users can manage executor relationships" ON "ProfileExecutor";

CREATE POLICY "Users can view executor relationships"
ON "ProfileExecutor"
FOR SELECT
USING (
  auth.uid() IN (
    SELECT "profileId"
    FROM "ProfileSharer"
    WHERE id = "sharerId"
  ) OR
  auth.uid() = "executorId"
);

CREATE POLICY "Users can manage executor relationships"
ON "ProfileExecutor"
FOR ALL
USING (
  auth.uid() IN (
    SELECT "profileId"
    FROM "ProfileSharer"
    WHERE id = "sharerId"
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT "profileId"
    FROM "ProfileSharer"
    WHERE id = "sharerId"
  )
);

-- Update ProfileListener policies
DROP POLICY IF EXISTS "Users can view listener relationships" ON "ProfileListener";
DROP POLICY IF EXISTS "Users can manage listener relationships" ON "ProfileListener";

CREATE POLICY "Users can view listener relationships"
ON "ProfileListener"
FOR SELECT
USING (
  auth.uid() IN (
    SELECT "profileId"
    FROM "ProfileSharer"
    WHERE id = "sharerId"
  ) OR
  auth.uid() = "listenerId"
);

CREATE POLICY "Users can manage listener relationships"
ON "ProfileListener"
FOR ALL
USING (
  auth.uid() IN (
    SELECT "profileId"
    FROM "ProfileSharer"
    WHERE id = "sharerId"
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT "profileId"
    FROM "ProfileSharer"
    WHERE id = "sharerId"
  )
);

-- Create helper function to check if user has role
CREATE OR REPLACE FUNCTION public.has_role(user_id uuid, role_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM "ProfileRole"
    WHERE "profileId" = user_id
    AND role = role_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to check if user is executor for sharer
CREATE OR REPLACE FUNCTION public.is_executor_for(executor_id uuid, sharer_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM "ProfileExecutor"
    WHERE "executorId" = executor_id
    AND "sharerId" = sharer_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to check if user is listener for sharer
CREATE OR REPLACE FUNCTION public.is_listener_for(listener_id uuid, sharer_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM "ProfileListener"
    WHERE "listenerId" = listener_id
    AND "sharerId" = sharer_id
    AND "hasAccess" = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to revoke executor access
CREATE OR REPLACE FUNCTION public.revoke_executor_access(executor_id uuid, sharer_id uuid)
RETURNS void AS $$
BEGIN
  -- Delete executor relationship
  DELETE FROM "ProfileExecutor"
  WHERE "executorId" = executor_id
  AND "sharerId" = sharer_id;

  -- Remove executor role if no other relationships exist
  IF NOT EXISTS (
    SELECT 1
    FROM "ProfileExecutor"
    WHERE "executorId" = executor_id
  ) THEN
    DELETE FROM "ProfileRole"
    WHERE "profileId" = executor_id
    AND role = 'EXECUTOR';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to revoke listener access
CREATE OR REPLACE FUNCTION public.revoke_listener_access(listener_id uuid, sharer_id uuid)
RETURNS void AS $$
BEGIN
  -- Update listener relationship to remove access
  UPDATE "ProfileListener"
  SET "hasAccess" = false,
      "updatedAt" = now()
  WHERE "listenerId" = listener_id
  AND "sharerId" = sharer_id;

  -- Remove listener role if no other relationships exist with access
  IF NOT EXISTS (
    SELECT 1
    FROM "ProfileListener"
    WHERE "listenerId" = listener_id
    AND "hasAccess" = true
  ) THEN
    DELETE FROM "ProfileRole"
    WHERE "profileId" = listener_id
    AND role = 'LISTENER';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 