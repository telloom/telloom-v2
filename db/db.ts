import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase URL or service role key');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Decode the connection string before using it
const decodedConnectionString = decodeURIComponent(connectionString);

const client = postgres(decodedConnectionString);
export const db = drizzle(client);

console.log('DATABASE_URL:', decodedConnectionString);