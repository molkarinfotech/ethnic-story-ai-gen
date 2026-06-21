-- Add gender column to products table
-- Run this in the Supabase SQL editor

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT NULL
  CHECK (gender IN ('women', 'men', 'kids', 'unisex') OR gender IS NULL);

-- Index for fast gender-based collection filtering
CREATE INDEX IF NOT EXISTS idx_products_gender ON products (gender);

-- Backfill: if your seed products have no gender set and belong to
-- a gendered category, you can optionally run this to assign them:
-- UPDATE products SET gender = 'women' WHERE category IN ('sarees','lehengas') AND gender IS NULL;
-- UPDATE products SET gender = 'kids'  WHERE category = 'kids'   AND gender IS NULL;
