-- Transactional helpers so a sale's stock side-effects (decrement on sale,
-- restore on delete, delta-adjust on edit) can never partially apply.
-- See PRD.md Section 6.1 and 6.4.

-- ---------------------------------------------------------------------------
-- create_sale: inserts a sale, decrementing product stock if product_id set.
-- ---------------------------------------------------------------------------
create or replace function public.create_sale(
  p_product_id uuid,
  p_custom_item_name text,
  p_unit_price numeric,
  p_quantity integer,
  p_sold_by uuid
)
returns public.sales
language plpgsql
security invoker
as $$
declare
  v_sale public.sales;
begin
  if p_product_id is not null then
    update public.products
      set stock_quantity = stock_quantity - p_quantity
      where id = p_product_id;
  end if;

  insert into public.sales (product_id, custom_item_name, unit_price, quantity, sold_by)
  values (p_product_id, p_custom_item_name, p_unit_price, p_quantity, p_sold_by)
  returning * into v_sale;

  return v_sale;
end;
$$;

-- ---------------------------------------------------------------------------
-- update_sale: edits a sale, adjusting stock by the delta between the old
-- and new (product, quantity) so stock never drifts.
-- ---------------------------------------------------------------------------
create or replace function public.update_sale(
  p_sale_id uuid,
  p_product_id uuid,
  p_custom_item_name text,
  p_unit_price numeric,
  p_quantity integer
)
returns public.sales
language plpgsql
security invoker
as $$
declare
  v_old public.sales;
  v_sale public.sales;
begin
  select * into v_old from public.sales where id = p_sale_id;
  if not found then
    raise exception 'Sale % not found', p_sale_id;
  end if;

  -- Restore stock for the old line (if it referenced a product).
  if v_old.product_id is not null then
    update public.products
      set stock_quantity = stock_quantity + v_old.quantity
      where id = v_old.product_id;
  end if;

  -- Deduct stock for the new line (if it references a product).
  if p_product_id is not null then
    update public.products
      set stock_quantity = stock_quantity - p_quantity
      where id = p_product_id;
  end if;

  update public.sales
    set product_id = p_product_id,
        custom_item_name = p_custom_item_name,
        unit_price = p_unit_price,
        quantity = p_quantity,
        edited_at = now()
    where id = p_sale_id
    returning * into v_sale;

  return v_sale;
end;
$$;

-- ---------------------------------------------------------------------------
-- delete_sale: deletes a sale, restoring stock if it referenced a product.
-- ---------------------------------------------------------------------------
create or replace function public.delete_sale(p_sale_id uuid)
returns void
language plpgsql
security invoker
as $$
declare
  v_old public.sales;
begin
  select * into v_old from public.sales where id = p_sale_id;
  if not found then
    return;
  end if;

  if v_old.product_id is not null then
    update public.products
      set stock_quantity = stock_quantity + v_old.quantity
      where id = v_old.product_id;
  end if;

  delete from public.sales where id = p_sale_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- restock_product: increases stock and logs the adjustment.
-- ---------------------------------------------------------------------------
create or replace function public.restock_product(
  p_product_id uuid,
  p_quantity_added integer,
  p_adjusted_by uuid
)
returns public.products
language plpgsql
security invoker
as $$
declare
  v_product public.products;
begin
  update public.products
    set stock_quantity = stock_quantity + p_quantity_added
    where id = p_product_id
    returning * into v_product;

  if not found then
    raise exception 'Product % not found', p_product_id;
  end if;

  insert into public.stock_adjustments (product_id, quantity_added, adjusted_by)
  values (p_product_id, p_quantity_added, p_adjusted_by);

  return v_product;
end;
$$;
