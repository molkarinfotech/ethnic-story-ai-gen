-- Migration: 20260722_add_notify_type_subcategory
-- Adds two missing columns that were referenced in code but never migrated.
--
-- 1. restock_notifications.notify_type
--    Used by /api/notify-restock to distinguish 'restock' vs 'coming_soon'
--    alert types. Defaults to 'restock' so all existing rows are valid.
--
-- 2. products.subcategory
--    Used by admin product CRUD and the product page breadcrumb.
--    e.g. a product with category='accessories' may have subcategory='jewellery'.

-- Bug #2 fix: notify_type column on restock_notifications
ALTER TABLE public.restock_notifications
  ADD COLUMN IF NOT EXISTS notify_type TEXT NOT NULL DEFAULT 'restock';

COMMENT ON COLUMN public.restock_notifications.notify_type IS
  'Alert type: ''restock'' (out-of-stock) or ''coming_soon'' (pre-launch). Defaults to restock.';

-- Bug #3 fix: subcategory column on products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS subcategory TEXT;

CREATE INDEX IF NOT EXISTS idx_products_subcategory
  ON public.products (subcategory);

COMMENT ON COLUMN public.products.subcategory IS
  'Optional sub-classification within a category, e.g. jewellery within accessories.';
