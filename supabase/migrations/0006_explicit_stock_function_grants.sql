-- Explicit, redundant confirmation of EXECUTE grants on the stock-affecting
-- RPC functions (create_sale, update_sale, delete_sale, restock_product).
--
-- NOTE: this is not fixing a live bug. Verified directly against this
-- project's pg_proc.proacl before writing this migration: anon already had
-- no path to execute these (no bare PUBLIC grant existed in the ACL, and
-- authenticated was already explicitly granted -- see migrations 0003 and
-- 0005). This migration is a no-op against the current database state; it
-- exists purely as an explicit, documented statement of intent so the
-- grants are asserted here rather than only implied by the absence of a
-- revoke.

revoke execute on function public.create_sale(uuid, text, numeric, integer, uuid) from public;
revoke execute on function public.update_sale(uuid, uuid, text, numeric, integer) from public;
revoke execute on function public.delete_sale(uuid) from public;
revoke execute on function public.restock_product(uuid, integer, uuid) from public;

grant execute on function public.create_sale(uuid, text, numeric, integer, uuid) to authenticated;
grant execute on function public.update_sale(uuid, uuid, text, numeric, integer) to authenticated;
grant execute on function public.delete_sale(uuid) to authenticated;
grant execute on function public.restock_product(uuid, integer, uuid) to authenticated;
