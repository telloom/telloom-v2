-- Create a function to create a ProfileExecutor record with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.create_profile_executor(
  p_executor_id UUID,
  p_sharer_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Log the function call
  RAISE LOG 'create_profile_executor() called with executor_id: %, sharer_id: %', 
    p_executor_id, p_sharer_id;

  -- Check if the relationship already exists
  SELECT id INTO v_id
  FROM "ProfileExecutor"
  WHERE "executorId" = p_executor_id
  AND "sharerId" = p_sharer_id;

  -- If it exists, return the existing ID
  IF v_id IS NOT NULL THEN
    RAISE LOG 'ProfileExecutor relationship already exists with id: %', v_id;
    RETURN v_id;
  END IF;

  -- Insert new ProfileExecutor record
  INSERT INTO "ProfileExecutor" (
    "executorId",
    "sharerId",
    "createdAt",
    "updatedAt"
  )
  VALUES (
    p_executor_id,
    p_sharer_id,
    v_now,
    v_now
  )
  RETURNING id INTO v_id;

  RAISE LOG 'Created new ProfileExecutor with id: %', v_id;
  RETURN v_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in create_profile_executor: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_profile_executor TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_profile_executor TO service_role; 