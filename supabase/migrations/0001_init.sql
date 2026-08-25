-- SaleBook initial schema
-- Tables: profiles, products, sales, stock_adjustments
-- See PRD.md Section 8 for the product-level data model this implements.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles
-- One row per auth.users row. Holds display name + role (owner/staff).
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  role text not null check (role in ('owner', 'staff')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Helper: is the current user an owner?
create or replace function public.is_owner()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'owner'
  );
$$;

create policy "profiles: authenticated users can read all profiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles: users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid());

create policy "profiles: owners can insert profiles"
  on public.profiles for insert
  to authenticated
  with check (public.is_owner());

create policy "profiles: owners can delete staff profiles"
  on public.profiles for delete
  to authenticated
  using (public.is_owner() and role = 'staff');

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'Other',
  default_price numeric(12, 2) not null default 0,
  stock_quantity integer not null default 0,
  low_stock_threshold integer not null default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;

create policy "products: authenticated users can read"
  on public.products for select
  to authenticated
  using (true);

create policy "products: owners can insert"
  on public.products for insert
  to authenticated
  with check (public.is_owner());

create policy "products: owners can update"
  on public.products for update
  to authenticated
  using (public.is_owner());

create policy "products: owners can delete"
  on public.products for delete
  to authenticated
  using (public.is_owner());

-- ---------------------------------------------------------------------------
-- sales
-- product_id is nullable to support one-off / custom items (see PRD 6.1).
-- ---------------------------------------------------------------------------
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products (id) on delete set null,
  custom_item_name text,
  unit_price numeric(12, 2) not null,
  quantity integer not null default 1,
  total_price numeric(12, 2) generated always as (unit_price * quantity) stored,
  sold_by uuid not null references public.profiles (id),
  sold_at timestamptz not null default now(),
  edited_at timestamptz,
  created_at timestamptz not null default now(),
  constraint sale_item_present check (
    product_id is not null or custom_item_name is not null
  )
);

alter table public.sales enable row level security;

create index if not exists sales_sold_at_idx on public.sales (sold_at desc);
create index if not exists sales_product_id_idx on public.sales (product_id);

create policy "sales: authenticated users can read"
  on public.sales for select
  to authenticated
  using (true);

create policy "sales: authenticated users can insert"
  on public.sales for insert
  to authenticated
  with check (true);

create policy "sales: authenticated users can update"
  on public.sales for update
  to authenticated
  using (true);

create policy "sales: authenticated users can delete"
  on public.sales for delete
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- stock_adjustments (restocks — a light trail, not a full audit log)
-- ---------------------------------------------------------------------------
create table if not exists public.stock_adjustments (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  quantity_added integer not null,
  adjusted_by uuid not null references public.profiles (id),
  adjusted_at timestamptz not null default now()
);

alter table public.stock_adjustments enable row level security;

create policy "stock_adjustments: authenticated users can read"
  on public.stock_adjustments for select
  to authenticated
  using (true);

create policy "stock_adjustments: authenticated users can insert"
  on public.stock_adjustments for insert
  to authenticated
  with check (true);

-- ---------------------------------------------------------------------------
-- keep products.updated_at fresh
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row
  execute function public.set_updated_at();
