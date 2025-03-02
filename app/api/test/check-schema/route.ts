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
    
    // Check Invitation table schema
    const { data: schema, error: schemaError } = await supabase
      .rpc('get_table_schema', { table_name: 'Invitation' });
      
    results.schema = {
      data: schema,
      error: schemaError
    };
    
    // Check if the token column exists
    const { data: tokenColumn, error: tokenColumnError } = await supabase
      .rpc('check_column_exists', { 
        table_name: 'Invitation',
        column_name: 'token'
      });
      
    results.tokenColumn = {
      data: tokenColumn,
      error: tokenColumnError
    };
    
    // Check case sensitivity of the token column
    const { data: caseSensitivity, error: caseSensitivityError } = await supabase
      .rpc('check_case_sensitivity', { 
        table_name: 'Invitation',
        column_name: 'token'
      });
      
    results.caseSensitivity = {
      data: caseSensitivity,
      error: caseSensitivityError
    };
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error checking schema:', error);
    return NextResponse.json({ error: 'Failed to check schema', details: error }, { status: 500 });
  }
} 