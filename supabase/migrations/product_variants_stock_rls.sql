-- Ensure stock_count is readable publicly (for product pages) but only writable by service_role
-- Adjust to match your existing RLS policies.

-- Allow anyone to read variants (product pages need stock levels to show in-stock/out-of-stock)
alter table product_variants enable row level security;

drop policy if exists "public read variants" on product_variants;
create policy "public read variants"
  on product_variants for select
  using (true);

-- No direct update from client — all writes go through service_role (webhook)
-- service_role bypasses RLS by default so no extra policy needed.
