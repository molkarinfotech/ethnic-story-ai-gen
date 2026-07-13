-- ============================================================
-- Migration: product_likes, product_reviews, user_points,
--            reward_redemptions + award_points RPC
-- ============================================================

-- ── product_likes ────────────────────────────────────────────
create table if not exists public.product_likes (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (product_id, user_id)
);

alter table public.product_likes enable row level security;

create policy "Anyone can read likes"
  on public.product_likes for select using (true);

create policy "Authenticated users can like"
  on public.product_likes for insert
  with check (auth.uid() = user_id);

create policy "Users can unlike their own"
  on public.product_likes for delete
  using (auth.uid() = user_id);

create index if not exists idx_likes_product on public.product_likes (product_id);
create index if not exists idx_likes_user    on public.product_likes (user_id);

-- ── product_reviews ──────────────────────────────────────────
create table if not exists public.product_reviews (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  rating      smallint not null check (rating between 1 and 5),
  body        text,
  updated_at  timestamptz,
  created_at  timestamptz not null default now(),
  unique (product_id, user_id)  -- one review per user per product
);

alter table public.product_reviews enable row level security;

create policy "Anyone can read reviews"
  on public.product_reviews for select using (true);

create policy "Authenticated users can insert review"
  on public.product_reviews for insert
  with check (auth.uid() = user_id);

create policy "Users can update own review"
  on public.product_reviews for update
  using (auth.uid() = user_id);

create policy "Users can delete own review"
  on public.product_reviews for delete
  using (auth.uid() = user_id);

create index if not exists idx_reviews_product on public.product_reviews (product_id);
create index if not exists idx_reviews_user    on public.product_reviews (user_id);

-- ── user_points ───────────────────────────────────────────────
create table if not exists public.user_points (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  action     text not null,  -- signup | order | like | review | redeem
  points     integer not null,
  ref_id     text,           -- order_id, product_id, etc.
  created_at timestamptz not null default now()
);

alter table public.user_points enable row level security;

create policy "Users can read own points"
  on public.user_points for select
  using (auth.uid() = user_id);

-- Service role inserts only (via award_points RPC / API routes)
create index if not exists idx_points_user on public.user_points (user_id);

-- ── reward_redemptions ────────────────────────────────────────
create table if not exists public.reward_redemptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  points       integer not null,
  discount_aud numeric(8,2) not null,
  coupon_code  text not null unique,
  used_at      timestamptz,
  created_at   timestamptz not null default now()
);

alter table public.reward_redemptions enable row level security;

create policy "Users can read own redemptions"
  on public.reward_redemptions for select
  using (auth.uid() = user_id);

create index if not exists idx_redemptions_user on public.reward_redemptions (user_id);

-- ── award_points RPC ──────────────────────────────────────────
-- Called with service-role from API routes (bypasses RLS)
create or replace function public.award_points(
  p_user_id uuid,
  p_action  text,
  p_points  integer,
  p_ref_id  text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_points (user_id, action, points, ref_id)
  values (p_user_id, p_action, p_points, p_ref_id);
end;
$$;

-- Grant execute to authenticated and service roles
grant execute on function public.award_points(uuid, text, integer, text)
  to authenticated, service_role;
