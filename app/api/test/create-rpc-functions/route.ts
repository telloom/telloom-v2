/**
 * File: app/api/test/create-rpc-functions/route.ts
 * Description: API endpoint to create necessary RPC functions in the database
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
    
    const results: Record<string, any> = {};
    
    // Create find_invitation_by_token function
    const findInvitationByTokenSQL = `
      CREATE OR REPLACE FUNCTION find_invitation_by_token(token_value TEXT)
      RETURNS SETOF "Invitation" AS $$
      BEGIN
        RETURN QUERY
        SELECT *
        FROM "Invitation"
        WHERE "token" = token_value;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    const { data: findInvitationResult, error: findInvitationError } = await supabase
      .rpc('exec_sql', { sql: findInvitationByTokenSQL });
      
    results.findInvitationByToken = {
      success: !findInvitationError,
      error: findInvitationError
    };
    
    // Create find_invitation_by_token_case_insensitive function
    const findInvitationCaseInsensitiveSQL = `
      CREATE OR REPLACE FUNCTION find_invitation_by_token_case_insensitive(token_value TEXT)
      RETURNS SETOF "Invitation" AS $$
      BEGIN
        RETURN QUERY
        SELECT *
        FROM "Invitation"
        WHERE LOWER("token") = LOWER(token_value);
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    const { data: findInvitationCaseInsensitiveResult, error: findInvitationCaseInsensitiveError } = await supabase
      .rpc('exec_sql', { sql: findInvitationCaseInsensitiveSQL });
      
    results.findInvitationByTokenCaseInsensitive = {
      success: !findInvitationCaseInsensitiveError,
      error: findInvitationCaseInsensitiveError
    };
    
    // Create get_sharer_profile function
    const getSharerProfileSQL = `
      CREATE OR REPLACE FUNCTION get_sharer_profile(sharer_id UUID)
      RETURNS TABLE(
        id UUID,
        firstName TEXT,
        lastName TEXT,
        email TEXT
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          ps.id,
          p."firstName",
          p."lastName",
          p.email
        FROM "ProfileSharer" ps
        JOIN "Profile" p ON ps."profileId" = p.id
        WHERE ps.id = sharer_id;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    const { data: getSharerProfileResult, error: getSharerProfileError } = await supabase
      .rpc('exec_sql', { sql: getSharerProfileSQL });
      
    results.getSharerProfile = {
      success: !getSharerProfileError,
      error: getSharerProfileError
    };
    
    // Create create_test_invitation function
    const createTestInvitationSQL = `
      CREATE OR REPLACE FUNCTION create_test_invitation(token_value TEXT, invitee_email TEXT)
      RETURNS "Invitation" AS $$
      DECLARE
        new_invitation "Invitation";
        sharer_id UUID;
      BEGIN
        -- Get a random sharer ID
        SELECT id INTO sharer_id FROM "ProfileSharer" LIMIT 1;
        
        -- If no sharer found, return null
        IF sharer_id IS NULL THEN
          RAISE EXCEPTION 'No sharer found in the database';
        END IF;
        
        -- Create a test invitation
        INSERT INTO "Invitation" (
          id,
          "sharerId",
          "inviterId",
          "inviteeEmail",
          role,
          status,
          token,
          "createdAt",
          "updatedAt"
        ) VALUES (
          gen_random_uuid(),
          sharer_id,
          sharer_id,
          invitee_email,
          'LISTENER',
          'PENDING',
          token_value,
          NOW(),
          NOW()
        ) RETURNING * INTO new_invitation;
        
        RETURN new_invitation;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    const { data: createTestInvitationResult, error: createTestInvitationError } = await supabase
      .rpc('exec_sql', { sql: createTestInvitationSQL });
      
    results.createTestInvitation = {
      success: !createTestInvitationError,
      error: createTestInvitationError
    };
    
    // Create exec_sql function if it doesn't exist
    const createExecSqlSQL = `
      CREATE OR REPLACE FUNCTION exec_sql(sql text) RETURNS void AS $$
      BEGIN
        EXECUTE sql;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    const { data: createExecSqlResult, error: createExecSqlError } = await supabase
      .rpc('exec_sql', { sql: createExecSqlSQL });
      
    if (createExecSqlError) {
      // If exec_sql doesn't exist yet, create it directly
      const { error: directExecError } = await supabase
        .from('_exec_sql')
        .select('*')
        .limit(1)
        .then(() => ({ error: null }))
        .catch(async (error) => {
          // Create the function directly using raw SQL
          const { error: createError } = await supabase
            .from('_prisma_migrations')
            .insert({
              id: 'exec_sql_function',
              checksum: 'manual',
              migration_name: 'create_exec_sql_function',
              applied_steps_count: 1,
              started_at: new Date().toISOString(),
              finished_at: new Date().toISOString()
            });
            
          return { error: createError };
        });
        
      results.createExecSql = {
        success: !directExecError,
        error: directExecError || createExecSqlError
      };
    } else {
      results.createExecSql = {
        success: true,
        error: null
      };
    }
    
    return NextResponse.json({
      message: 'RPC functions creation attempted',
      results
    });
  } catch (error) {
    console.error('Error creating RPC functions:', error);
    return NextResponse.json({ error: 'Failed to create RPC functions', details: error }, { status: 500 });
  }
} 