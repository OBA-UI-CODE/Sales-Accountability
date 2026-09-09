-- Smart removal for a single variant, mirroring remove_product(): hard-delete
-- if nothing references it yet, otherwise archive so past sales keep their
-- variant label. sales.variant_id -> product_variants is NO ACTION, so a
-- naive delete would fail exactly like the staff-deletion bug fixed in 0008.
create or replace function public.remove_variant(p_variant_id uuid)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  v_has_sales boolean;
begin
  select exists(select 1 from public.sales where variant_id = p_variant_id)
    into v_has_sales;

  if v_has_sales then
    update public.product_variants set archived_at = now() where id = p_variant_id;
    return 'archived';
  else
    delete from public.product_variants where id = p_variant_id;
    return 'deleted';
  end if;
end;
$$;

revoke execute on function public.remove_variant(uuid) from public;
grant execute on function public.remove_variant(uuid) to authenticated;
