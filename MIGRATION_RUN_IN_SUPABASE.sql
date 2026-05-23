-- ============================================================
-- LAHZ Productions — Required Database Migration
-- ============================================================
-- HOW TO RUN THIS:
--   1. Go to https://supabase.com and open your project
--   2. Click "SQL Editor" in the left sidebar
--   3. Click "+ New query"
--   4. Copy ALL of this file and paste it in
--   5. Click "Run"
--   6. You should see "Success. No rows returned." or similar
--   7. Refresh your website — the Job Tracker will now work correctly
-- ============================================================

-- Step 1: Add wip_image_url and latest_note columns to jobs table
--         (These store the progress photo URL and update notes)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS wip_image_url TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS latest_note   TEXT;

-- Step 2: Add client_phone column (optional — used for direct WhatsApp sending)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS client_phone  TEXT;

-- Step 3: Upgrade the job_status enum to 5 production stages
--         (The old enum only had 4 values; Prepping/Stripping and In Production are new)
ALTER TABLE jobs ALTER COLUMN status TYPE TEXT;
DROP TYPE IF EXISTS job_status CASCADE;

CREATE TYPE job_status AS ENUM (
  'Scheduled',
  'Prepping/Stripping',
  'In Production',
  'Quality Check',
  'Ready for Delivery'
);

-- Migrate any existing rows using the old 'In Progress' value
UPDATE jobs SET status = 'In Production' WHERE status = 'In Progress';

-- Convert the text column back to the new enum type
ALTER TABLE jobs ALTER COLUMN status TYPE job_status USING status::job_status;

-- Step 4: Create the WIP photos storage bucket
--         (This bucket stores progress photos uploaded from the Job Manager)
INSERT INTO storage.buckets (id, name, public)
VALUES ('wip-photos', 'wip-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view wip photos (needed for customer tracking page)
CREATE POLICY "Public read wip photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'wip-photos');

-- Allow logged-in admin to upload wip photos
CREATE POLICY "Admin upload wip photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'wip-photos');

-- Allow logged-in admin to replace wip photos
CREATE POLICY "Admin update wip photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'wip-photos');

-- Allow logged-in admin to delete wip photos
CREATE POLICY "Admin delete wip photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'wip-photos');

-- ============================================================
-- Done! Run this once. You do not need to run it again.
-- ============================================================
