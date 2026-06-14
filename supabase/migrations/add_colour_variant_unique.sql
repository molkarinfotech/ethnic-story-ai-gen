-- Run AFTER add_colour_and_images.sql
-- Drop the old unique constraint (product_id, size) and add (product_id, size, colour)
-- so the same size can exist in multiple colours.

-- 1. Drop existing unique index/constraint if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'product_variants_product_id_size_key'
  ) THEN
    ALTER TABLE product_variants DROP CONSTRAINT product_variants_product_id_size_key;
  END IF;
END;
$$;

-- 2. Add new unique constraint
ALTER TABLE product_variants
  ADD CONSTRAINT product_variants_product_id_size_colour_key
  UNIQUE (product_id, size, colour);
