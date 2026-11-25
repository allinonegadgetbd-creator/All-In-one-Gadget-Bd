-- Run this SQL in your Supabase SQL Editor (Project: nrwelgnjmkomdginctex)
-- Creates persistent tables, RLS policies, and safe order tracking RPC

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

create index if not exists idx_orders_created_at on public.orders (created_at desc);
create index if not exists idx_orders_order_number on public.orders (order_number);

-- Enable Row Level Security
alter table public.store_state enable row level security;
alter table public.orders enable row level security;

-- Public storefront read access for catalog/banners/settings; only authenticated admins can edit
drop policy if exists "Public read store_state" on public.store_state;
create policy "Public read store_state"
  on public.store_state for select
  to anon, authenticated
  using (true);

drop policy if exists "Admin write store_state" on public.store_state;
create policy "Admin write store_state"
  on public.store_state for all
  to authenticated
  using (true)
  with check (true);

-- Anyone can place an order; only authenticated admins can list/update/delete orders
drop policy if exists "Public insert orders" on public.orders;
create policy "Public insert orders"
  on public.orders for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Admin manage orders" on public.orders;
create policy "Admin manage orders"
  on public.orders for all
  to authenticated
  using (true)
  with check (true);

-- Safe public order tracking RPC (matches order_number + last 4 phone digits only)
create or replace function public.track_order_public(p_order_number text, p_phone_last4 text)
returns table (
  order_number text,
  status text,
  customer_name text,
  items jsonb,
  total integer,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    o.order_number,
    o.status,
    o.customer_name,
    o.items,
    o.total,
    o.created_at
  from public.orders o
  where upper(o.order_number) = upper(trim(p_order_number))
    and length(regexp_replace(p_phone_last4, '\D', '', 'g')) >= 4
    and right(regexp_replace(o.customer_phone, '\D', '', 'g'), 4) = right(regexp_replace(p_phone_last4, '\D', '', 'g'), 4)
  limit 1;
$$;
