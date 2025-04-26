-- supabase/migrations/YYYYMMDDHHMMSS_create_get_prompts_rpc.sql

-- Function to securely get prompts for a specific category, checking user permissions first.
-- Accepts both category ID and the relevant sharer ID for permission checking.
create or replace function public.get_prompts_for_category(p_category_id uuid, p_sharer_id uuid)
returns setof "Prompt" -- Adjust the return type if you need joined data differently
language plpgsql
security definer -- Runs with the privileges of the function owner (admin)
set search_path = public -- Ensure functions are found in the public schema
as $$
declare
  v_has_access boolean;
begin
  -- 1. Check if the passed sharer ID is valid (optional but good practice)
  if p_sharer_id is null then
    raise exception 'Sharer ID must be provided';
  end if;

  -- 2. Check if the current user has access to the specified sharer's content
  -- Use the passed p_sharer_id directly for the check.
  select is_admin() or has_sharer_access(p_sharer_id) or has_listener_access(p_sharer_id)
  into v_has_access;

  -- 3. If access is granted, return the prompts for the given category
  if v_has_access then
    return query
    select p.*
    from "Prompt" p
    where p."promptCategoryId" = p_category_id
    order by p."order" nulls last, p.id; -- Basic ordering (remove if 'order' doesn't exist)
    -- Note: This simple select bypasses Prompt RLS because of SECURITY DEFINER.
    -- We are NOT selecting PromptResponse here to keep it simple and avoid potential
    -- recursion on that table's RLS. The client will handle the response check.
  else
    -- If no access, return an empty set
    return;
  end if;
end;
$$;

-- Grant execute permission to the authenticated role
grant execute
  on function public.get_prompts_for_category(uuid, uuid) -- Update signature
  to authenticated;

-- Optional: Grant to anon if needed, but likely not for this function
-- grant execute
--   on function public.get_prompts_for_category(uuid, uuid)
--   to anon; 