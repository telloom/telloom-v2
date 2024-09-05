import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env and .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

console.log('Environment variables loaded:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '[REDACTED]' : 'Not set');
console.log('DATABASE_URL:', process.env.DATABASE_URL);

import { supabase, db } from './db/db';
import { sql } from 'drizzle-orm';

async function testSupabaseConnection() {
  try {
    const { data, error, count } = await supabase
      .from('prompt_categories')
      .select('*', { count: 'exact' });
    
    if (error) throw error;
    
    console.log('Supabase connection test successful. Row count:', count);
    return true;
  } catch (error) {
    console.error('Supabase connection test failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return false;
  }
}

async function testDrizzleConnection() {
  try {
    const result = await db.execute(sql`SELECT COUNT(*) FROM prompt_categories`);
    console.log('Drizzle connection test successful. Row count:', result[0].count);
    return true;
  } catch (error) {
    console.error('Drizzle connection test failed:', error);
    return false;
  }
}

async function runTests() {
  console.log('Starting database connection tests...');
  
  console.log('Testing Supabase connection...');
  const supabaseResult = await testSupabaseConnection();
  console.log('Supabase test result:', supabaseResult ? 'Passed' : 'Failed');
  
  console.log('Testing Drizzle connection...');
  const drizzleResult = await testDrizzleConnection();
  console.log('Drizzle test result:', drizzleResult ? 'Passed' : 'Failed');

  if (supabaseResult && drizzleResult) {
    console.log('All database connection tests passed!');
  } else {
    console.log('Some database connection tests failed. Check the logs above for details.');
  }
}

runTests().catch(console.error);