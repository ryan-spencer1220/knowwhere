-- Security hardening — resolves Supabase database linter warnings.
--
-- Covers:
--   * 0011 function_search_path_mutable  → pin search_path on trigger functions
--   * 0028 / 0029 (anon|authenticated)_security_definer_function_executable
--                                         → revoke API EXECUTE on the two
--                                           SECURITY DEFINER trigger functions
--   * 0025 public_bucket_allows_listing  → drop the broad avatars SELECT policy
--
-- The remaining warning, auth_leaked_password_protection, is a project-level
-- Auth setting (Dashboard → Authentication) and can't be set from SQL.

-- 1. Pin search_path. Each function's object references are already fully
--    schema-qualified (or pg_catalog built-ins), so an empty search_path is safe
--    and removes the role-mutable search_path.
alter function public.set_updated_at() set search_path = '';
alter function public.handle_new_user() set search_path = '';
alter function public.bump_saves_count() set search_path = '';

-- 2. These functions exist only to back triggers; nothing should invoke them via
--    PostgREST (/rest/v1/rpc/...). Triggers fire regardless of EXECUTE grants, so
--    revoking API access does not affect signup or save-count maintenance.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.bump_saves_count() from public, anon, authenticated;

-- 3. `avatars` is a public bucket, so object URLs are served without RLS. This
--    broad SELECT policy therefore added nothing for reads but let clients list
--    every file in the bucket. Remove it. (Owner-scoped insert/update/delete
--    policies stay; avatar display uses getPublicUrl, which needs no SELECT.)
drop policy if exists "Avatar images are publicly readable" on storage.objects;
