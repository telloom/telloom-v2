# Supabase Migrations

This directory contains SQL migrations for the Telloom application's Supabase database.

## How to Apply Migrations

### Option 1: Using Supabase CLI (Recommended)

1. Install the Supabase CLI if you haven't already:
   ```bash
   npm install -g supabase
   ```

2. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

3. Push the migrations:
   ```bash
   supabase db push
   ```

### Option 2: Manual Application

If you don't have the Supabase CLI set up, you can manually apply migrations:

1. Log in to the Supabase dashboard
2. Navigate to your project
3. Go to the SQL Editor
4. Copy the contents of the migration file (e.g., `20240701_fix_profile_permissions.sql`)
5. Paste into the SQL Editor and run the query

## Migration Files

- `20240701_fix_profile_permissions.sql`: Fixes permissions for ProfileListener, ProfileExecutor, ProfileRole, Profile, and Invitation tables to ensure proper access for authenticated users and service roles. This migration has been updated to remove sequence permissions since the tables use UUID primary keys.

## Migrations

### 20240702_remove_executor_unique_constraint.sql
This migration removes the unique constraint on the `sharerId` column in the `ProfileExecutor` table, allowing multiple executors to be assigned to the same sharer. It adds a composite unique index on `(executorId, sharerId)` to maintain data integrity by ensuring the same executor can't be assigned to the same sharer multiple times.

### 20240702_update_executor_rpc.sql
This migration updates the `create_profile_executor` RPC function to handle the new constraint model. It ensures proper checks for existing relationships based on both `executorId` and `sharerId`, and returns the executor ID when successful.

### 20240702_fix_profile_listener_permissions.sql
This migration fixes permissions for the `ProfileListener` table by granting `SELECT`, `INSERT`, `UPDATE`, and `DELETE` permissions to the `authenticated` and `service_role` roles, and `SELECT` permissions to the `anon` role. This addresses permission errors encountered during the invitation acceptance process.

### 20240702_fix_all_profile_permissions.sql
This migration provides a comprehensive fix for permissions on all profile-related tables (`Profile`, `ProfileRole`, `ProfileSharer`, `ProfileListener`, `ProfileExecutor`, and `Invitation`). It ensures that the `authenticated` and `service_role` roles have `SELECT`, `INSERT`, `UPDATE`, and `DELETE` permissions, while the `anon` role has `SELECT` permissions. This prevents permission errors during operations involving these tables.

## Troubleshooting

If you encounter permission errors when running the application, it may be because the migrations haven't been applied correctly. Check the Supabase logs for any error messages and ensure all migrations have been applied successfully.

### Common Errors

- `relation "ProfileListener_id_seq" does not exist`: This error occurred in an earlier version of the migration file. The updated migration file removes all sequence-related permissions since the tables use UUID primary keys.

- `permission denied for table ProfileListener`: This error indicates that the permissions haven't been properly applied. Run the migration file again to ensure the correct permissions are set. 