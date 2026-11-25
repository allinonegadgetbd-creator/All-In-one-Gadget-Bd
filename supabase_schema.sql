-- Run this SQL once in your Supabase SQL Editor (Project: nrwelgnjmkomdginctex)
-- Creates/upgrades persistent tables, grants table privileges, enforces strict RLS policies, and enables realtime alerts

create table if not exists public.store_state (
  id text primary key default 'default',
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id text primary key,
  order_number text not null unique,
  customer_name text not null,
  customer_phone text not null,
  customer_address text not null,
  division text,
  delivery_zone text not null,
  items jsonb not null,
  subtotal integer not null,
  tier_discount integer not null default 0,
  coupon_code text,
  coupon_discount integer not null default 0,
  delivery_charge integer not null default 0,
  total integer not null,
  status text not null default 'Pending',
  notes text,
  created_at timestamptz not null default now()
);

alter table public.orders add column if not exists division text;

create index if not exists idx_orders_created_at on public.orders (created_at desc);
create index if not exists idx_orders_order_number on public.orders (order_number);

-- Required Postgres role grants so anon & authenticated API requests pass permission checks before RLS runs
grant usage on schema public to anon, authenticated;
grant select on public.store_state to anon, authenticated;
grant insert, update, delete on public.store_state to authenticated;
grant insert on public.orders to anon, authenticated;
grant select, update, delete on public.orders to authenticated;

-- Enable Row Level Security
alter table public.store_state enable row level security;
alter table public.orders enable row level security;

-- Public storefront read access for catalog/banners/settings; only authenticated admins can edit
drop policy if exists "Public read store_state" on public.store_state;
create policy "Public read store_state"
  on public.store_state for select
  to anon, authenticated
  using (id = 'default');

drop policy if exists "Admin write store_state" on public.store_state;
create policy "Admin write store_state"
  on public.store_state for all
  to authenticated
  using (true)
  with check (id = 'default');

-- Customers can only submit validated Pending orders (no numbers in name, valid 11-digit 01 phone);
-- only authenticated admins can read/update/delete orders
drop policy if exists "Public insert orders" on public.orders;
create policy "Public insert orders"
  on public.orders for insert
  to anon, authenticated
  with check (
    status = 'Pending'
    and subtotal >= 0
    and total >= 0
    and length(trim(customer_name)) >= 2
    and customer_name !~ '[0-9]'
    and trim(customer_phone) ~ '^01[3-9][0-9]{8}$'
    and length(trim(customer_address)) >= 5
  );

drop policy if exists "Admin manage orders" on public.orders;
create policy "Admin manage orders"
  on public.orders for all
  to authenticated
  using (true)
  with check (true);

-- Enable live order notifications in Supabase Realtime safely
do $$
begin
  alter publication supabase_realtime add table public.orders;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
