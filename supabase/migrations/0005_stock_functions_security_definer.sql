-- Fixes a bug where stock side-effects silently no-op for non-owner
-- (staff) callers of create_sale/update_sale/delete_sale/restock_product.
--
-- Root cause: these functions were SECURITY INVOKER, so their internal
-- `update public.products` statements ran under the CALLER's role. The
-- "products: owners can update" RLS policy only permits owner-role
-- updates, so when staff called these RPCs, the stock UPDATE matched
-- zero rows (no error — RLS just filters silently) while the sale
-- itself still inserted successfully. Net effect: stock_quantity never
-- moved for staff-logged/edited/deleted sales.
--
-- Fix: switch to SECURITY DEFINER (same pattern already used by
-- is_owner()), so the functions' internal writes run with the function
-- owner's privileges instead of the caller's. The fixed, narrow
-- parameter signatures are what keeps this safe — callers still can't
-- do anything except what each function explicitly allows.

alter function public.create_sale(uuid, text, numeric, integer, uuid)
  security definer set search_path = public;

alter function public.update_sale(uuid, uuid, text, numeric, integer)
  security definer set search_path = public;

alter function public.delete_sale(uuid)
  security definer set search_path = public;

alter function public.restock_product(uuid, integer, uuid)
  security definer set search_path = public;

-- Unchanged from 0003, restated for clarity: keep these off anon,
-- only authenticated (signed-in owner or staff) can call them.
revoke execute on function public.create_sale(uuid, text, numeric, integer, uuid) from anon;
revoke execute on function public.update_sale(uuid, uuid, text, numeric, integer) from anon;
revoke execute on function public.delete_sale(uuid) from anon;
revoke execute on function public.restock_product(uuid, integer, uuid) from anon;
