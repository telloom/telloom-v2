const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

// Make sure keys are available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or service role key in .env.local');
  process.exit(1);
}

// Create a Supabase client with the service role key for admin access
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Debugging PromptCategory table...');
  
  // Get database schema for PromptCategory
  console.log('\n1. Checking PromptCategory schema:');
  const { data: schemaData, error: schemaError } = await supabase.rpc(
    'get_table_schema',
    { table_name: 'PromptCategory' }
  );
  
  if (schemaError) {
    console.error('Error getting schema:', schemaError);
  } else {
    console.log('Schema:', JSON.stringify(schemaData, null, 2));
  }
  
  // List tables
  console.log('\n2. Listing all tables:');
  const { data: tablesData, error: tablesError } = await supabase.rpc('list_tables');
  
  if (tablesError) {
    console.error('Error listing tables:', tablesError);
  } else {
    console.log('Tables:', JSON.stringify(tablesData, null, 2));
  }
  
  // Try to query PromptCategory table directly
  console.log('\n3. Querying PromptCategory table:');
  const { data: categoryData, error: categoryError } = await supabase
    .from('PromptCategory')
    .select('*');
    
  if (categoryError) {
    console.error('Error querying PromptCategory:', categoryError);
  } else {
    console.log(`Found ${categoryData?.length || 0} categories`);
    console.log('Sample data:', JSON.stringify(categoryData?.slice(0, 2) || [], null, 2));
  }
  
  // Check for alternate table names (singular/plural variants)
  console.log('\n4. Checking for alternate table names:');
  const tableNames = ['prompt_category', 'promptcategory', 'prompt_categories', 'promptcategories', 'Categories'];
  
  for (const tableName of tableNames) {
    const { data, error } = await supabase.from(tableName).select('count(*)');
    console.log(`Checking "${tableName}": ${error ? 'Not found/error' : 'Exists!'}`);
  }
  
  console.log('\nDebug complete!');
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 