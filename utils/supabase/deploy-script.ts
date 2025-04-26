// utils/supabase/deploy-script.ts
// Direct script to deploy SQL migrations to Supabase using service role key

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize the Supabase admin client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function deploySQLMigrations() {
  try {
    console.log('Starting RPC function deployment...');
    
    // Get all SQL files in the migrations directory
    const migrationsDir = path.join(process.cwd(), 'utils', 'supabase', 'migrations');
    const files = fs.readdirSync(migrationsDir).filter(file => file.endsWith('.sql'));
    
    // Process each SQL file
    for (const file of files) {
      console.log(`Deploying ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      // Execute the SQL using the exec_sql RPC function
      const { data, error } = await supabase.rpc('exec_sql', { sql });
      
      if (error) {
        console.error(`Error deploying ${file}:`, error);
      } else {
        console.log(`Successfully deployed ${file}`);
      }
    }
    
    console.log('RPC function deployment completed');
  } catch (error) {
    console.error('Deployment failed:', error);
  }
}

// Run the deployment
deploySQLMigrations(); 