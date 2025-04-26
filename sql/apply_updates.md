# Applying the SQL Updates for Select-Role Page

The role selection functionality is not working correctly because we need to:

1. Fix the infinite recursion issue in the database RLS policies
2. Update the RPC functions with additional properties needed by the API

## Step 1: Apply the SQL Scripts

To apply the SQL updates, you'll need to run the SQL scripts on your Supabase database.

### Option 1: Using the Supabase SQL Editor

1. Log in to your Supabase dashboard
2. Go to the SQL Editor
3. Create a new query
4. Copy and paste the contents of:
   - First, `sql/fix_all_policies.sql` 
   - Then, `sql/update_rpc_functions.sql`
5. Run each script one at a time

### Option 2: Using psql

If you have `psql` installed and can connect to your database, run:

```bash
# Replace your-db-connection-string with the actual connection string
psql -f sql/fix_all_policies.sql your-db-connection-string
psql -f sql/update_rpc_functions.sql your-db-connection-string
```

## Step 2: Verify the Changes

After running the scripts, you can verify that the RPC functions are working correctly:

```sql
-- Test the updated get_executor_for_user function
SELECT get_executor_for_user('your-user-id-here');

-- Test the updated get_user_role_emergency function
SELECT get_user_role_emergency('your-user-id-here');
```

The functions should return JSON objects with the following structure:

```json
// get_executor_for_user result
{
  "is_sharer": true/false,
  "has_executor_relationship": true/false,
  "relationships": [...]
}

// get_user_role_emergency result
{
  "roles": [...],
  "sharerId": "uuid or null",
  "is_sharer": true/false,
  "executor_relationships": [...],
  "has_executor_relationship": true/false,
  "timestamp": "timestamp"
}
```

## Common Issues

If you're still seeing infinite recursion errors:

1. Check if the RLS policies were successfully updated by querying:
   ```sql
   SELECT tablename, policyname, cmd, qual 
   FROM pg_policies 
   WHERE schemaname = 'public' AND 
     (tablename = 'ProfileSharer' OR tablename = 'ProfileExecutor');
   ```

2. Make sure the helper functions are defined correctly:
   ```sql
   \df public.is_admin
   \df public.is_sharer_owner
   \df public.is_executor_for_sharer
   \df public.has_sharer_access
   ```

3. Verify that the RPC functions exist:
   ```sql
   \df public.get_executor_for_user
   \df public.get_user_role_emergency
   ```

## If You Still Need Help

If you're still experiencing issues, please provide:

1. The exact error messages you're seeing
2. The results of the verification queries above
3. Any logs from your Next.js application when attempting to use the select-role functionality 