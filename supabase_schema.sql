-- Run this SQL in your Supabase SQL Editor (Project: nrwelgnjmkomdginctex)
-- Creates persistent tables for store settings/catalog and orders

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

-- Enable Row Level Security (only server secret key reads/writes directly)
alter table public.store_state enable row level security;
alter table public.orders enable row level security;
