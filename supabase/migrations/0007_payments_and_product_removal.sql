-- Feature migration: (1) per-sale payment tracking (paid / part-paid / not
-- paid via amount_paid + optional debtor_name), and (2) product removal
-- (smart archive-or-delete).
--
-- Payment status is DERIVED, never stored as its own column, so the label can
-- never disagree with the numbers:
--   amount_paid = 0            -> not paid   (owes total_price)
--   0 < amount_paid < total    -> part paid  (owes the difference)
--   amount_paid >= total       -> paid       (owes nothing)
-- "Amount owed" anywhere = sum(total_price - amount_paid) over unpaid sales.

-- ---------------------------------------------------------------------------
-- 1. Schema changes
-- ---------------------------------------------------------------------------

-- Sales: how much of this sale has actually been collected, and (optional)
-- who owes the remainder.
alter table public.sales
  add column if not exists amount_paid numeric not null default 0,
  add column if not exists debtor_name text;

-- Backfill: every EXISTING sale predates this feature, so treat it as fully
-- paid (amount_paid = its total). total_price may be null on old rows, so
-- fall back to unit_price * quantity.
update public.sales
  set amount_paid = coalesce(total_price, unit_price * quantity)
  where amount_paid = 0;

-- Products: archive flag so a product the shop no longer sells can be hidden
-- from the app while its past sales stay intact.
alter table public.products
  add column if not exists archived_at timestamptz;

-- Drop the previous 5-arg signatures first. Adding optional params creates a
-- NEW overload rather than replacing, which would make create_sale/update_sale
-- ambiguous ("function is not unique") when called by name. Dropping the old
-- signature explicitly keeps exactly one version of each.
drop function if exists public.create_sale(uuid, text, numeric, integer, uuid);
drop function if exists public.update_sale(uuid, uuid, text, numeric, integer);

-- ---------------------------------------------------------------------------
-- 2. create_sale — now accepts amount_paid and optional debtor_name.
--    Preserves the existing stock-decrement logic exactly. security definer
--    (matching migration 0005) so staff callers can adjust owner-guarded
--    products stock.
-- ---------------------------------------------------------------------------
create or replace function public.create_sale(
  p_product_id uuid,
  p_custom_item_name text,
  p_unit_price numeric,
  p_quantity integer,
  p_sold_by uuid,
  p_amount_paid numeric default null,
  p_debtor_name text default null
)
returns public.sales
language plpgsql
security definer set search_path = public
as $$
declare
  v_sale public.sales;
  v_total numeric;
  v_paid numeric;
begin
  v_total := p_unit_price * p_quantity;
  -- Default to fully paid when caller doesn't specify (keeps normal quick
  -- sales one-tap). Clamp to [0, total] so a sale can never be over/under set.
  v_paid := coalesce(p_amount_paid, v_total);
  if v_paid < 0 then v_paid := 0; end if;
  if v_paid > v_total then v_paid := v_total; end if;

  if p_product_id is not null then
    update public.products
      set stock_quantity = stock_quantity - p_quantity
      where id = p_product_id;
  end if;

  insert into public.sales
    (product_id, custom_item_name, unit_price, quantity, sold_by,
     amount_paid, debtor_name)
  values
    (p_product_id, p_custom_item_name, p_unit_price, p_quantity, p_sold_by,
     v_paid, nullif(btrim(coalesce(p_debtor_name,'')), ''))
  returning * into v_sale;

  return v_sale;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. update_sale — now also lets an edit change amount_paid and debtor_name.
--    Stock delta logic preserved exactly.
-- ---------------------------------------------------------------------------
create or replace function public.update_sale(
  p_sale_id uuid,
  p_product_id uuid,
  p_custom_item_name text,
  p_unit_price numeric,
  p_quantity integer,
  p_amount_paid numeric default null,
  p_debtor_name text default null
)
returns public.sales
language plpgsql
security definer set search_path = public
as $$
declare
  v_old public.sales;
  v_sale public.sales;
  v_total numeric;
  v_paid numeric;
