-- Dashboard upgrade: product variants, staff archiving, and shop pausing.
-- Ported from the JOHTA (commercial SaleBook) codebase's equivalent
-- migrations, adapted to this single-tenant schema (no shop_id anywhere).

-- ---------------------------------------------------------------------------
-- 1. Product variants — one product, several priced/stocked sizes.
--
-- Variants are OPTIONAL. A product with none behaves exactly as before,
-- using products.default_price and products.stock_quantity.
-- ---------------------------------------------------------------------------
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  label text not null,
  price numeric(12, 2) not null default 0,
  stock_quantity integer not null default 0,
  low_stock_threshold integer not null default 5,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists product_variants_product_id_idx
  on public.product_variants (product_id);

alter table public.product_variants enable row level security;

create policy "product_variants: authenticated users can read"
  on public.product_variants for select
  to authenticated
  using (true);

create policy "product_variants: owners can insert"
  on public.product_variants for insert
  to authenticated
  with check (public.is_owner());

create policy "product_variants: owners can update"
  on public.product_variants for update
  to authenticated
  using (public.is_owner());

create policy "product_variants: owners can delete"
  on public.product_variants for delete
  to authenticated
  using (public.is_owner());

-- Which variant a sale was for. Null for sales of products with no variants,
-- so nothing existing breaks.
alter table public.sales
  add column if not exists variant_id uuid references public.product_variants (id);

create index if not exists sales_variant_id_idx on public.sales (variant_id);

-- ---------------------------------------------------------------------------
-- 2. Variant-aware sale functions (create_sale/update_sale/delete_sale),
--    preserving the payment fields added in 0007. When a sale names a
--    variant, stock moves on the VARIANT and the product's own
--    stock_quantity is left alone; when it doesn't, behaviour is unchanged.
-- ---------------------------------------------------------------------------
drop function if exists public.create_sale(uuid, text, numeric, integer, uuid, numeric, text);
drop function if exists public.update_sale(uuid, uuid, text, numeric, integer, numeric, text);

