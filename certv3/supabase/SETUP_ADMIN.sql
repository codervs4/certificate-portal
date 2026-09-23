-- ONE-TIME ADMIN SETUP
-- 1) Create the admin user first in Supabase Dashboard -> Authentication -> Users.
-- 2) Replace YOUR_ADMIN_EMAIL below with that exact login email.
-- 3) Run this entire file in Supabase SQL Editor.
-- 4) Sign out of the website and sign in again.

UPDATE auth.users
SET raw_app_meta_data =
    COALESCE(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('role', 'admin')
WHERE lower(email) = lower('YOUR_ADMIN_EMAIL');

-- Verify: this must return one row with role = admin.
SELECT id, email, raw_app_meta_data->>'role' AS role
FROM auth.users
WHERE lower(email) = lower('YOUR_ADMIN_EMAIL');
