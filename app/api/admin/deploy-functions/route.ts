import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createDirectClient } from '@/utils/supabase/direct-client';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Initialize the Supabase admin client
const initAdminClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
};

export async function POST(request: Request) {
  try {
    // Verify the user is an admin
    const supabase = createDirectClient();
    
    // Extract authorization header from the request
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[DEPLOY_FUNCTIONS] Missing or invalid Authorization header');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Extract token and use it for auth
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('[DEPLOY_FUNCTIONS] Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify admin status with RPC call
    const { data: isAdmin, error: adminCheckError } = await supabase.rpc('is_admin');
    
    if (adminCheckError || !isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    // Initialize admin client for function deployment
    const adminClient = initAdminClient();
    const results: Record<string, any> = {};
    
    // Get all SQL files in the migrations directory
    const migrationsDir = path.join(process.cwd(), 'utils', 'supabase', 'migrations');
    const files = fs.readdirSync(migrationsDir).filter(file => file.endsWith('.sql'));
    
    // Process each SQL file
    for (const file of files) {
      console.log(`Deploying ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      // Execute the SQL using the exec_sql RPC function
      const { data, error } = await adminClient.rpc('exec_sql', { sql });
      
      results[file] = {
        success: !error,
        error: error ? error.message : null
      };
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'RPC functions deployed',
      results
    });
  } catch (error: any) {
    console.error('Deployment failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Deployment failed' 
    }, { status: 500 });
  }
} 