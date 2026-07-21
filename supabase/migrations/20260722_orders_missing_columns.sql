-- Migration: add missing columns to orders table
-- payment_method, shipping_cost, fulfillment_status, notes
-- All statements use IF NOT EXISTS — safe to re-run.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method     TEXT,
  ADD COLUMN IF NOT EXISTS shipping_cost      NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fulfillment_status TEXT,
  ADD COLUMN IF NOT EXISTS notes              TEXT;

COMMENT ON COLUMN public.orders.payment_method     IS 'card | cash | eftpos | payid';
COMMENT ON COLUMN public.orders.shipping_cost      IS 'Shipping cost in AUD';
COMMENT ON COLUMN public.orders.fulfillment_status IS 'pending | fulfilled | delivered';
COMMENT ON COLUMN public.orders.notes              IS 'Admin / instore order notes';
