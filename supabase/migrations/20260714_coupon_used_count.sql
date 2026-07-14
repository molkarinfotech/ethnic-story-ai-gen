-- Migration: coupons table + orders coupon columns + used_count RPC
-- Run this in Supabase SQL editor or via the Supabase CLI migrations workflow.
-- All statements are idempotent (safe to re-run).

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Create coupons table
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.coupons (
  id               uuid primary key default gen_random_uuid(),
  code             text not null,
  description      text,
  discount_type    text not null check (discount_type in ('percentage', 'fixed')),
  discount_value   numeric(10, 2) not null check (discount_value > 0),
  min_order_amount numeric(10, 2),
  max_uses         integer,
  used_count       integer not null default 0,
  active           boolean not null default true,
  expires_at       timestamptz,
  created_at       timestamptz not null default now()
);

-- Unique, case-insensitive code index
create unique index if not exists coupons_code_unique
  on public.coupons (upper(code));

comment on table  public.coupons                  is 'Discount coupon codes redeemable at checkout';
comment on column public.coupons.code             is 'Uppercase coupon code, e.g. SUMMER20';
comment on column public.coupons.discount_type    is 'percentage = % off subtotal, fixed = flat $ off';
comment on column public.coupons.discount_value   is 'e.g. 20 for 20% or $20 off';
comment on column public.coupons.min_order_amount is 'Minimum cart subtotal required to redeem';
comment on column public.coupons.max_uses         is 'NULL = unlimited uses';
comment on column public.coupons.used_count       is 'Number of times this coupon has been successfully used';

-- RLS: service_role has full access; anon/authenticated can only read active coupons via validate-coupon API
alter table public.coupons enable row level security;

drop policy if exists "service_role full access" on public.coupons;
create policy "service_role full access"
  on public.coupons
  for all
  to service_role
  using (true)
  with check (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Add coupon tracking columns to orders
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.orders
  add column if not exists coupon_code     text,
  add column if not exists discount_amount numeric(10, 2);

comment on column public.orders.coupon_code     is 'Coupon code applied at checkout, if any';
comment on column public.orders.discount_amount is 'Discount amount in AUD applied at checkout';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RPC to atomically increment used_count (avoids race conditions)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.increment_coupon_usage(p_code text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.coupons
  set used_count = used_count + 1
  where upper(trim(code)) = upper(trim(p_code));
$$;

grant execute on function public.increment_coupon_usage(text) to service_role;
