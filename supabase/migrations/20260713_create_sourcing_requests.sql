-- Sourcing requests table
CREATE TABLE IF NOT EXISTS public.sourcing_requests (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text,
  email       text        NOT NULL,
  description text        NOT NULL,
  image_url   text,
  status      text        NOT NULL DEFAULT 'pending',
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sourcing_requests ENABLE ROW LEVEL SECURITY;

-- Public can submit
CREATE POLICY "Anyone can submit sourcing request"
  ON public.sourcing_requests FOR INSERT
  WITH CHECK (true);

-- Only service role reads (admin)
CREATE POLICY "Service role reads sourcing requests"
  ON public.sourcing_requests FOR SELECT
  USING (false);

-- Storage bucket (run manually in Supabase dashboard if not exists)
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('sourcing-requests', 'sourcing-requests', true)
-- ON CONFLICT (id) DO NOTHING;
