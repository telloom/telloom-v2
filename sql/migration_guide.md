# Migration Guide: Fixing RLS Infinite Recursion

This guide provides step-by-step instructions for applying fixes to resolve the infinite recursion issue in the Row Level Security (RLS) policies for the `ProfileSharer` and `ProfileExecutor` tables.

## Prerequisites

Before beginning the migration, ensure you have:

1. **Backup**: Create a full database backup before proceeding.
2. **Downtime Window**: Schedule a maintenance window if this is a production system.
3. **Testing Environment**: Test these changes in a staging environment first.
4. **Rollback Plan**: Prepare a rollback strategy in case issues arise.

## Migration Steps

### Option A: Using the Comprehensive Script (Recommended)

The easiest and safest approach is to use the comprehensive script that handles all dependencies automatically:

1. Ensure you have the `fix_all_policies.sql` script ready.

2. Execute the script:
   ```bash
   psql -U your_username -d your_database -f fix_all_policies.sql
   ```

3. This script will:
   - Identify all policies that depend on `has_sharer_access`
   - Drop those policies
   - Redefine the helper functions to avoid recursion
   - Recreate the base policies for `ProfileSharer` and `ProfileExecutor`
   - Automatically recreate all dependent policies
   - Create RPC functions for emergency access

4. Verify the changes:
   ```sql
   -- Check that the helper functions were created
   \df public.has_sharer_access
   \df public.is_admin
   \df public.is_sharer_owner
   \df public.is_executor_for_sharer
   
   -- Check that the RPC functions were created
   \df public.get_executor_for_user
   \df public.has_sharer_access_check
   \df public.get_user_role_emergency
   
   -- Check that the policies were recreated
   SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';
   ```

### Option B: Manual Step-by-Step Approach

If you prefer more control over the process, you can follow these manual steps:

#### 1. Identify Dependent Policies

Before making changes, identify all policies that depend on the `has_sharer_access` function:

1. Run the `identify_dependent_policies.sql` script to get a list of all dependent policies:
   ```bash
   psql -U your_username -d your_database -f identify_dependent_policies.sql
   ```

2. Review the output and note all policies that will need to be recreated after dropping the function.

#### 2. Prepare SQL Files

1. Ensure you have the following SQL files ready:
   - `fix_recursive_policies.sql`: Contains the fixes for RLS policies
   - `create_rpc_functions.sql`: Contains the RPC functions for emergency access

2. Review the SQL files to ensure they match your database schema.

3. Make sure the `fix_recursive_policies.sql` file includes:
   - `DROP FUNCTION IF EXISTS public.has_sharer_access(uuid) CASCADE;` to handle dependencies
   - Recreation of all dependent policies that were dropped by CASCADE

#### 3. Apply Database Changes

1. Connect to your database:
   ```bash
   psql -U your_username -d your_database
   ```

2. Execute the SQL files:
   ```sql
   \i /path/to/fix_recursive_policies.sql
   \i /path/to/create_rpc_functions.sql
   ```

3. Verify the changes:
   ```sql
   \df public.has_sharer_access
   \df public.is_admin
   \df public.is_sharer_owner
   \df public.is_executor_for_sharer
   
   -- Check policies
   SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' AND
     (tablename = 'ProfileSharer' OR tablename = 'ProfileExecutor');
   
   -- Check that dependent policies were recreated
   SELECT tablename, policyname FROM pg_policies WHERE 
     policyname IN ('FollowRequest_delete_policy', 'PromptResponse_manage_policy', 'PromptResponseAttachmentPersonTag_access_policy');
   ```

### 4. Update TypeScript Helper Functions

1. Copy the new helper functions from `utils/supabase/improved-role-helpers.ts` to your project.
2. Create or update the admin client utility in `utils/supabase/admin.ts`.
3. Update imports in files that use the role helpers to point to the new implementations.
4. If necessary, update any API routes that might be affected, such as the notifications API.

### 5. Verify Changes

After applying the changes, verify that:

1. **RLS Policies Work**: Test access patterns with different user roles:
   - ADMIN can access all records
   - SHARER can access their own records
   - EXECUTOR can access records for sharers they represent
   - Users cannot access records they shouldn't

2. **Helper Functions Work**: Test that the TypeScript helper functions correctly:
   - Determine appropriate roles
   - Handle errors gracefully
   - Provide fallback mechanisms

3. **No Recursion Errors**: Confirm that queries that previously caused recursion errors now work properly.

4. **Dependent Policies Work**: Verify that all dependent policies that were recreated are functioning correctly:
   - Test FollowRequest operations
   - Test PromptResponse operations
   - Test PromptResponseAttachmentPersonTag operations

### 6. Rollback Plan

If issues occur, you can roll back the changes:

1. **Restore Policies**:
   ```sql
   -- Drop the new policies
   DROP POLICY IF EXISTS "Profiles can view own sharer" ON "ProfileSharer";
   DROP POLICY IF EXISTS "Profiles can update own sharer" ON "ProfileSharer";
   -- ... (drop all new policies)
   
   -- Restore original functions
   -- ... (restore original function definitions)
   ```

2. **Restore Database**: If necessary, restore from the backup created before migration.

## Post-Migration Tasks

1. **Update Documentation**: 
   - Share the `roles_access_design.md` document with the development team
   - Update any existing documentation to reflect the new RLS policy design

2. **Monitor Performance**: 
   - Watch for any performance issues related to the new RLS policies
   - Check for errors in logs

3. **Consider Automated Tests**: 
   - Add tests that verify the RLS policies work as expected
   - Add tests for the helper functions

## Troubleshooting

### Common Issues

1. **Missing Dependent Policies**: 
   - If you encounter "policy does not exist" errors, you may have missed recreating some dependent policies
   - Run the `identify_dependent_policies.sql` script again to find missing policies

2. **RLS Policies Not Working**: 
   - Check that RLS is enabled on the tables
   - Verify the policy definitions match your schema
   - Test with known user IDs

3. **RPC Functions Not Available**: 
   - Ensure the functions were created with the correct schema
   - Check for syntax errors in function definitions

4. **TypeScript Helper Errors**: 
   - Verify the imports and types are correct
   - Check for compatibility with your Supabase version

### Getting Help

If you encounter issues that you cannot resolve:

1. Check the Supabase documentation on RLS: https://supabase.com/docs/guides/auth/row-level-security
2. Review the Telloom role design document for guidance
3. Consult with a database expert who understands PostgreSQL RLS

---

By following this migration guide, you should be able to successfully implement the fixes for the infinite recursion issue in your RLS policies while maintaining the security and functionality of your role-based access control system. 