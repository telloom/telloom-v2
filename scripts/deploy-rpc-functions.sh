#!/bin/bash

# Create the directory if it doesn't exist
mkdir -p utils/supabase/migrations

# Check if dotenv is installed
if ! npm list dotenv | grep -q dotenv; then
  echo "Installing dotenv..."
  npm install dotenv --save
fi

# Run the deployment script
echo "Deploying RPC functions..."
npm run deploy:rpc

echo "Deployment complete!" 