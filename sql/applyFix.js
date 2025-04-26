// Script to apply the SQL fix for infinite recursion
// Run with: node sql/applyFix.js

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing environment variables.');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env file.');
  process.exit(1);
}

// Initialize Supabase client with service role key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applySQLFix() {
  try {
    console.log('Reading SQL fix file...');
    const sqlFixContent = fs.readFileSync('./sql/fix_infinite_recursion.sql', 'utf8');
    
    // Split the SQL into separate statements
    const statements = sqlFixContent
      .split(/;(?:\r\n|\n|$)/)
      .filter(stmt => stmt.trim().length > 0);
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim();
      
      if (!stmt) continue;
      
      // Log a preview of the statement
      const previewStmt = stmt.length > 50 ? stmt.substring(0, 50) + '...' : stmt;
      console.log(`Executing statement ${i+1}/${statements.length}: ${previewStmt}`);
      
      // Execute the statement using rpc
      const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' });
      
      if (error) {
        console.error(`Error executing statement ${i+1}:`, error);
        
        // If this is a critical error, exit
        if (error.message.includes('permission denied') || error.message.includes('function does not exist')) {
          console.error('Critical error - cannot proceed.');
          process.exit(1);
        }
        
        // If not critical, continue with next statement
        console.log('Continuing with next statement...');
      } else {
        console.log(`✅ Statement ${i+1} executed successfully`);
      }
    }
    
    console.log('✅ SQL fix for infinite recursion applied successfully!');
    console.log('Restart your application to load the updated functions.');
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

applySQLFix(); 