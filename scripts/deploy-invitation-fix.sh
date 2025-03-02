#!/bin/bash

# Script to deploy the invitation fix to Supabase
# This script adds the find_invitation_by_id function to bypass RLS issues

echo "Deploying invitation fix to Supabase..."

# Extract the function definition from functions.sql
FUNCTION_SQL=$(cat <<EOF
-- Function to find invitation by ID and token
CREATE OR REPLACE FUNCTION public.find_invitation_by_id(invitation_id uuid, invitation_token text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER
AS \$\$
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
\$\$;
EOF
)

# Save to a temporary file
echo "$FUNCTION_SQL" > /tmp/invitation-fix.sql

# Deploy using Supabase CLI
echo "Running SQL with Supabase CLI..."
npx supabase functions deploy

# Or alternatively, you can use the Supabase dashboard to run this SQL
echo "Alternatively, you can run this SQL in the Supabase dashboard SQL editor:"
echo "$FUNCTION_SQL"

echo "Deployment complete!" 