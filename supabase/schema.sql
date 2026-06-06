-- ============================================================================
--  VoltMarket — Supabase schema
--  Run this in your Supabase project: SQL Editor → New query → paste → Run.
--  Safe to run more than once.
-- ============================================================================

-- ----------------------------------------------------------------- tables ---
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  category    text,
  kind        text,
  sku         text,
  price       numeric not null default 0,
  cost        numeric not null default 0,
  stock       integer not null default 0,
  condition   text not null default 'new',          -- 'new' | 'used'
  grade       text,                                  -- used grade, e.g. 'Good'
  images      text[] not null default '{}',          -- public image URLs
  description text,
  created_at  timestamptz not null default now()
);

create table if not exists public.orders (
  id         uuid primary key default gen_random_uuid(),
  code       text,                                   -- human friendly e.g. ORD-1a2b3c4d
  customer   text,
  email      text,
  address    text,
  total      numeric not null default 0,
  status     text not null default 'pending',        -- pending|processing|shipped|delivered
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name       text,
  qty        integer not null default 1,
  price      numeric not null default 0
);

-- ------------------------------------------------------------------- rpcs ---
-- Atomically validate stock, write the order + items, and decrement stock.
-- SECURITY DEFINER lets anonymous shoppers place orders without table-write
-- access, while everything happens in one transaction.
create or replace function public.place_order(
  p_customer text, p_email text, p_address text, p_items jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  it        jsonb;
  v_total   numeric := 0;
  v_order   uuid;
  v_code    text;
  v_stock   integer;
begin
  if jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty';
  end if;

  -- lock rows + validate
  for it in select * from jsonb_array_elements(p_items) loop
    select stock into v_stock from public.products
      where id = (it->>'id')::uuid for update;
    if v_stock is null then raise exception 'Product no longer exists'; end if;
    if v_stock < (it->>'qty')::int then
      raise exception 'Not enough stock for %', it->>'name';
    end if;
    v_total := v_total + (it->>'price')::numeric * (it->>'qty')::int;
  end loop;

  insert into public.orders(customer, email, address, total)
    values (p_customer, p_email, p_address, v_total)
    returning id into v_order;

  v_code := 'ORD-' || substr(replace(v_order::text, '-', ''), 1, 8);
  update public.orders set code = v_code where id = v_order;

  for it in select * from jsonb_array_elements(p_items) loop
    insert into public.order_items(order_id, product_id, name, qty, price)
      values (v_order, (it->>'id')::uuid, it->>'name', (it->>'qty')::int, (it->>'price')::numeric);
    update public.products
      set stock = stock - (it->>'qty')::int
      where id = (it->>'id')::uuid;
  end loop;

  return jsonb_build_object('id', v_order, 'code', v_code, 'total', v_total, 'status', 'pending');
end;
$$;

grant execute on function public.place_order(text, text, text, jsonb) to anon, authenticated;

-- Adjust stock by a delta (used by the Inventory restock buttons).
create or replace function public.adjust_stock(p_id uuid, p_delta integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_new integer;
begin
  update public.products set stock = greatest(0, stock + p_delta)
    where id = p_id returning stock into v_new;
  return v_new;
end;
$$;

grant execute on function public.adjust_stock(uuid, integer) to authenticated;

-- -------------------------------------------------------------------- rls ---
alter table public.products    enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

-- Products: anyone can read (the public shop); only logged-in admins write.
drop policy if exists "products read"   on public.products;
drop policy if exists "products manage" on public.products;
create policy "products read"   on public.products for select using (true);
create policy "products manage" on public.products for all to authenticated using (true) with check (true);

-- Orders: only logged-in admins can read/update. (Inserts happen via place_order.)
drop policy if exists "orders read"   on public.orders;
drop policy if exists "orders update" on public.orders;
create policy "orders read"   on public.orders for select to authenticated using (true);
create policy "orders update" on public.orders for update to authenticated using (true);

drop policy if exists "items read" on public.order_items;
create policy "items read" on public.order_items for select to authenticated using (true);

-- --------------------------------------------------------------- storage ---
insert into storage.buckets (id, name, public)
  values ('product-images', 'product-images', true)
  on conflict (id) do nothing;

drop policy if exists "images public read" on storage.objects;
drop policy if exists "images upload"      on storage.objects;
drop policy if exists "images delete"      on storage.objects;
create policy "images public read" on storage.objects for select using (bucket_id = 'product-images');
create policy "images upload" on storage.objects for insert to authenticated with check (bucket_id = 'product-images');
create policy "images delete" on storage.objects for delete to authenticated using (bucket_id = 'product-images');

-- ------------------------------------------------------- sample products ---
-- Optional starter listings (delete this block if you don't want them).
insert into public.products (name, category, kind, sku, price, cost, stock, condition, grade, description)
select * from (values
  ('Samsung-Style French Door Fridge','Fridges & Freezers','fridge','FRG-FD600',899,560,6,'new',null,'600L frost-free, water & ice dispenser. Brand new, boxed.'),
  ('Bosch Larder Fridge (Used)','Fridges & Freezers','fridge','FRG-BSH18',180,70,2,'used','Good','Tall larder fridge, tested and cleaned. Minor marks. 3-month warranty.'),
  ('55" 4K Smart TV','TVs','tv','TV-55UHD',429,280,11,'new',null,'55-inch 4K HDR, built-in streaming, voice remote. Sealed.'),
  ('43" LED TV (Used)','TVs','tv','TV-43LED',150,60,4,'used','Like New','Barely used 43-inch Full HD TV. Stand and remote included.'),
  ('8kg Washing Machine (Used)','Washing & Drying','washer','WSH-8KG',160,60,3,'used','Good','1400 spin, reconditioned and tested. East London delivery.'),
  ('900W Solo Microwave','Kitchen','microwave','KTN-MW900',79,34,18,'new',null,'20L, 5 power levels, defrost. New with warranty.'),
  ('Gaming Laptop 16GB / RTX','Computers','laptop','CMP-GMX16',1099,760,5,'new',null,'15.6" 144Hz, 16GB RAM, 1TB SSD, dedicated graphics. New.'),
  ('Business Laptop i5 (Used)','Computers','laptop','CMP-BZ15',240,110,7,'used','Good','Refurbished i5, 8GB RAM, 256GB SSD, Windows 11.'),
  ('Smartphone 128GB','Phones','phone','PHN-128',699,470,9,'new',null,'6.5" OLED, 128GB, dual camera. New, unlocked.'),
  ('Smartphone 64GB (Used)','Phones','phone','PHN-64U',120,45,4,'used','Fair','Unlocked, fully working. Visible wear on frame.'),
  ('Bluetooth Speaker','Audio','speaker','AUD-BT1',74.99,30,22,'new',null,'IP67 waterproof, 24h battery, 360 sound. New.'),
  ('Mirrorless Camera (Used)','Cameras','camera','CAM-ML1',420,240,2,'used','Like New','24MP mirrorless + kit lens. Low shutter count, boxed.')
) as v
where not exists (select 1 from public.products);
