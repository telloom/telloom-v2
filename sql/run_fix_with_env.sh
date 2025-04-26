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

# Extract project reference and set up database connection
SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
PROJECT_REF=$(echo $SUPABASE_URL | awk -F'/' '{print $3}' | awk -F'.' '{print $1}')
echo "Applying SQL fix to project: $PROJECT_REF"

# Set PostgreSQL environment variables
export PGUSER=postgres
export PGPASSWORD=$SUPABASE_SERVICE_ROLE_KEY
export PGHOST=db.$PROJECT_REF.supabase.co
export PGDATABASE=postgres

echo "Database connection: $PGHOST as $PGUSER"
echo "Starting SQL fix application..."

# Apply the fix
psql -f sql/fix_infinite_recursion.sql

if [ $? -eq 0 ]; then
  echo "✅ SQL fix for infinite recursion applied successfully!"
  echo "Now restart your app to load the updated database functions."
else
  echo "❌ Error applying SQL fix."
  exit 1
fi 