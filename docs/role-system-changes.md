# Role System Improvements

This document outlines the changes made to fix the infinite recursion issues in the Row Level Security (RLS) policies and improve the role-based access system.

## Summary of Changes

1. **SQL Database Layer**:
   - Created new RPC functions that bypass RLS for critical role checks
   - Updated existing RPC functions to include additional properties needed by the API routes
   - Fixed infinite recursion by using `SECURITY DEFINER` functions
   - Added new `get_profile_safe` RPC function for safe client-side profile data access

2. **Server-Side Helper Functions**:
   - Updated `utils/supabase/server.ts` with robust helper functions that use admin client and RPC calls
   - Added comprehensive error handling and logging
   - Implemented fallback mechanisms when primary queries fail

3. **Client-Side Helper Functions**:
   - Created `utils/supabase/client-helpers.ts` with functions that use RPC calls instead of direct table queries
   - Implemented safe methods for profile and role information retrieval
   - Updated key components like Header and useUser to use these safe helpers
   - Added fallback patterns to handle potential RPC errors

4. **Layout Components**:
   - Updated role-specific layouts to use the new helper functions
   - Added better error handling and more helpful redirects
   - Enhanced logging for debugging

5. **API Routes**:
   - Updated the notifications API to use the admin client and RPC functions
   - Fixed the role selection API to work with the updated RPC function return format

## SQL Changes

The SQL updates include:

1. **RPC Functions for Role Access**:
   - `get_user_role_emergency(user_id)`: Returns comprehensive role information
   - `get_executor_for_user(user_id)`: Returns executor relationships with additional flags
   - `is_admin(user_id)`: Checks admin status bypassing RLS
   - `get_profile_safe(user_id)`: Safely retrieves profile information bypassing RLS

2. **Structure of Return Values**:
   ```json
   // get_user_role_emergency response
   {
     "roles": ["LISTENER", "EXECUTOR"],
     "sharerId": "<uuid or null>",
     "is_sharer": true/false,
     "executor_relationships": [...],
     "has_executor_relationship": true/false,
     "timestamp": "..."
   }

   // get_executor_for_user response
   {
     "is_sharer": true/false,
     "has_executor_relationship": true/false,
     "relationships": [...]
   }
   
   // get_profile_safe response
   {
     "id": "<uuid>",
     "userId": "<uuid>",
     "displayName": "John Doe",
     "email": "user@example.com",
     "firstName": "John",
     "lastName": "Doe",
     "avatarUrl": "..."
   }
   ```

## Server-Side Helper Functions

Updated server-side helper functions in `utils/supabase/server.ts`:

1. **Role Check Functions**:
   - `checkRole(requiredRole)`: Checks if a user has a specific role using RPC
   - `hasExecutorRelationship(userId)`: Checks if a user has executor relationships using RPC
   - `getEffectiveSharerId(userId)`: Determines the effective sharer ID using RPC

2. **Admin Client Usage**:
   - All functions use the admin client to bypass RLS when needed
   - Comprehensive error handling with specific error messages
   - Fallback mechanisms for handling RLS issues

## Client-Side Helper Functions

New client-side helper functions in `utils/supabase/client-helpers.ts`:

1. **Profile Access Functions**:
   - `getProfileSafely(userId)`: Gets profile data using RPC instead of direct table query
   - `getUserRolesSafely(userId)`: Gets roles data using RPC to avoid infinite recursion
   - `getUserInfoSafely()`: Gets all user info (profile, roles, etc.) in one call

2. **Role Check Functions**:
   - `hasRole(role)`: Checks if current user has a specific role
   - `hasExecutorRelationship(userId)`: Checks executor status safely

These client helpers are used in critical components like:
- The Header component (for user info and navigation)
- The useUser hook (used throughout the app)
- Other components that previously queried Profile or ProfileRole directly

## Layout Components

Updated role-specific layouts:

1. **Role-Sharer Layout**:
   - Uses `checkRole` and admin client RPC functions
   - Handles the case where a user has SHARER role but no ProfileSharer record

2. **Role-Executor Layout**:
   - Uses `checkRole` and admin client RPC functions
   - Handles the case where a user has both SHARER and EXECUTOR roles
   - Respects cookie selection for preferred role

3. **Role-Listener Layout**:
   - Uses `checkRole` and admin client RPC functions
   - Handles potential role conflicts with SHARER and EXECUTOR roles

## API Routes

The improved API routes:

1. **Notifications API**:
   - Uses admin client to fetch role information
   - Builds queries based on role information
   - Enhanced error handling and logging

2. **Select-Role API**:
   - Updated to work with the new RPC function return format
   - Improved error messages for debugging
   - Better handling of edge cases

## How to Apply Changes

To apply these changes:

1. Run the SQL scripts:
   - `sql/fix_all_policies.sql`: Fixes the RLS policies
   - `sql/create_rpc_functions.sql`: Creates the RPC functions

2. Restart the Next.js application to load the updated code.

## Debugging

If issues still occur, check the following:

1. Verify that RPC functions are accessible:
   ```sql
   SELECT get_user_role_emergency('your-user-id-here');
   SELECT get_executor_for_user('your-user-id-here');
   SELECT get_profile_safe('your-user-id-here');
   ```

2. Check server logs for specific error messages:
   - Look for console logs with prefixes like `[role-sharer/layout]`, `[NOTIFICATIONS_API]`, `[useUser]`, `[HEADER]`, `[client-helpers]`, etc.

3. Ensure the database policies are correctly set up:
   ```sql
   SELECT tablename, policyname, cmd, qual 
   FROM pg_policies 
   WHERE schemaname = 'public' AND 
     (tablename = 'ProfileSharer' OR tablename = 'ProfileExecutor');
   ```

## Client-Side Error Patterns to Watch For

If you see errors like these in the browser console, it indicates that a component is still directly querying tables affected by RLS recursion:

```
GET https://projectname.supabase.co/rest/v1/Profile?select=*&id=eq.YOUR_USER_ID 500 (Internal Server Error)

GET https://projectname.supabase.co/rest/v1/ProfileRole?select=*&profileId=eq.YOUR_USER_ID 500 (Internal Server Error)
```

The solution is to update these components to use the new helper functions in `utils/supabase/client-helpers.ts`. 