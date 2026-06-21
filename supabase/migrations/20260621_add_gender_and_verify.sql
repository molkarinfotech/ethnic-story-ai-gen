-- ============================================================
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add gender column if it doesn't already exist
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT NULL
  CHECK (gender IN ('women', 'men', 'kids', 'unisex') OR gender IS NULL);

CREATE INDEX IF NOT EXISTS idx_products_gender ON products (gender);

-- 2. Verify: show all products with their gender and first product_image
SELECT
  p.id,
  p.name,
  p.gender,
  p.image AS legacy_image,
  (
    SELECT pi.url
    FROM product_images pi
    WHERE pi.product_id = p.id
    ORDER BY pi.sort_order ASC
    LIMIT 1
  ) AS first_gallery_image
FROM products p
ORDER BY p.created_at DESC;
