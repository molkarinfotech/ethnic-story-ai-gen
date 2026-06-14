-- Optional: atomic RPC alternative to direct UPDATE (use if concurrent order volume is high)
-- Run this in the Supabase SQL editor if you want fully atomic decrements.

create or replace function decrement_variant_stock(
  p_variant_id uuid,
  p_quantity    int
)
returns void
language plpgsql
security definer
as $$
begin
  update product_variants
  set    stock_count = greatest(0, stock_count - p_quantity)
  where  id = p_variant_id;
end;
$$;

-- Grant to service role only (webhook uses service key)
revoke execute on function decrement_variant_stock from public, anon, authenticated;
grant  execute on function decrement_variant_stock to service_role;
