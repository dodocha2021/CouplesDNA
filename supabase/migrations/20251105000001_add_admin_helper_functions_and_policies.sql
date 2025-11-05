-- Migration: Add admin helper functions and update RLS policies
-- Date: 2025-11-05
-- Purpose: Fix circular dependency in RLS policies for admin checks
--          by using SECURITY DEFINER functions

-- =============================================================================
-- PART 1: Create helper functions
-- =============================================================================

-- Function: is_admin()
-- Purpose: Check if current user has admin role
-- Note: Uses SECURITY DEFINER to bypass RLS and avoid circular dependency
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.is_admin() IS 'Helper function to check if current user has admin role. Uses SECURITY DEFINER to bypass RLS circular dependency.';


-- Function: get_my_role()
-- Purpose: Get the role of the current user
-- Note: Uses SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN (
    SELECT role::text
    FROM profiles
    WHERE id = auth.uid()
    LIMIT 1
  );
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_my_role() IS 'Helper function to get the role of the current user. Uses SECURITY DEFINER to bypass RLS.';


-- =============================================================================
-- PART 2: Update profiles table RLS policies
-- =============================================================================

-- Drop existing admin policy if it exists (may have been created manually)
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Create new policy using is_admin() function
CREATE POLICY "Admins can view all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (is_admin());

-- Add comment
COMMENT ON POLICY "Admins can view all profiles" ON profiles IS 'Allows admin users to view all user profiles in Prompt Studio. Uses is_admin() function to avoid circular dependency.';


-- =============================================================================
-- PART 3: Update user_uploads table RLS policies
-- =============================================================================

-- Drop existing admin policy if it exists (may have been created manually)
DROP POLICY IF EXISTS "Admins can view all uploads" ON user_uploads;

-- Create new policy using is_admin() function
CREATE POLICY "Admins can view all uploads"
ON user_uploads
FOR SELECT
TO authenticated
USING (is_admin());

-- Add comment
COMMENT ON POLICY "Admins can view all uploads" ON user_uploads IS 'Allows admin users to view all user uploads in Prompt Studio. Uses is_admin() function to avoid circular dependency.';


-- =============================================================================
-- NOTES:
-- =============================================================================
--
-- Why SECURITY DEFINER?
-- - Without it, the function would respect RLS when querying profiles table
-- - This creates circular dependency: policy → function → profiles query → policy
-- - SECURITY DEFINER makes the function run with creator's privileges (superuser)
-- - This bypasses RLS completely within the function
--
-- Security Considerations:
-- - Function logic is simple and safe (only returns boolean or role text)
-- - Only accessible to authenticated users
-- - Cannot be exploited to bypass other security measures
--
-- Why update these specific policies?
-- - profiles: Admin needs to see all users in Prompt Studio
-- - user_uploads: Admin needs to see all user files in Prompt Studio
-- - Other admin policies (knowledge_uploads, user_reports) were created earlier
--   using direct profile queries, but they don't cause issues because they're
--   not queried in the same context as profiles table
--
