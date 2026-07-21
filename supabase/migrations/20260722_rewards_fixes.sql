-- ============================================================
-- Migration: Fix rewards system schema gaps
-- ============================================================
-- Safe to re-run (all statements are idempotent).

-- ── 1. user_points_summary view ──────────────────────────────
-- Used by /api/rewards/points and /api/rewards/redeem to get
-- total balance. Was never created — caused 500 on all reads.
create or replace view public.user_points_summary as
  select
    user_id,
    sum(points) as total_points
  from public.user_points
  group by user_id;

-- Allow authenticated users and service role to query the view
grant select on public.user_points_summary to authenticated, service_role;

-- ── 2. award_points RPC: add idempotency key support ─────────
-- /api/rewards/signup and /api/rewards/redeem pass p_idem_key
-- but the original RPC only accepted 4 params — caused a
-- Postgres "wrong number of arguments" error on every call.
create or replace function public.award_points(
  p_user_id  uuid,
  p_action   text,
  p_points   integer,
  p_ref_id   text    default null,
  p_idem_key text    default null   -- optional idempotency key
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_idem_key is not null then
    -- Idempotent insert: skip silently if this key was already used
    insert into public.user_points (user_id, action, points, ref_id, idempotency_key)
    values (p_user_id, p_action, p_points, p_ref_id, p_idem_key)
    on conflict (idempotency_key) do nothing;
  else
    insert into public.user_points (user_id, action, points, ref_id)
    values (p_user_id, p_action, p_points, p_ref_id);
  end if;
end;
$$;

grant execute on function public.award_points(uuid, text, integer, text, text)
  to authenticated, service_role;

-- ── 3. user_points: add idempotency_key column ───────────────
alter table public.user_points
  add column if not exists idempotency_key text;

-- Unique constraint so ON CONFLICT works
create unique index if not exists idx_user_points_idem_key
  on public.user_points (idempotency_key)
  where idempotency_key is not null;

-- ── 4. reward_redemptions: fix column name mismatch ──────────
-- Code inserts `points_spent` but migration created column `points`.
-- Add points_spent; keep old `points` col for safety (backwards compat).
alter table public.reward_redemptions
  add column if not exists points_spent integer;

-- Back-fill points_spent from points for any existing rows
update public.reward_redemptions
  set points_spent = points
  where points_spent is null and points is not null;

-- ── 5. reward_redemptions: add redeemed_at column ────────────
-- Code selects `redeemed_at` but only `created_at` existed.
alter table public.reward_redemptions
  add column if not exists redeemed_at timestamptz default now();

-- Back-fill from created_at for existing rows
update public.reward_redemptions
  set redeemed_at = created_at
  where redeemed_at is null;

-- ── 6. orders: add tracking columns ──────────────────────────
-- admin/orders/[id] PATCH writes these but columns never existed.
alter table public.orders
  add column if not exists tracking_number  text,
  add column if not exists shipping_carrier text;

comment on column public.orders.tracking_number  is 'Courier tracking number for shipped orders';
comment on column public.orders.shipping_carrier is 'Carrier name, e.g. Australia Post, StarTrack';
