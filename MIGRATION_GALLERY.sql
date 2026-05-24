-- ============================================================
-- LAHZ Productions — Migration: Add gallery_images to projects
-- ============================================================
-- HOW TO RUN THIS:
--   1. Go to https://supabase.com and open your project
--   2. Click "SQL Editor" in the left sidebar
--   3. Click "+ New query"
--   4. Copy ALL of this file and paste it in
--   5. Click "Run"
--   6. You should see "Success. No rows returned." or similar
-- ============================================================

-- Add a text array column to store multiple gallery image URLs.
-- Existing projects are unaffected (column defaults to NULL).
ALTER TABLE projects ADD COLUMN IF NOT EXISTS gallery_images TEXT[];

-- ============================================================
-- Done! Run this once. The gallery slideshow feature is now live.
-- ============================================================
