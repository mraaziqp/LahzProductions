-- ============================================================
-- LAHZ Productions — Fix: Grant table permissions for quote_requests
-- ============================================================
-- Run this in Supabase SQL Editor if quotes aren't saving.
-- Supabase requires explicit GRANT statements in addition to
-- RLS policies for the anon role to INSERT/UPDATE.
-- ============================================================

GRANT SELECT, INSERT ON public.quote_requests TO anon;
GRANT UPDATE ON public.quote_requests TO anon;
GRANT ALL ON public.quote_requests TO authenticated;

-- ============================================================
-- Done! Run this once.
-- ============================================================
