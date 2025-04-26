#!/bin/bash

# Check required environment variables
if [ -z "$PGUSER" ] || [ -z "$PGPASSWORD" ] || [ -z "$PGHOST" ] || [ -z "$PGDATABASE" ]; then
    echo "Error: Required PostgreSQL environment variables not set."
    echo "Please set the following environment variables:"
    echo "  PGUSER     - PostgreSQL user"
    echo "  PGPASSWORD - PostgreSQL password"
    echo "  PGHOST     - PostgreSQL host"
    echo "  PGDATABASE - PostgreSQL database name"
    exit 1
fi

echo "Applying infinite recursion fix..."

# Run the SQL fix
psql -f sql/fix_infinite_recursion.sql

echo "Infinite recursion fix applied successfully." 