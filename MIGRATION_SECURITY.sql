-- ============================================================
-- LAHZ Productions — Security Migration: protect client data
-- ============================================================
-- WHY: Before this migration, anyone with the public website key
-- could download EVERY job and quote request (client names and
-- phone numbers), and could change the price on any quote while
-- "accepting" it.
--
-- After this migration the public can only:
--   * look up ONE job by its exact tracking code
--   * look up ONE quote by its exact quote code
--   * accept/decline a quote (status only — nothing else)
--   * submit a new quote request
-- The logged-in admin keeps full access.
--
-- HOW TO RUN THIS:
--   1. Go to https://supabase.com and open your project
--   2. Click "SQL Editor" in the left sidebar
--   3. Click "+ New query"
--   4. Copy ALL of this file and paste it in
--   5. Click "Run"
-- Safe to run more than once.
-- ============================================================

-- 1. Customer job lookup (only the fields the tracking page shows)
CREATE OR REPLACE FUNCTION public.track_job(code TEXT)
RETURNS TABLE (
  tracking_code    TEXT,
  client_name      TEXT,
  item_description TEXT,
  status           TEXT,
  wip_image_url    TEXT,
  latest_note      TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT j.tracking_code, j.client_name, j.item_description, j.status::TEXT,
         j.wip_image_url, j.latest_note
  FROM jobs j
  WHERE j.tracking_code = upper(trim(code))
  LIMIT 1;
$$;

-- 2. Customer quote lookup
CREATE OR REPLACE FUNCTION public.get_quote(code TEXT)
RETURNS TABLE (
  quote_code       TEXT,
  client_name      TEXT,
  item_description TEXT,
  status           TEXT,
  quoted_price     TEXT,
  admin_note       TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT q.quote_code, q.client_name, q.item_description, q.status,
         q.quoted_price, q.admin_note
  FROM quote_requests q
  WHERE q.quote_code = upper(trim(code))
  LIMIT 1;
$$;

-- 3. Customer accepts or declines a priced quote (status only)
CREATE OR REPLACE FUNCTION public.respond_to_quote(code TEXT, response TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF response NOT IN ('accepted', 'declined') THEN
    RAISE EXCEPTION 'Invalid response';
  END IF;
  UPDATE quote_requests SET status = response
  WHERE quote_code = upper(trim(code)) AND status = 'quoted';
  RETURN FOUND;
END;
$$;

-- 4. Customer submits a quote request; returns the new quote code
CREATE OR REPLACE FUNCTION public.submit_quote_request(
  p_client_name      TEXT,
  p_client_phone     TEXT,
  p_suburb           TEXT,
  p_service_category TEXT,
  p_item_description TEXT
)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  chars    CONSTANT TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  new_code TEXT;
BEGIN
  IF length(trim(coalesce(p_client_name, ''))) = 0
     OR length(regexp_replace(coalesce(p_client_phone, ''), '\D', '', 'g')) NOT BETWEEN 9 AND 12 THEN
    RAISE EXCEPTION 'Name and a valid phone number are required';
  END IF;

  FOR attempt IN 1..5 LOOP
    new_code := 'QT-';
    FOR i IN 1..5 LOOP
      new_code := new_code || substr(chars, 1 + floor(random() * length(chars))::INT, 1);
    END LOOP;
    BEGIN
      INSERT INTO quote_requests (quote_code, client_name, client_phone, suburb, service_category, item_description)
      VALUES (new_code,
              left(trim(p_client_name), 120),
              left(trim(p_client_phone), 30),
              left(trim(p_suburb), 120),
              left(trim(p_service_category), 60),
              left(trim(p_item_description), 300));
      RETURN new_code;
    EXCEPTION WHEN unique_violation THEN
      -- code collision, try another
    END;
  END LOOP;
  RAISE EXCEPTION 'Could not generate a unique quote code';
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_job(TEXT)                                TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_quote(TEXT)                                TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_quote(TEXT, TEXT)                   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_quote_request(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- 5. Lock down direct table access for the public
DROP POLICY IF EXISTS "Public read jobs by code" ON jobs;
DROP POLICY IF EXISTS "Admin read jobs" ON jobs;
CREATE POLICY "Admin read jobs" ON jobs FOR SELECT TO authenticated USING (true);
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.jobs FROM anon;

DROP POLICY IF EXISTS "Public submit quote"     ON quote_requests;
DROP POLICY IF EXISTS "Public view quote"       ON quote_requests;
DROP POLICY IF EXISTS "Client respond to quote" ON quote_requests;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.quote_requests FROM anon;

-- ============================================================
-- Done! Check: the website's "Track Job" box and quote links
-- should still work, and the admin dashboard is unchanged.
-- ============================================================
