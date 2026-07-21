-- Add variant-level columns to restock_notifications
ALTER TABLE restock_notifications
  ADD COLUMN IF NOT EXISTS variant_id   UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS size         TEXT,
  ADD COLUMN IF NOT EXISTS colour       TEXT;

-- Unique constraint for variant-level deduplication
ALTER TABLE restock_notifications
  DROP CONSTRAINT IF EXISTS restock_notifications_email_variant_id_key;
ALTER TABLE restock_notifications
  ADD CONSTRAINT restock_notifications_email_variant_id_key
  UNIQUE (email, variant_id);

-- Existing product-level constraint (kept for global OOS case)
-- email + product_id constraint should already exist from prior migration
