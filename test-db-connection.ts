import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import * as schema from './db/schema';

const db = drizzle(sql, { schema });

async function testConnection() {
  try {
    const result = await sql`SELECT 1 AS dummy`;
    console.log('Database connection successful:', result);
  } catch (error) {
    console.error('Database connection failed:', error);
  }
}

testConnection();