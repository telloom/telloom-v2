#!/bin/bash

# Script to apply SQL fixes for RLS and missing functions

# Environment variables check
if [ -z "$DATABASE_URL" ]; then
  # Try to load from .env file if it exists
  if [ -f ".env" ]; then
    echo "Loading environment from .env file..."
    export $(grep -v '^#' .env | xargs)
  elif [ -f ".env.local" ]; then
    echo "Loading environment from .env.local file..."
    export $(grep -v '^#' .env.local | xargs)
  else
    echo "Error: DATABASE_URL environment variable is not set."
    echo "Please set DATABASE_URL or create a .env/.env.local file."
    exit 1
  fi
fi

# Extract database connection details from DATABASE_URL
if [[ $DATABASE_URL == postgresql://* ]]; then
  # Format: postgresql://username:password@hostname:port/database
  DB_USER=$(echo $DATABASE_URL | sed -E 's/^postgresql:\/\/([^:]+).*/\1/')
  DB_PASSWORD=$(echo $DATABASE_URL | sed -E 's/^postgresql:\/\/[^:]+:([^@]+).*/\1/')
  DB_HOST=$(echo $DATABASE_URL | sed -E 's/^postgresql:\/\/[^@]+@([^:]+).*/\1/')
  DB_PORT=$(echo $DATABASE_URL | sed -E 's/^postgresql:\/\/[^:]+:[^@]+@[^:]+:([0-9]+).*/\1/')
  DB_NAME=$(echo $DATABASE_URL | sed -E 's/^postgresql:\/\/[^:]+:[^@]+@[^:]+:[0-9]+\/([^?]+).*/\1/')
else
  echo "Error: DATABASE_URL must start with postgresql://"
  exit 1
fi

echo "Applying SQL fixes for RLS and missing functions..."
echo "Database: $DB_NAME on $DB_HOST:$DB_PORT"

# Execute the SQL script
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f ./sql/fix_rls_and_functions.sql

if [ $? -eq 0 ]; then
  echo "✅ SQL fixes applied successfully!"
  echo "Now restart your app to load the updated database functions."
else
  echo "❌ Error applying SQL fixes."
  exit 1
fi 