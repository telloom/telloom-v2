/**
 * File: app/api/test/direct-sql/route.ts
 * Description: API endpoint to execute SQL directly using the admin client
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function GET(request: Request) {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'This endpoint is only available in development mode' }, { status: 403 });
    }
    
    const url = new URL(request.url);
    const sql = url.searchParams.get('sql');
    
    if (!sql) {
      return NextResponse.json({ 
        message: 'No SQL provided. Use ?sql=YOUR_SQL_QUERY parameter.',
        examples: [
          '?sql=SELECT * FROM "Invitation" LIMIT 1',
          '?sql=CREATE OR REPLACE FUNCTION find_invitation_by_token(token_value TEXT) RETURNS SETOF "Invitation" AS $$ BEGIN RETURN QUERY SELECT * FROM "Invitation" WHERE "token" = token_value; END; $$ LANGUAGE plpgsql SECURITY DEFINER;'
        ]
      });
    }
    
    // Create a Supabase client with the service role key for admin operations
    const supabase = createAdminClient();
    
    // Execute the SQL directly
    const { data, error } = await supabase.rpc('exec_sql', { sql }).catch(error => {
      // If exec_sql doesn't exist, try to create it
      if (error.message && error.message.includes('function exec_sql(text) does not exist')) {
        return createExecSqlFunction(supabase, sql);
      }
      return { error };
    });
    
    if (error) {
      return NextResponse.json({ 
        error: 'Failed to execute SQL', 
        details: error,
        sql
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      message: 'SQL executed successfully',
      data,
      sql
    });
  } catch (error) {
    console.error('Error executing SQL:', error);
    return NextResponse.json({ 
      error: 'Failed to execute SQL', 
      details: error 
    }, { status: 500 });
  }
}

async function createExecSqlFunction(supabase: any, originalSql: string) {
  try {
    // Try to create the exec_sql function using a direct query
    const createFunctionSql = `
      CREATE OR REPLACE FUNCTION exec_sql(sql text) 
      RETURNS void AS $$ 
      BEGIN 
        EXECUTE sql; 
      END; 
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    // We can't use the function yet, so we need to use a direct query
    const { data, error } = await supabase
      .from('_prisma_migrations')
      .insert({
        id: 'exec_sql_function_' + Date.now(),
        checksum: 'manual',
        migration_name: 'create_exec_sql_function',
        applied_steps_count: 1,
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
        logs: createFunctionSql
      });
      
    if (error) {
      return { 
        error: {
          message: 'Failed to create exec_sql function',
          details: error
        }
      };
    }
    
    // Now try to execute the original SQL again
    return { 
      data: null, 
      error: {
        message: 'Created exec_sql function, but you need to manually execute it in the Supabase dashboard',
        sql: createFunctionSql,
        originalSql
      }
    };
  } catch (error) {
    return { 
      error: {
        message: 'Failed to create exec_sql function',
        details: error
      }
    };
  }
} 