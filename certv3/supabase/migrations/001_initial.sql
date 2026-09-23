create extension if not exists pgcrypto;

create sequence if not exists certificate_number_seq;

create table if not exists public.certificate_templates (
  id uuid primary key default gen_random_uuid(),
  template_name text not null,
  template_file_url text not null,
  template_width integer not null check (template_width > 0),
  template_height integer not null check (template_height > 0),
  name_x numeric not null default 0,
  name_y numeric not null default 0,
  name_width numeric not null default 500,
  name_height numeric not null default 100,
  font_family text not null default 'Arial',
  font_size numeric not null default 72,
  font_weight integer not null default 600 check (font_weight between 100 and 900),
  text_alignment text not null default 'center' check (text_alignment in ('left','center','right')),
  text_color text not null default '#111827',
  letter_spacing numeric not null default 0,
  line_height numeric not null default 1.1,
  allow_multiline boolean not null default false,
  min_font_size numeric not null default 24,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  certificate_id text not null unique,
  recipient_name text not null,
  normalized_name text not null,
  template_id uuid not null references public.certificate_templates(id) on delete restrict,
  status text not null default 'active' check (status in ('active','revoked','draft')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.certificate_downloads (
  id uuid primary key default gen_random_uuid(),
  certificate_id uuid not null references public.certificates(id) on delete cascade,
  downloaded_at timestamptz not null default now(),
  download_status text not null default 'success',
  user_agent text,
  device_type text,
  browser text,
  approximate_location_if_available text,
  session_identifier text
);

create table if not exists public.admin_activity (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  certificate_id uuid references public.certificates(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_certificates_certificate_id on public.certificates(certificate_id);
create index if not exists idx_certificates_normalized_name on public.certificates(normalized_name);
create index if not exists idx_certificates_created_at on public.certificates(created_at desc);
create index if not exists idx_certificates_template_id on public.certificates(template_id);
create index if not exists idx_downloads_certificate_id on public.certificate_downloads(certificate_id);
create index if not exists idx_downloads_downloaded_at on public.certificate_downloads(downloaded_at desc);
create index if not exists idx_admin_activity_created_at on public.admin_activity(created_at desc);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
drop trigger if exists certificates_updated_at on public.certificates;
create trigger certificates_updated_at before update on public.certificates for each row execute function public.set_updated_at();
drop trigger if exists templates_updated_at on public.certificate_templates;
create trigger templates_updated_at before update on public.certificate_templates for each row execute function public.set_updated_at();

create or replace function public.next_certificate_id() returns text language plpgsql as $$
declare n bigint; begin n:=nextval('public.certificate_number_seq'); return 'CTF26-'||lpad(n::text,6,'0'); end $$;

create or replace function public.assign_certificate_id() returns trigger language plpgsql as $$ begin if new.certificate_id is null or new.certificate_id='' then new.certificate_id:=public.next_certificate_id(); end if; return new; end $$;
drop trigger if exists certificates_assign_id on public.certificates;
create trigger certificates_assign_id before insert on public.certificates for each row execute function public.assign_certificate_id();

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$ select coalesce((auth.jwt()->'app_metadata'->>'role')='admin',false) $$;

alter table public.certificates enable row level security;
alter table public.certificate_templates enable row level security;
alter table public.certificate_downloads enable row level security;
alter table public.admin_activity enable row level security;

drop policy if exists public_read_active_certificates on public.certificates;
create policy public_read_active_certificates on public.certificates for select to anon,authenticated using (status='active');
drop policy if exists admin_all_certificates on public.certificates;
create policy admin_all_certificates on public.certificates for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists public_read_active_templates on public.certificate_templates;
create policy public_read_active_templates on public.certificate_templates for select to anon,authenticated using (is_active=true);
drop policy if exists admin_all_templates on public.certificate_templates;
create policy admin_all_templates on public.certificate_templates for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists admin_read_downloads on public.certificate_downloads;
create policy admin_read_downloads on public.certificate_downloads for select to authenticated using (public.is_admin());
drop policy if exists admin_all_activity on public.admin_activity;
create policy admin_all_activity on public.admin_activity for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.record_certificate_download(p_certificate_id uuid,p_user_agent text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from public.certificates where id=p_certificate_id and status='active') then raise exception 'Certificate not found'; end if;
  insert into public.certificate_downloads(certificate_id,user_agent,device_type,browser,session_identifier)
  values(p_certificate_id,p_user_agent,case when p_user_agent ilike '%mobile%' then 'Mobile' when p_user_agent ilike '%tablet%' then 'Tablet' else 'Desktop' end,case when p_user_agent ilike '%edg%' then 'Edge' when p_user_agent ilike '%chrome%' then 'Chrome' when p_user_agent ilike '%firefox%' then 'Firefox' when p_user_agent ilike '%safari%' then 'Safari' else 'Other' end,gen_random_uuid()::text);
end $$;
grant execute on function public.record_certificate_download(uuid,text) to anon,authenticated;


create or replace function public.log_admin_activity(p_action text,p_certificate_id uuid default null)
returns void language plpgsql security definer set search_path=public as $$ begin if not public.is_admin() then raise exception 'Unauthorized'; end if; insert into public.admin_activity(admin_user_id,action,certificate_id) values(auth.uid(),p_action,p_certificate_id); end $$;
grant execute on function public.log_admin_activity(text,uuid) to authenticated;

insert into storage.buckets(id,name,public) values('certificate-templates','certificate-templates',true) on conflict (id) do nothing;

drop policy if exists admin_upload_templates on storage.objects;
create policy admin_upload_templates on storage.objects for insert to authenticated with check (bucket_id='certificate-templates' and public.is_admin());
drop policy if exists admin_update_templates on storage.objects;
create policy admin_update_templates on storage.objects for update to authenticated using (bucket_id='certificate-templates' and public.is_admin()) with check (bucket_id='certificate-templates' and public.is_admin());
drop policy if exists admin_delete_templates on storage.objects;
create policy admin_delete_templates on storage.objects for delete to authenticated using (bucket_id='certificate-templates' and public.is_admin());
drop policy if exists public_read_templates_storage on storage.objects;
create policy public_read_templates_storage on storage.objects for select to anon,authenticated using (bucket_id='certificate-templates');

drop policy if exists public_read_active_certificates on public.certificates;
create or replace function public.search_certificate(p_query text)
returns table(id uuid,certificate_id text,recipient_name text,template_id uuid,status text,created_at timestamptz,updated_at timestamptz)
language sql security definer set search_path=public as $$
  select c.id,c.certificate_id,c.recipient_name,c.template_id,c.status,c.created_at,c.updated_at
  from public.certificates c
  where c.status='active' and (c.certificate_id=trim(p_query) or c.normalized_name=lower(trim(p_query)))
  order by c.created_at desc limit 20;
$$;
grant execute on function public.search_certificate(text) to anon,authenticated;
alter table public.certificate_templates add column if not exists font_file_url text;

do $$ begin alter publication supabase_realtime add table public.certificate_downloads; exception when duplicate_object then null; end $$;

-- Public feedback: intentionally minimal data collection.
create table if not exists public.public_feedback (
  id uuid primary key default gen_random_uuid(),
  rating smallint not null check (rating between 1 and 5),
  message text not null check (char_length(message) between 5 and 1000),
  certificate_id text,
  status text not null default 'new' check (status in ('new','read')),
  created_at timestamptz not null default now()
);
create index if not exists idx_public_feedback_created_at on public.public_feedback(created_at desc);
create index if not exists idx_public_feedback_status on public.public_feedback(status);

alter table public.public_feedback enable row level security;
drop policy if exists admin_read_feedback on public.public_feedback;
create policy admin_read_feedback on public.public_feedback for select to authenticated using (public.is_admin());
drop policy if exists admin_update_feedback on public.public_feedback;
create policy admin_update_feedback on public.public_feedback for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop function if exists public.submit_public_feedback(smallint,text,text);
create or replace function public.submit_public_feedback(p_rating smallint,p_message text,p_certificate_id text default null)
returns void language plpgsql security definer set search_path=public as $$
begin
  if p_rating < 1 or p_rating > 5 then raise exception 'Invalid rating'; end if;
  if char_length(trim(p_message)) < 5 or char_length(trim(p_message)) > 1000 then raise exception 'Invalid feedback'; end if;
  insert into public.public_feedback(rating,message,certificate_id)
  values(p_rating,trim(p_message),nullif(trim(p_certificate_id),''));
end $$;
grant execute on function public.submit_public_feedback(smallint,text,text) to anon,authenticated;

-- One compact server-side stats query keeps the dashboard fast and avoids shipping all rows to the browser.
drop function if exists public.admin_dashboard_stats();
create or replace function public.admin_dashboard_stats()
returns jsonb language plpgsql security definer set search_path=public as $$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'Unauthorized'; end if;
  select jsonb_build_object(
    'live_certificates',(select count(*) from public.certificates where status='active'),
    'revoked_certificates',(select count(*) from public.certificates where status='revoked'),
    'draft_certificates',(select count(*) from public.certificates where status='draft'),
    'total_downloads',(select count(*) from public.certificate_downloads where download_status='success'),
    'downloads_today',(select count(*) from public.certificate_downloads where download_status='success' and downloaded_at >= date_trunc('day',now())),
    'downloads_week',(select count(*) from public.certificate_downloads where download_status='success' and downloaded_at >= now()-interval '7 days'),
    'downloads_month',(select count(*) from public.certificate_downloads where download_status='success' and downloaded_at >= date_trunc('month',now())),
    'unique_downloaded_certificates',(select count(distinct certificate_id) from public.certificate_downloads where download_status='success'),
    'templates',(select count(*) from public.certificate_templates),
    'feedback_total',(select count(*) from public.public_feedback),
    'feedback_unread',(select count(*) from public.public_feedback where status='new')
  ) into result;
  return result;
end $$;
grant execute on function public.admin_dashboard_stats() to authenticated;
