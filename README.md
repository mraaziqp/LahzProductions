# LAHZ Productions

Website for LAHZ Productions, an upholstery and deep cleaning business in Cape Town:
https://www.lahzproductions.co.za

React + Vite + Tailwind, with Supabase for data, auth and image storage. Hosted on Vercel.

## Run locally

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in the Supabase URL and anon key.
3. `npm run dev`, then open http://localhost:3000

`npm run lint` type-checks and `npm run build` builds for production.

## Database

Run these in the Supabase SQL Editor, in order, on a new project:

1. `supabase_schema.sql`: tables, policies, storage buckets
2. `MIGRATION_RUN_IN_SUPABASE.sql`: job tracker columns
3. `MIGRATION_QUOTES.sql` and `FIX_QUOTE_GRANTS.sql`: quote requests
4. `MIGRATION_GALLERY.sql`: gallery slideshows
5. `MIGRATION_SECURITY.sql`: limits logged-out visitors to looking up a single job or quote by its code

## Domains

`www.lahzproductions.co.za` is the primary domain and the bare `lahzproductions.co.za`
redirects to it. DNS is at GoDaddy and must point only at Vercel:

| Type  | Name | Value                                              |
|-------|------|----------------------------------------------------|
| A     | @    | the IP Vercel shows under Project → Settings → Domains |
| CNAME | www  | the `*.vercel-dns-*.com` target Vercel shows       |

Any other `@` A record (for example GoDaddy's parked or "Website Builder" records)
makes some visitors land on a GoDaddy "Launching Soon" page.

See `ADMIN_GUIDE.md` for how to use the admin dashboard.
