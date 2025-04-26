#!/bin/bash

# Script to apply RPC functions to the database
# Must be run with credentials available in environment variables

# Check if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "Error: Missing environment variables. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
  exit 1
fi

# Extract project reference from SUPABASE_URL
PROJECT_REF=$(echo $SUPABASE_URL | awk -F'/' '{print $3}' | awk -F'.' '{print $1}')
echo "Applying RPC functions to project: $PROJECT_REF"

# Function to execute SQL and handle errors
execute_sql() {
  local sql_file=$1
  echo "Applying SQL from $sql_file..."
  
  # Get the database password from the service role key
  # This assumes the service role key format used by Supabase
  DB_PASSWORD=$SUPABASE_SERVICE_ROLE_KEY
  
  # Execute the SQL using psql
  PGPASSWORD=$DB_PASSWORD psql -h db.$PROJECT_REF.supabase.co -U postgres -d postgres -f $sql_file
  
  if [ $? -eq 0 ]; then
    echo "Successfully applied $sql_file"
  else
    echo "Error applying $sql_file"
    exit 1
  fi
}

# Main execution
echo "Starting SQL application process..."

# Apply RPC functions
execute_sql "sql/create_rpc_functions.sql"

# Apply fix for infinite recursion
execute_sql "sql/fix_infinite_recursion.sql"

echo "All SQL functions applied successfully!" 