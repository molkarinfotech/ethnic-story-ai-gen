-- New table: per-colour images for each product
-- Run this AFTER the previous migrations

CREATE TABLE IF NOT EXISTS product_images (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  colour        TEXT NOT NULL DEFAULT '',   -- '' means "all colours" / ungrouped
  url           TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product_colour
  ON product_images (product_id, colour, sort_order);

-- Optional: migrate any existing images[] arrays from products table into product_images
-- (safe to run even if images[] is empty)
INSERT INTO product_images (product_id, colour, url, sort_order)
SELECT
  p.id,
  '',
  unnested.url,
  ROW_NUMBER() OVER (PARTITION BY p.id ORDER BY p.created_at) - 1 AS sort_order
FROM products p,
  LATERAL unnest(p.images) WITH ORDINALITY AS unnested(url, ord)
WHERE p.images IS NOT NULL AND array_length(p.images, 1) > 0
ON CONFLICT DO NOTHING;
