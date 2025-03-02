-- Function to get policies for a table
CREATE OR REPLACE FUNCTION public.get_policies_for_table(table_name text)
RETURNS TABLE (
  policyname name,
  tablename name,
  schemaname name,
  roles name[],
  cmd text,
  qual text,
  with_check text
) LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.policyname,
    p.tablename,
    p.schemaname,
    p.roles,
    p.cmd,
    p.qual,
    p.with_check
  FROM
    pg_policies p
  WHERE
    p.tablename = table_name;
END;
$$;

-- Function to insert a test invitation
CREATE OR REPLACE FUNCTION public.insert_test_invitation(token_value text, invitee_email text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result json;
  sharer_id uuid;
  inviter_id uuid;
BEGIN
  -- Get a valid sharer ID
  SELECT id INTO sharer_id FROM "ProfileSharer" LIMIT 1;
  
  -- Get a valid inviter ID (using the same as sharer for simplicity)
  inviter_id := sharer_id;
  
  -- Insert the invitation with SECURITY DEFINER to bypass RLS
  INSERT INTO "Invitation" (
    "token",
    "inviteeEmail",
    "sharerId",
    "inviterId",
    "status",
    "role",
    "createdAt",
    "updatedAt"
  ) VALUES (
    token_value,
    invitee_email,
    sharer_id,
    inviter_id,
    'PENDING',
    'LISTENER',
    NOW(),
    NOW()
  );
  
  -- Return success
  result := json_build_object(
    'success', true,
    'message', 'Test invitation created successfully',
    'token', token_value,
    'sharerId', sharer_id,
    'inviterId', inviter_id
  );
  
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  -- Return error
  result := json_build_object(
    'success', false,
    'message', 'Failed to create test invitation',
    'error', SQLERRM,
    'errorCode', SQLSTATE
  );
  
  RETURN result;
END;
$$;

-- Function to get all invitations
CREATE OR REPLACE FUNCTION public.get_all_invitations()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result json;
  invitations json;
BEGIN
  -- Get all invitations
  SELECT json_agg(inv) INTO invitations
  FROM "Invitation" inv;
  
  -- Return success
  result := json_build_object(
    'success', true,
    'invitations', COALESCE(invitations, '[]'::json)
  );
  
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  -- Return error
  result := json_build_object(
    'success', false,
    'message', 'Failed to get invitations',
    'error', SQLERRM,
    'errorCode', SQLSTATE
  );
  
  RETURN result;
END;
$$;

-- Function to create a test invitation
CREATE OR REPLACE FUNCTION public.create_test_invitation(token_value text, invitee_email text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result json;
  sharer_id uuid;
  inviter_id uuid;
BEGIN
  -- Get a valid sharer ID
  SELECT id INTO sharer_id FROM "ProfileSharer" LIMIT 1;
  
  -- Get a valid inviter ID (using the same as sharer for simplicity)
  inviter_id := sharer_id;
  
  -- Check if invitation with this token already exists
  IF EXISTS (SELECT 1 FROM "Invitation" WHERE "token" = token_value) THEN
    -- Return existing invitation
    SELECT json_build_object(
      'success', true,
      'message', 'Invitation with this token already exists',
      'token', token_value,
      'exists', true
    ) INTO result;
    
    RETURN result;
  END IF;
  
  -- Insert the invitation with SECURITY DEFINER to bypass RLS
  INSERT INTO "Invitation" (
    "token",
    "inviteeEmail",
    "sharerId",
    "inviterId",
    "status",
    "role",
    "createdAt",
    "updatedAt"
  ) VALUES (
    token_value,
    invitee_email,
    sharer_id,
    inviter_id,
    'PENDING',
    'LISTENER',
    NOW(),
    NOW()
  );
  
  -- Return success
  result := json_build_object(
    'success', true,
    'message', 'Test invitation created successfully',
    'token', token_value,
    'sharerId', sharer_id,
    'inviterId', inviter_id,
    'exists', false
  );
  
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  -- Return error
  result := json_build_object(
    'success', false,
    'message', 'Failed to create test invitation',
    'error', SQLERRM,
    'errorCode', SQLSTATE
  );
  
  RETURN result;
END;
$$;

-- Function to get table schema
CREATE OR REPLACE FUNCTION public.get_table_schema(table_name text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result json;
  columns json;
BEGIN
  -- Get table columns
  SELECT json_agg(
    json_build_object(
      'column_name', c.column_name,
      'data_type', c.data_type,
      'is_nullable', c.is_nullable,
      'column_default', c.column_default
    )
  ) INTO columns
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
  AND c.table_name = get_table_schema.table_name;
  
  -- Return success
  result := json_build_object(
    'success', true,
    'table_name', table_name,
    'columns', COALESCE(columns, '[]'::json)
  );
  
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  -- Return error
  result := json_build_object(
    'success', false,
    'message', 'Failed to get table schema',
    'error', SQLERRM,
    'errorCode', SQLSTATE
  );
  
  RETURN result;
END;
$$;

-- Function to check if a column exists
CREATE OR REPLACE FUNCTION public.check_column_exists(table_name text, column_name text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result json;
  column_exists boolean;
BEGIN
  -- Check if column exists
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
    AND c.table_name = check_column_exists.table_name
    AND c.column_name = check_column_exists.column_name
  ) INTO column_exists;
  
  -- Return result
  result := json_build_object(
    'success', true,
    'table_name', table_name,
    'column_name', column_name,
    'exists', column_exists
  );
  
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  -- Return error
  result := json_build_object(
    'success', false,
    'message', 'Failed to check column existence',
    'error', SQLERRM,
    'errorCode', SQLSTATE
  );
  
  RETURN result;
END;
$$;

-- Function to check case sensitivity
CREATE OR REPLACE FUNCTION public.check_case_sensitivity(table_name text, column_name text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result json;
  test_value text := 'TestValue';
  lowercase_match boolean;
  uppercase_match boolean;
  mixed_case_match boolean;
BEGIN
  -- Insert a test row
  EXECUTE format('
    WITH test_data AS (
      SELECT %L::text AS test_value
    )
    SELECT 
      EXISTS(SELECT 1 FROM %I WHERE %I = %L),
      EXISTS(SELECT 1 FROM %I WHERE %I = %L),
      EXISTS(SELECT 1 FROM %I WHERE %I = %L)
  ', 
    test_value, 
    table_name, column_name, LOWER(test_value),
    table_name, column_name, UPPER(test_value),
    table_name, column_name, test_value
  ) INTO lowercase_match, uppercase_match, mixed_case_match;
  
  -- Return result
  result := json_build_object(
    'success', true,
    'table_name', table_name,
    'column_name', column_name,
    'test_value', test_value,
    'lowercase_match', lowercase_match,
    'uppercase_match', uppercase_match,
    'mixed_case_match', mixed_case_match,
    'is_case_sensitive', (NOT lowercase_match OR NOT uppercase_match) AND mixed_case_match
  );
  
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  -- Return error
  result := json_build_object(
    'success', false,
    'message', 'Failed to check case sensitivity',
    'error', SQLERRM,
    'errorCode', SQLSTATE
  );
  
  RETURN result;
END;
$$;

-- Function to find invitation by token (exact match)
CREATE OR REPLACE FUNCTION public.find_invitation_by_token(token_value text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result json;
  invitation json;
BEGIN
  -- Find invitation by token (exact match)
  SELECT row_to_json(inv) INTO invitation
  FROM "Invitation" inv
  WHERE inv."token" = token_value;
  
  -- Return result
  result := json_build_object(
    'success', true,
    'token', token_value,
    'invitation', invitation,
    'found', invitation IS NOT NULL
  );
  
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  -- Return error
  result := json_build_object(
    'success', false,
    'message', 'Failed to find invitation',
    'error', SQLERRM,
    'errorCode', SQLSTATE
  );
  
  RETURN result;
END;
$$;

-- Function to find invitation by token (case-insensitive)
CREATE OR REPLACE FUNCTION public.find_invitation_by_token_case_insensitive(token_value text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result json;
  invitation json;
BEGIN
  -- Find invitation by token (case-insensitive)
  SELECT row_to_json(inv) INTO invitation
  FROM "Invitation" inv
  WHERE LOWER(inv."token") = LOWER(token_value);
  
  -- Return result
  result := json_build_object(
    'success', true,
    'token', token_value,
    'invitation', invitation,
    'found', invitation IS NOT NULL
  );
  
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  -- Return error
  result := json_build_object(
    'success', false,
    'message', 'Failed to find invitation',
    'error', SQLERRM,
    'errorCode', SQLSTATE
  );
  
  RETURN result;
END;
$$;

-- Function to list tables
CREATE OR REPLACE FUNCTION public.list_tables()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result json;
  tables json;
BEGIN
  -- Get all tables in the public schema
  SELECT json_agg(
    json_build_object(
      'tablename', t.tablename,
      'tableowner', t.tableowner,
      'hasindexes', t.hasindexes,
      'hasrules', t.hasrules,
      'hastriggers', t.hastriggers
    )
  ) INTO tables
  FROM pg_catalog.pg_tables t
  WHERE t.schemaname = 'public';
  
  -- Return success
  result := json_build_object(
    'success', true,
    'tables', COALESCE(tables, '[]'::json)
  );
  
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  -- Return error
  result := json_build_object(
    'success', false,
    'message', 'Failed to list tables',
    'error', SQLERRM,
    'errorCode', SQLSTATE
  );
  
  RETURN result;
END;
$$;

-- Function to find invitation by ID and token
CREATE OR REPLACE FUNCTION public.find_invitation_by_id(invitation_id uuid, invitation_token text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result json;
  invitation json;
BEGIN
  -- Find invitation by ID and token
  SELECT row_to_json(inv) INTO invitation
  FROM "Invitation" inv
  WHERE inv."id" = invitation_id
  AND inv."token" = invitation_token;
  
  -- Return result
  result := json_build_object(
    'success', true,
    'id', invitation_id,
    'token', invitation_token,
    'invitation', invitation,
    'found', invitation IS NOT NULL
  );
  
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  -- Return error
  result := json_build_object(
    'success', false,
    'message', 'Failed to find invitation',
    'error', SQLERRM,
    'errorCode', SQLSTATE
  );
  
  RETURN result;
END;
$$; 