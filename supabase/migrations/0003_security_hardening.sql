-- Addresses Supabase database-linter warnings surfaced after 0001/0002:
--   - function_search_path_mutable: pin search_path on every function so it
--     can't be hijacked by a caller-controlled search_path.
--   - anon/authenticated_security_definer_function_executable: is_owner()
--     is SECURITY DEFINER and was callable directly as a public RPC; it's
--     only meant to be used inside RLS policies, so lock direct execution
--     down to the roles that actually need it.

alter function public.set_updated_at() set search_path = public;
alter function public.create_sale(uuid, text, numeric, integer, uuid) set search_path = public;
alter function public.update_sale(uuid, uuid, text, numeric, integer) set search_path = public;
alter function public.delete_sale(uuid) set search_path = public;
alter function public.restock_product(uuid, integer, uuid) set search_path = public;

revoke execute on function public.is_owner() from public;
revoke execute on function public.is_owner() from anon;
grant execute on function public.is_owner() to authenticated;

revoke execute on function public.create_sale(uuid, text, numeric, integer, uuid) from anon;
revoke execute on function public.update_sale(uuid, uuid, text, numeric, integer) from anon;
revoke execute on function public.delete_sale(uuid) from anon;
revoke execute on function public.restock_product(uuid, integer, uuid) from anon;
