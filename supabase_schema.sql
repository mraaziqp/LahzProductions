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

-- 8. Fix services category constraint to match app tab filters
ALTER TABLE services DROP CONSTRAINT IF EXISTS services_category_check;
ALTER TABLE services ADD CONSTRAINT services_category_check
  CHECK (category IN ('Restoration', 'Manufacturing', 'SpecializedCare'));

-- 9. Seed: Services
INSERT INTO services (title, category, short_description, icon_name) VALUES
  ('Upholstery Restoration',    'Restoration',     'Complete reupholstering, redesigning, and upgrading of heritage and modern furniture.',           'Sofa'),
  ('Leather Care & Repair',     'Restoration',     'Master restoration for leather: re-dyeing, crack/burn repairs, polishing, and deep conditioning.', 'Wind'),
  ('Recliner & Sofa Repair',    'Restoration',     'Expert mechanical and structural repairs for recliners and weighted lounge suites.',               'Settings'),
  ('Custom Manufacturing',      'Manufacturing',   'Bespoke headboards, ottomans, sofas, and chairs designed and built to your exact specs.',          'Hammer'),
  ('Automotive Upholstery',     'Manufacturing',   'Complete car interior transformations: seats, panels, and roof linings.',                          'Car'),
  ('Outdoor Solutions',         'Manufacturing',   'Custom pool covers and outdoor seating using premium UV and water-resistant fabrics.',              'Sun'),
  ('Professional Deep Cleaning','SpecializedCare', 'Surgical-grade cleaning for furniture, carpets, and mattresses removing all allergens.',            'ShieldCheck'),
  ('Specialized Equipment',     'SpecializedCare', 'Hospital-grade steam and extraction equipment for odour, mould, and stain elimination.',            'Stethoscope'),
  ('Glass & Surface Care',      'SpecializedCare', 'High-clarity cleaning for mirrors, windows, and hard surfaces leaving zero streaks.',               'GlassWater');

-- 10. Seed: Testimonials
INSERT INTO testimonials (client_name, location, service_rendered, quote) VALUES
  ('Priya Naidoo',      'Claremont, Cape Town', 'Deep Cleaning',          'They cleaned my 5-year-old L-shape couch and it honestly looks brand new. No smells, no stains. Absolutely blown away.'),
  ('Mark van der Berg', 'Durbanville',          'Custom Manufacturing',   'Had a custom headboard made from scratch. The craftsmanship is next level — perfectly fitted, incredible fabric choice.'),
  ('Fatima Adams',      'Maitland',             'Upholstery Restoration', 'Brought in my late grandmother''s dining chairs. They restored them beautifully while keeping all the original character. Sentimental and stunning.'),
  ('James Hendricks',   'Sea Point',            'Leather Care & Repair',  'My leather sofa had deep cracks and fading. They re-dyed and conditioned it — looks better than when I first bought it.'),
  ('Siyanda Dube',      'Bellville',            'Automotive Upholstery',  'Full car interior redo. Stitching is tight, the finish is clean. Every person who gets in my car comments on it.');

-- 11. Seed: Projects (Before/After Gallery)
INSERT INTO projects (title, location, category, before_image_url, after_image_url) VALUES
  ('Vintage Leather Couch Restoration', 'Sea Point',     'Craftsmanship',
   'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=800',
   'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&q=80&w=800'),
  ('Deep Clean & Sanitization',         'Tamboerskloof', 'Cleaning',
   'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=800',
   'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&q=80&w=800'),
  ('Custom Dining Chair Set',           'Constantia',    'Craftsmanship',
   'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?auto=format&fit=crop&q=80&w=800',
   'https://images.unsplash.com/photo-1551298370-9d3d53740c72?auto=format&fit=crop&q=80&w=800'),
  ('Mattress & Carpet Deep Clean',      'Pinelands',     'Cleaning',
   'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&q=80&w=800',
   'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=800');

-- 12. Seed: Sample Jobs (for Job Tracker testing)
INSERT INTO jobs (tracking_code, client_name, item_description, status) VALUES
  ('JB001', 'Priya Naidoo',     '3-Seater Grey Couch — Deep Clean',             'Ready for Delivery'),
  ('JB002', 'Mark van der Berg','Custom King Headboard — Charcoal Linen',        'Quality Check'),
  ('JB003', 'Fatima Adams',     '6x Dining Chairs — Full Reupholster in Cream',  'In Progress'),
  ('JB004', 'James Hendricks',  'Leather 2-Seater — Re-dye & Condition',         'Scheduled');

-- 13. Storage Setup
-- IMPORTANT: Run the section below in your Supabase SQL Editor (Dashboard → SQL Editor)

-- Create the storage bucket (public so images are accessible via URL)
INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery-images', 'gallery-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read/view uploaded images (needed for public gallery)
CREATE POLICY "Public read gallery images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'gallery-images' );

-- Allow authenticated admins to upload images
CREATE POLICY "Admin upload gallery images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'gallery-images' );

-- Allow authenticated admins to delete images
CREATE POLICY "Admin delete gallery images"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'gallery-images' );

-- Allow authenticated admins to update images
CREATE POLICY "Admin update gallery images"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'gallery-images' );
