#!/bin/bash

# Load environment variables from .env and .env.local
if [ -f ".env" ]; then
  echo "Loading variables from .env file..."
  export $(grep -v '^#' .env | xargs)
fi

if [ -f ".env.local" ]; then
  echo "Loading variables from .env.local file..."
  export $(grep -v '^#' .env.local | xargs)
fi

# Check if required Supabase environment variables are set
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "Error: Missing Supabase environment variables."
  echo "Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env or .env.local files."
  exit 1
fi

# Extract project reference
PROJECT_REF=$(echo $NEXT_PUBLIC_SUPABASE_URL | awk -F'/' '{print $3}' | awk -F'.' '{print $1}')
echo "Applying SQL fix to Supabase project: $PROJECT_REF"

# Create a temporary SQL file with database fixes
TMP_SQL_FILE=$(mktemp)
cat sql/fix_infinite_recursion.sql > $TMP_SQL_FILE

echo "Executing SQL fix using Supabase CLI..."
supabase db execute --project-ref $PROJECT_REF --password $SUPABASE_SERVICE_ROLE_KEY --file $TMP_SQL_FILE

if [ $? -eq 0 ]; then
  echo "✅ SQL fix for infinite recursion applied successfully!"
  echo "Now restart your app to load the updated database functions."
else
  echo "❌ Error applying SQL fix."
fi

# Clean up
rm $TMP_SQL_FILE 