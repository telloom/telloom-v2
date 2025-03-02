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
    
    const results: Record<string, any> = {};
    
    // List all tables directly from Postgres information_schema
    const { data: tableList, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
      
    if (tableError) {
      results.tableError = tableError;
    } else {
      results.tables = tableList.map(t => t.table_name);
    }
    
    // Check specific tables
    const tablesToCheck = ['Profile', 'ProfileSharer', 'Invitation'];
    
    for (const table of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(5);
          
        results[table] = {
          data,
          error,
          count: data?.length || 0
        };
      } catch (error) {
        results[table] = {
          error: `Error querying table: ${error}`,
          count: 0
        };
      }
    }
    
    // Check for the specific invitation
    const { data: specificInvitation, error: invitationError } = await supabase
      .from('Invitation')
      .select('*')
      .eq('token', 'e90f9741-714f-4874-a457-5d986d99b90d')
      .maybeSingle();
      
    results.specificInvitation = {
      found: !!specificInvitation,
      data: specificInvitation,
      error: invitationError
    };
    
    // Check database schema
    const { data: schemaData, error: schemaError } = await supabase
      .from('information_schema.columns')
      .select('table_name, column_name, data_type')
      .eq('table_schema', 'public')
      .in('table_name', tablesToCheck);
      
    results.schema = {
      data: schemaData,
      error: schemaError
    };
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error checking database:', error);
    return NextResponse.json({ error: 'Failed to check database', details: error }, { status: 500 });
  }
} 