create or replace function public.create_sale(
  p_product_id uuid,
  p_custom_item_name text,
  p_unit_price numeric,
  p_quantity integer,
  p_sold_by uuid,
  p_amount_paid numeric default null,
  p_debtor_name text default null,
  p_variant_id uuid default null
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
  v_paid := coalesce(p_amount_paid, v_total);
  if v_paid < 0 then v_paid := 0; end if;
  if v_paid > v_total then v_paid := v_total; end if;

  if p_variant_id is not null then
    update public.product_variants
      set stock_quantity = stock_quantity - p_quantity
      where id = p_variant_id;
  elsif p_product_id is not null then
    update public.products
      set stock_quantity = stock_quantity - p_quantity
      where id = p_product_id;
  end if;

  insert into public.sales
    (product_id, variant_id, custom_item_name, unit_price, quantity, sold_by,
     amount_paid, debtor_name)
  values
    (p_product_id, p_variant_id, p_custom_item_name, p_unit_price, p_quantity, p_sold_by,
     v_paid, nullif(btrim(coalesce(p_debtor_name,'')), ''))
  returning * into v_sale;

  return v_sale;
end;
$$;

create or replace function public.update_sale(
  p_sale_id uuid,
  p_product_id uuid,
  p_custom_item_name text,
  p_unit_price numeric,
  p_quantity integer,
  p_amount_paid numeric default null,
  p_debtor_name text default null,
  p_variant_id uuid default null
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

  -- Restore stock for the old line, deduct for the new.
  if v_old.variant_id is not null then
    update public.product_variants
      set stock_quantity = stock_quantity + v_old.quantity
      where id = v_old.variant_id;
  elsif v_old.product_id is not null then
    update public.products
      set stock_quantity = stock_quantity + v_old.quantity
      where id = v_old.product_id;
  end if;

  if p_variant_id is not null then
    update public.product_variants
      set stock_quantity = stock_quantity - p_quantity
      where id = p_variant_id;
  elsif p_product_id is not null then
    update public.products
      set stock_quantity = stock_quantity - p_quantity
      where id = p_product_id;
  end if;

  v_total := p_unit_price * p_quantity;
  v_paid := coalesce(p_amount_paid, v_old.amount_paid);
  if v_paid < 0 then v_paid := 0; end if;
  if v_paid > v_total then v_paid := v_total; end if;

  update public.sales
    set product_id = p_product_id,
        variant_id = p_variant_id,
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

create or replace function public.delete_sale(p_sale_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_old public.sales;
begin
  select * into v_old from public.sales where id = p_sale_id;
  if not found then
    return;
  end if;

  if v_old.variant_id is not null then
    update public.product_variants
      set stock_quantity = stock_quantity + v_old.quantity
      where id = v_old.variant_id;
  elsif v_old.product_id is not null then
    update public.products
      set stock_quantity = stock_quantity + v_old.quantity
      where id = v_old.product_id;
  end if;

  delete from public.sales where id = p_sale_id;
end;
$$;

-- Restocking a specific variant. restock_product() is untouched, for
-- products that have no variants.
create or replace function public.restock_variant(
  p_variant_id uuid,
  p_quantity_added integer,
  p_adjusted_by uuid
)
returns public.product_variants
language plpgsql
security definer set search_path = public
as $$
declare
  v_variant public.product_variants;
begin
  update public.product_variants
    set stock_quantity = stock_quantity + p_quantity_added
    where id = p_variant_id
    returning * into v_variant;

  if not found then
    raise exception 'Variant % not found', p_variant_id;
  end if;

  insert into public.stock_adjustments (product_id, quantity_added, adjusted_by)
  values (v_variant.product_id, p_quantity_added, p_adjusted_by);

  return v_variant;
end;
$$;

revoke execute on function public.create_sale(uuid, text, numeric, integer, uuid, numeric, text, uuid) from public;
revoke execute on function public.update_sale(uuid, uuid, text, numeric, integer, numeric, text, uuid) from public;
revoke execute on function public.restock_variant(uuid, integer, uuid) from public;

grant execute on function public.create_sale(uuid, text, numeric, integer, uuid, numeric, text, uuid) to authenticated;
grant execute on function public.update_sale(uuid, uuid, text, numeric, integer, numeric, text, uuid) to authenticated;
grant execute on function public.restock_variant(uuid, integer, uuid) to authenticated;

-- remove_product must also archive/delete the product's variants, since
-- product_variants.product_id cascades on delete but not on archive.
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
    update public.product_variants set archived_at = now()
      where product_id = p_product_id and archived_at is null;
    return 'archived';
  else
    delete from public.products where id = p_product_id;
    return 'deleted';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Staff archiving.
--
-- sales.sold_by references profiles with NO ACTION, so the database refuses
-- to delete anyone whose name is on a sale (i.e. every staff member who has
-- actually sold something) — the previous "remove staff" flow, which
-- hard-deleted the auth user, silently failed for exactly those people.
--
-- Staff are archived instead, exactly as products already are for the same
-- reason: their name stays on past sales, their access does not.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists removed_at timestamptz;

comment on column public.profiles.removed_at is
  'Set when the owner removes a staff member. The row is kept so past sales still say who sold them; the login is banned separately via the Auth Admin API.';

create index if not exists profiles_active_idx
  on public.profiles (role)
  where removed_at is null;

-- The staff list and every place that reads "all profiles" should exclude
-- archived staff by default going forward (enforced in application code —
-- RLS still allows reading them, since past sales need to resolve their name).

-- Revokes a removed user's live sessions immediately, rather than waiting for
-- their access token to expire on its own (up to an hour). Service-role only.
create or replace function public.revoke_user_sessions(target_user uuid)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  revoked integer;
begin
  with gone as (
    delete from auth.sessions where user_id = target_user returning 1
  )
  select count(*) into revoked from gone;

  delete from auth.refresh_tokens where user_id = target_user::text;

  return revoked;
end;
$$;

revoke execute on function public.revoke_user_sessions(uuid) from public;
revoke execute on function public.revoke_user_sessions(uuid) from anon, authenticated;
grant execute on function public.revoke_user_sessions(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 4. Pausing the shop.
--
-- Single-tenant, so this is one settings row rather than a column on a
-- shops table. Paused means: nobody (owner included) can use the app until
-- an owner reopens it from the /paused screen. Data is untouched.
-- ---------------------------------------------------------------------------
create table if not exists public.app_settings (
  id boolean primary key default true,
  constraint app_settings_singleton check (id),
  paused_at timestamptz,
  paused_by uuid references public.profiles (id)
);

insert into public.app_settings (id) values (true)
  on conflict (id) do nothing;

alter table public.app_settings enable row level security;

create policy "app_settings: authenticated users can read"
  on public.app_settings for select
  to authenticated
  using (true);

create policy "app_settings: owners can update"
  on public.app_settings for update
  to authenticated
  using (public.is_owner());
