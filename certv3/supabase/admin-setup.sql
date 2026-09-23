-- Run this AFTER creating the admin user in Supabase Authentication > Users.
-- Replace the email only. Never put the admin password in this file.
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('role', 'admin')
where email = 'YOUR_ADMIN_EMAIL';

-- Verify the role was applied:
select id, email, raw_app_meta_data
from auth.users
where email = 'YOUR_ADMIN_EMAIL';
