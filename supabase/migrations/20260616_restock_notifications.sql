-- restock_notifications: stores email subscriptions for out-of-stock products
create table if not exists public.restock_notifications (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  product_id    uuid not null references public.products(id) on delete cascade,
  product_name  text not null,
  product_slug  text,
  notified      boolean not null default false,
  notified_at   timestamptz,
  created_at    timestamptz not null default now()
);

-- Unique constraint so a single email can't subscribe to the same product twice
create unique index if not exists restock_notifications_email_product_idx
  on public.restock_notifications(email, product_id);

-- Index for fast lookup when restocking: find all pending subscribers for a product
create index if not exists restock_notifications_product_pending_idx
  on public.restock_notifications(product_id) where notified = false;

-- RLS: only service role can read/write (no public access)
alter table public.restock_notifications enable row level security;

-- No public policies — service role bypasses RLS by default
comment on table public.restock_notifications is
  'Email subscriptions for out-of-stock product restock alerts';
