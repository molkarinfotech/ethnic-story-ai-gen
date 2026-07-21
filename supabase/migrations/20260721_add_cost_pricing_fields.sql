-- Migration: 20260721_add_cost_pricing_fields
-- Adds admin-only cost/pricing fields to the products table.
-- These columns are NEVER selected by public storefront APIs.
-- Calculated columns (2x, 2.5x, profit) are derived in the UI only.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS cost_inr         NUMERIC,
  ADD COLUMN IF NOT EXISTS landed_cost_aud  NUMERIC;

-- Optional: add comments for documentation
COMMENT ON COLUMN products.cost_inr        IS 'Wholesale cost in Indian Rupees (admin-only, never exposed to public)';
COMMENT ON COLUMN products.landed_cost_aud IS 'Total landed cost in AUD including shipping/duties (admin-only)';