begin
  select * into v_old from public.sales where id = p_sale_id;
  if not found then
    raise exception 'Sale % not found', p_sale_id;
  end if;

  -- Restore stock for the old line, deduct for the new (unchanged behaviour).
  if v_old.product_id is not null then
    update public.products
      set stock_quantity = stock_quantity + v_old.quantity
      where id = v_old.product_id;
  end if;
  if p_product_id is not null then
    update public.products
      set stock_quantity = stock_quantity - p_quantity
      where id = p_product_id;
  end if;

  v_total := p_unit_price * p_quantity;
  -- If caller doesn't pass amount_paid, keep the old value (clamped to the new
  -- total in case quantity/price changed).
  v_paid := coalesce(p_amount_paid, v_old.amount_paid);
  if v_paid < 0 then v_paid := 0; end if;
  if v_paid > v_total then v_paid := v_total; end if;

  update public.sales
    set product_id = p_product_id,
        custom_item_name = p_custom_item_name,
        unit_price = p_unit_price,
        quantity = p_quantity,
        amount_paid = v_paid,
        debtor_name = nullif(btrim(coalesce(p_debtor_name, v_old.debtor_name, '')), ''),
        edited_at = now()
    where id = p_sale_id
    returning * into v_sale;

  return v_sale;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. record_payment — pay down a debt. Adds to amount_paid, never past total.
--    Pass p_pay_full = true to settle the whole outstanding balance at once
--    ("Mark fully paid"); otherwise p_amount is added to what's been paid.
--    Callable by any authenticated user (owner or staff), per product decision.
-- ---------------------------------------------------------------------------
create or replace function public.record_payment(
  p_sale_id uuid,
  p_amount numeric default null,
  p_pay_full boolean default false
)
returns public.sales
language plpgsql
security definer set search_path = public
as $$
declare
  v_sale public.sales;
  v_total numeric;
  v_new_paid numeric;
begin
  select * into v_sale from public.sales where id = p_sale_id;
  if not found then
    raise exception 'Sale % not found', p_sale_id;
  end if;

  v_total := coalesce(v_sale.total_price, v_sale.unit_price * v_sale.quantity);

  if p_pay_full then
    v_new_paid := v_total;
  else
    v_new_paid := v_sale.amount_paid + coalesce(p_amount, 0);
  end if;

  if v_new_paid < 0 then v_new_paid := 0; end if;
  if v_new_paid > v_total then v_new_paid := v_total; end if;

  update public.sales
    set amount_paid = v_new_paid
    where id = p_sale_id
    returning * into v_sale;

  return v_sale;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. remove_product — smart removal.
--    If the product has NO sales history -> hard delete (it was a mistake).
--    If it HAS sales history            -> archive (set archived_at), so past
--                                          sales keep their product reference.
--    Returns text describing what happened ('deleted' or 'archived').
--    Callable by any authenticated user (owner or staff), per decision.
-- ---------------------------------------------------------------------------
create or replace function public.remove_product(p_product_id uuid)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  v_has_sales boolean;
begin
  select exists(select 1 from public.sales where product_id = p_product_id)
    into v_has_sales;

  if v_has_sales then
    update public.products set archived_at = now() where id = p_product_id;
    return 'archived';
  else
    delete from public.products where id = p_product_id;
    return 'deleted';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Grants — authenticated only (owner or staff), consistent with 0005/0006.
-- ---------------------------------------------------------------------------
revoke execute on function public.create_sale(uuid, text, numeric, integer, uuid, numeric, text) from public;
revoke execute on function public.update_sale(uuid, uuid, text, numeric, integer, numeric, text) from public;
revoke execute on function public.record_payment(uuid, numeric, boolean) from public;
revoke execute on function public.remove_product(uuid) from public;

grant execute on function public.create_sale(uuid, text, numeric, integer, uuid, numeric, text) to authenticated;
grant execute on function public.update_sale(uuid, uuid, text, numeric, integer, numeric, text) to authenticated;
grant execute on function public.record_payment(uuid, numeric, boolean) to authenticated;
grant execute on function public.remove_product(uuid) to authenticated;
