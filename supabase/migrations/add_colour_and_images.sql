-- Run this in the Supabase SQL editor

-- 1. Add colour to product_variants (optional, defaults to empty string for existing rows)
ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS colour TEXT NOT NULL DEFAULT '';

-- 2. Add images array to products (additional images beyond the primary `image` column)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS images TEXT[] NOT NULL DEFAULT '{}';

-- 3. Index for colour lookups
CREATE INDEX IF NOT EXISTS idx_product_variants_colour
  ON product_variants (product_id, colour);
