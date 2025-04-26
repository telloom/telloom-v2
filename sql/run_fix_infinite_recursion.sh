#!/bin/bash

# Script to apply just the infinite recursion fix
# This script assumes you have the SUPABASE_* environment variables set

# Check if environment variables are set
if [ -z "$PGUSER" ] || [ -z "$PGPASSWORD" ] || [ -z "$PGHOST" ] || [ -z "$PGDATABASE" ]; then
  echo "Please set the following environment variables:"
  echo "  PGUSER     (usually 'postgres')"
  echo "  PGPASSWORD (your database password)"
  echo "  PGHOST     (your Supabase database host)"
  echo "  PGDATABASE (usually 'postgres')"
  exit 1
fi

echo "Applying infinite recursion fix..."
psql -f sql/fix_infinite_recursion.sql

echo "Fix applied successfully!" 