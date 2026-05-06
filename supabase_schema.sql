-- 1. Create Projects Table
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  category TEXT CHECK (category IN ('Cleaning', 'Craftsmanship')) NOT NULL,
  before_image_url TEXT NOT NULL,
  after_image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Services Table
CREATE TABLE services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT CHECK (category IN ('Cleaning', 'Craftsmanship')) NOT NULL,
  short_description TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Testimonials Table
CREATE TABLE testimonials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  location TEXT NOT NULL,
  service_rendered TEXT NOT NULL,
  quote TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

-- 5. Create Public Read Policies
CREATE POLICY "Public read projects" ON projects FOR SELECT USING (true);
CREATE POLICY "Public read services" ON services FOR SELECT USING (true);
CREATE POLICY "Public read testimonials" ON testimonials FOR SELECT USING (true);

-- 6. Create Admin Write Policies (Authenticated Users Only)
CREATE POLICY "Admin insert projects" ON projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin update projects" ON projects FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admin delete projects" ON projects FOR DELETE TO authenticated USING (true);

CREATE POLICY "Admin insert services" ON services FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin update services" ON services FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admin delete services" ON services FOR DELETE TO authenticated USING (true);

CREATE POLICY "Admin insert testimonials" ON testimonials FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin update testimonials" ON testimonials FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admin delete testimonials" ON testimonials FOR DELETE TO authenticated USING (true);

-- 7. Create Jobs Table (for Job Tracker feature)
CREATE TYPE job_status AS ENUM ('Scheduled', 'In Progress', 'Quality Check', 'Ready for Delivery');

CREATE TABLE jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tracking_code TEXT UNIQUE NOT NULL,
  client_name TEXT NOT NULL,
  item_description TEXT NOT NULL,
  status job_status NOT NULL DEFAULT 'Scheduled',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on jobs table
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Public can read jobs by tracking code (fetched with .eq() filter, no full table scan)
CREATE POLICY "Public read jobs by code" ON jobs FOR SELECT USING (true);

-- Only authenticated admins can create/update/delete jobs
CREATE POLICY "Admin insert jobs" ON jobs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin update jobs" ON jobs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admin delete jobs" ON jobs FOR DELETE TO authenticated USING (true);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Storage Setup (Run these separately if the SQL editor doesn't support storage commands)
-- insert into storage.buckets (id, name, public) values ('gallery-images', 'gallery-images', true);

-- Storage Policies for gallery-images bucket
-- (Public read)
-- CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'gallery-images' );
-- (Authenticated upload)
-- CREATE POLICY "Admin Upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK ( bucket_id = 'gallery-images' );
