-- ============================================================
-- LAHZ Productions — Quote Requests Migration
-- ============================================================
-- HOW TO RUN THIS:
--   1. Go to https://supabase.com and open your project
--   2. Click "SQL Editor" in the left sidebar
--   3. Click "+ New query"
--   4. Copy ALL of this file and paste it in
--   5. Click "Run"
--   6. You should see "Success. No rows returned." or similar
-- ============================================================

CREATE TABLE IF NOT EXISTS quote_requests (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_code   TEXT    UNIQUE NOT NULL,
  client_name  TEXT    NOT NULL,
  client_phone TEXT    NOT NULL,
  suburb       TEXT,
  service_category TEXT,           -- "Deep Cleaning" or "Upholstery/Repair"
  item_description TEXT,           -- e.g. "3-Seater Couch" or "2x Dining Chair"
  status       TEXT    DEFAULT 'pending',  -- pending | quoted | accepted | declined
  quoted_price TEXT,               -- free text, e.g. "R1 200 – R1 500"
  admin_note   TEXT,               -- optional note from Moulana to client
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE quote_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (customer) can submit a new quote request
CREATE POLICY "Public submit quote"
ON quote_requests FOR INSERT TO anon
WITH CHECK (true);

-- Anyone can read a quote by its code (needed for acceptance page)
CREATE POLICY "Public view quote"
ON quote_requests FOR SELECT TO anon
USING (true);

-- Customer can accept or decline their quote (only when status = 'quoted')
CREATE POLICY "Client respond to quote"
ON quote_requests FOR UPDATE TO anon
USING (status = 'quoted')
WITH CHECK (status IN ('accepted', 'declined'));

-- Admin (logged-in) has full access
CREATE POLICY "Admin full access to quotes"
ON quote_requests FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================================
-- Done! Run this once. You do not need to run it again.
-- ============================================================
