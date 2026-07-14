-- Migration: coupon used_count increment RPC + orders coupon columns
-- Run this in Supabase SQL editor or via the Supabase CLI migrations workflow.

-- 1. Add coupon tracking columns to orders (idempotent)
alter table public.orders
  add column if not exists coupon_code     text,
  add column if not exists discount_amount numeric(10, 2);

comment on column public.orders.coupon_code     is 'Coupon code applied at checkout, if any';
comment on column public.orders.discount_amount is 'Discount amount in AUD applied at checkout';

-- 2. RPC to atomically increment used_count (avoids race conditions)
create or replace function public.increment_coupon_usage(p_code text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.coupons
  set used_count = used_count + 1
  where code = upper(trim(p_code));
$$;

-- Grant execute to the service role used by the webhook
grant execute on function public.increment_coupon_usage(text) to service_role;
