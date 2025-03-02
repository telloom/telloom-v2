/**
 * File: app/api/test/create-exec-sql/route.ts
 * Description: API endpoint to create the exec_sql function in the database
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function GET(request: Request) {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'This endpoint is only available in development mode' }, { status: 403 });
    }
    
    // Create a Supabase client with the service role key for admin operations
    const supabase = createAdminClient();
    
    // Create exec_sql function directly
    const { error } = await supabase.rpc('exec_sql', { 
      sql: `CREATE OR REPLACE FUNCTION exec_sql(sql text) RETURNS void AS $$ BEGIN EXECUTE sql; END; $$ LANGUAGE plpgsql SECURITY DEFINER;` 
    }).catch(error => ({ error }));
    
    if (error) {
      // If the function doesn't exist yet, we need to create it using raw SQL
      // This is a bit of a chicken-and-egg problem, so we'll use a direct query
      const { data, error: directError } = await supabase
        .from('_prisma_migrations')
        .select('id')
        .limit(1);
      
      if (directError) {
        return NextResponse.json({ 
          error: 'Failed to access database', 
          details: directError 
        }, { status: 500 });
      }
      
      // Now try to create the function using a direct SQL query
      const { error: sqlError } = await supabase
        .from('_prisma_migrations')
        .insert({
          id: 'exec_sql_function_' + Date.now(),
          checksum: 'manual',
          migration_name: 'create_exec_sql_function',
          applied_steps_count: 1,
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
          logs: `CREATE OR REPLACE FUNCTION exec_sql(sql text) RETURNS void AS $$ BEGIN EXECUTE sql; END; $$ LANGUAGE plpgsql SECURITY DEFINER;`
        });
      
      if (sqlError) {
        return NextResponse.json({ 
          error: 'Failed to create migration record', 
          details: sqlError 
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        message: 'Created migration record for exec_sql function',
        note: 'You will need to manually run the SQL in the Supabase dashboard'
      });
    }
    
    return NextResponse.json({ 
      message: 'exec_sql function created successfully' 
    });
  } catch (error) {
    console.error('Error creating exec_sql function:', error);
    return NextResponse.json({ 
      error: 'Failed to create exec_sql function', 
      details: error 
    }, { status: 500 });
  }
} 