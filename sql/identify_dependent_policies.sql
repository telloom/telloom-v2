-- Script to identify all policies that depend on the has_sharer_access function
-- Run this before applying the fix to ensure all dependent policies are recreated

-- Find all policies that reference has_sharer_access in their definition
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM 
    pg_policies
WHERE 
    qual::text LIKE '%has_sharer_access%' OR 
    with_check::text LIKE '%has_sharer_access%';

-- Find all functions that depend on has_sharer_access
SELECT 
    n.nspname AS schema_name,
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM 
    pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE 
    pg_get_functiondef(p.oid) LIKE '%has_sharer_access%' AND
    p.proname != 'has_sharer_access';

-- Find all triggers that might depend on has_sharer_access
SELECT 
    tgname AS trigger_name,
    relname AS table_name,
    nspname AS schema_name
FROM 
    pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE 
    tgname IN (
        SELECT 
            tgname 
        FROM 
            pg_trigger 
        WHERE 
            tgrelid IN (
                SELECT 
                    oid 
                FROM 
                    pg_class 
                WHERE 
                    relname IN (
                        SELECT 
                            tablename 
                        FROM 
                            pg_policies 
                        WHERE 
                            qual::text LIKE '%has_sharer_access%' OR 
                            with_check::text LIKE '%has_sharer_access%'
                    )
            )
    );

-- Output a template for recreating policies
SELECT 
    'CREATE POLICY "' || policyname || '" ON "' || tablename || '"' ||
    CASE 
        WHEN cmd = 'SELECT' THEN E'\n  FOR SELECT'
        WHEN cmd = 'INSERT' THEN E'\n  FOR INSERT'
        WHEN cmd = 'UPDATE' THEN E'\n  FOR UPDATE'
        WHEN cmd = 'DELETE' THEN E'\n  FOR DELETE'
        ELSE E'\n  FOR ALL'
    END ||
    E'\n  USING (' || qual || ')' ||
    CASE 
        WHEN with_check IS NOT NULL THEN E'\n  WITH CHECK (' || with_check || ')'
        ELSE ''
    END || ';'
FROM 
    pg_policies
WHERE 
    qual::text LIKE '%has_sharer_access%' OR 
    with_check::text LIKE '%has_sharer_access%'; 