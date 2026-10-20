-- ============================================================
-- LAHZ Productions — Security Migration: protect client data
-- ============================================================
-- WHY: Before this migration, anyone with the public website key
-- could download EVERY job and quote request (client names and
-- phone numbers), and could change the price on any quote while
-- "accepting" it.
--
-- After this migration logged-out visitors can only:
--   * read ONE job, by sending its exact tracking code
--   * read ONE quote, by sending its exact quote code
--   * accept/decline that quote (status column only)
--   * submit a new quote request
-- The website sends the code in the "x-lookup-code" request header and
-- the policies below only return the row that matches it. Column grants
-- hide phone numbers and internal fields from visitors.
-- The logged-in admin keeps full access.
--
-- Also fixes the Supabase Security Advisor warnings.
--
-- HOW TO RUN THIS: Supabase → SQL Editor → New query → paste → Run.
-- Safe to run more than once.
-- ============================================================

-- Code sent by the website for this request (NULL if none)
CREATE OR REPLACE FUNCTION public.request_lookup_code()
RETURNS TEXT
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT current_setting('request.headers', true)::json ->> 'x-lookup-code';
$$;

-- 1. Jobs
DROP POLICY IF EXISTS "Public read jobs by code" ON public.jobs;
DROP POLICY IF EXISTS "Admin read jobs" ON public.jobs;
DROP POLICY IF EXISTS "Visitor read job by code" ON public.jobs;

CREATE POLICY "Admin read jobs" ON public.jobs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Visitor read job by code" ON public.jobs
  FOR SELECT TO anon USING (tracking_code = public.request_lookup_code());

REVOKE ALL ON public.jobs FROM anon;
GRANT SELECT (tracking_code, client_name, item_description, status, wip_image_url, latest_note)
  ON public.jobs TO anon;

-- 2. Quote requests
DROP POLICY IF EXISTS "Public submit quote"        ON public.quote_requests;
DROP POLICY IF EXISTS "Public view quote"          ON public.quote_requests;
DROP POLICY IF EXISTS "Client respond to quote"    ON public.quote_requests;
DROP POLICY IF EXISTS "Visitor submit quote"       ON public.quote_requests;
DROP POLICY IF EXISTS "Visitor read quote by code" ON public.quote_requests;
DROP POLICY IF EXISTS "Visitor respond to quote"   ON public.quote_requests;

CREATE POLICY "Visitor submit quote" ON public.quote_requests
  FOR INSERT TO anon
  WITH CHECK (
    status = 'pending' AND quoted_price IS NULL AND admin_note IS NULL
    AND char_length(trim(client_name)) BETWEEN 1 AND 120
    AND char_length(client_phone) BETWEEN 9 AND 30
  );
CREATE POLICY "Visitor read quote by code" ON public.quote_requests
  FOR SELECT TO anon USING (quote_code = public.request_lookup_code());
CREATE POLICY "Visitor respond to quote" ON public.quote_requests
  FOR UPDATE TO anon
  USING (quote_code = public.request_lookup_code() AND status = 'quoted')
  WITH CHECK (status IN ('accepted', 'declined'));

REVOKE ALL ON public.quote_requests FROM anon;
GRANT INSERT (quote_code, client_name, client_phone, suburb, service_category, item_description)
  ON public.quote_requests TO anon;
GRANT SELECT (quote_code, client_name, item_description, status, quoted_price, admin_note)
  ON public.quote_requests TO anon;
GRANT UPDATE (status) ON public.quote_requests TO anon;

-- 3. Storage: public buckets serve files by URL without any policy.
--    The public SELECT policies only let anyone LIST every uploaded file.
DROP POLICY IF EXISTS "Public read gallery images" ON storage.objects;
DROP POLICY IF EXISTS "Public read wip photos"     ON storage.objects;
DROP POLICY IF EXISTS "Admin read gallery images"  ON storage.objects;
DROP POLICY IF EXISTS "Admin read wip photos"      ON storage.objects;
CREATE POLICY "Admin read gallery images" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'gallery-images');
CREATE POLICY "Admin read wip photos" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'wip-photos');

-- 4. Security Advisor fixes
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';
-- Supabase's event-trigger helper; the database runs it itself, API users never need to
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

-- ============================================================
-- Done! Check: the website's "Track Job" box and quote links
-- still work, and the admin dashboard is unchanged.
-- ============================================================
