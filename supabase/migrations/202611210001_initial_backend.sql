begin;

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) >= 2),
  email text not null,
  role text not null default 'surveyor' check (role in ('master', 'surveyor')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.outlets (
  id uuid primary key default gen_random_uuid(),
  outlet_name text not null,
  pic_name text not null,
  store_name text not null,
  address text not null,
  phone text not null,
  email text not null,
  latitude numeric(10,7) check (latitude is null or latitude between -90 and 90),
  longitude numeric(10,7) check (longitude is null or longitude between -180 and 180),
  status text not null default 'aktif' check (status in ('aktif', 'nonaktif')),
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.survey_targets (
  id uuid primary key default gen_random_uuid(),
  surveyor_id uuid not null references public.profiles(id) on delete cascade,
  period_start date not null,
  target_count integer not null check (target_count >= 0),
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (surveyor_id, period_start)
);

create table if not exists public.survey_reports (
  id uuid primary key default gen_random_uuid(),
  surveyor_id uuid not null references public.profiles(id) on delete restrict default auth.uid(),
  surveyor_name text not null,
  outlet_id uuid not null references public.outlets(id) on delete restrict,
  recorded_at timestamptz not null default now(),
  answers jsonb not null check (jsonb_typeof(answers) = 'array' and jsonb_array_length(answers) = 9),
  evidence_path text not null,
  evidence_metadata jsonb not null default '{}'::jsonb,
  team_members text not null,
  attendance_confirmed boolean not null default false check (attendance_confirmed = true),
  presence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.change_requests (
  id uuid primary key default gen_random_uuid(),
  request_type text not null check (request_type in ('edit', 'delete')),
  report_id uuid references public.survey_reports(id) on delete set null,
  report_label text not null,
  requester_id uuid not null references public.profiles(id) on delete restrict default auth.uid(),
  requester_name text not null,
  proposed_data jsonb,
  reason text not null check (char_length(trim(reason)) >= 3),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  master_note text,
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((request_type = 'edit' and proposed_data is not null) or request_type = 'delete')
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text not null default 'Sistem',
  actor_role text not null default 'system',
  action text not null,
  entity_type text not null,
  entity_id text,
  description text not null,
  request_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists survey_reports_surveyor_idx on public.survey_reports(surveyor_id, created_at desc);
create index if not exists survey_reports_outlet_idx on public.survey_reports(outlet_id);
create index if not exists change_requests_requester_idx on public.change_requests(requester_id, created_at desc);
create index if not exists change_requests_status_idx on public.change_requests(status, created_at desc);
create index if not exists audit_logs_actor_idx on public.audit_logs(actor_id, created_at desc);
create index if not exists audit_logs_request_idx on public.audit_logs(request_id) where request_id is not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_master()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'master' and active = true
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    coalesce(new.email, ''),
    'surveyor'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles (id, full_name, email, role)
select
  id,
  coalesce(nullif(trim(raw_user_meta_data ->> 'full_name'), ''), split_part(email, '@', 1)),
  coalesce(email, ''),
  'surveyor'
from auth.users
on conflict (id) do nothing;

create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  row_data jsonb;
  previous_data jsonb;
  entity_value text;
  actor_profile public.profiles%rowtype;
  request_value uuid;
begin
  row_data := case when tg_op = 'DELETE' then '{}'::jsonb else to_jsonb(new) end;
  previous_data := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;
  entity_value := coalesce(row_data ->> 'id', previous_data ->> 'id');
  request_value := case when tg_table_name = 'change_requests' then entity_value::uuid else null end;

  select * into actor_profile from public.profiles where id = auth.uid();

  insert into public.audit_logs (
    actor_id, actor_name, actor_role, action, entity_type, entity_id,
    description, request_id, details
  ) values (
    auth.uid(),
    coalesce(actor_profile.full_name, 'Sistem'),
    coalesce(actor_profile.role, 'system'),
    lower(tg_op),
    tg_table_name,
    entity_value,
    case
      when tg_op = 'INSERT' then 'Membuat data ' || tg_table_name
      when tg_op = 'UPDATE' then 'Memperbarui data ' || tg_table_name
      when tg_op = 'DELETE' then 'Menghapus data ' || tg_table_name
    end,
    request_value,
    jsonb_build_object('before', previous_data, 'after', row_data)
  );
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists outlets_updated_at on public.outlets;
create trigger outlets_updated_at before update on public.outlets for each row execute function public.set_updated_at();
drop trigger if exists survey_targets_updated_at on public.survey_targets;
create trigger survey_targets_updated_at before update on public.survey_targets for each row execute function public.set_updated_at();
drop trigger if exists survey_reports_updated_at on public.survey_reports;
create trigger survey_reports_updated_at before update on public.survey_reports for each row execute function public.set_updated_at();
drop trigger if exists change_requests_updated_at on public.change_requests;
create trigger change_requests_updated_at before update on public.change_requests for each row execute function public.set_updated_at();

drop trigger if exists audit_outlets on public.outlets;
create trigger audit_outlets after insert or update or delete on public.outlets for each row execute function public.write_audit_log();
drop trigger if exists audit_targets on public.survey_targets;
create trigger audit_targets after insert or update or delete on public.survey_targets for each row execute function public.write_audit_log();
drop trigger if exists audit_reports on public.survey_reports;
create trigger audit_reports after insert or update or delete on public.survey_reports for each row execute function public.write_audit_log();
drop trigger if exists audit_change_requests on public.change_requests;
create trigger audit_change_requests after insert or update or delete on public.change_requests for each row execute function public.write_audit_log();

create or replace function public.resolve_change_request(
  p_request_id uuid,
  p_decision text,
  p_note text default ''
)
returns public.change_requests
language plpgsql
security definer
set search_path = public, storage, pg_temp
as $$
declare
  request_row public.change_requests%rowtype;
  master_name text;
begin
  if not public.is_master() then
    raise exception 'Akses master diperlukan';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'Keputusan tidak valid';
  end if;

  select * into request_row
  from public.change_requests
  where id = p_request_id
  for update;

  if request_row.id is null then raise exception 'Pengajuan tidak ditemukan'; end if;
  if request_row.status <> 'pending' then raise exception 'Pengajuan sudah diproses'; end if;

  select full_name into master_name from public.profiles where id = auth.uid();

  if p_decision = 'approved' and request_row.request_type = 'edit' then
    update public.survey_reports
    set
      outlet_id = (request_row.proposed_data ->> 'outlet_id')::uuid,
      answers = request_row.proposed_data -> 'answers',
      evidence_path = request_row.proposed_data ->> 'evidence_path',
      evidence_metadata = coalesce(request_row.proposed_data -> 'evidence_metadata', '{}'::jsonb),
      team_members = request_row.proposed_data ->> 'team_members',
      attendance_confirmed = coalesce((request_row.proposed_data ->> 'attendance_confirmed')::boolean, true),
      presence = coalesce(request_row.proposed_data -> 'presence', '{}'::jsonb)
    where id = request_row.report_id;
  elsif p_decision = 'approved' and request_row.request_type = 'delete' then
    delete from public.survey_reports where id = request_row.report_id;
  end if;

  update public.change_requests
  set
    status = p_decision,
    master_note = nullif(trim(p_note), ''),
    resolved_at = now(),
    resolved_by = auth.uid(),
    resolved_by_name = master_name
  where id = p_request_id
  returning * into request_row;

  return request_row;
end;
$$;

alter table public.profiles enable row level security;
alter table public.outlets enable row level security;
alter table public.survey_targets enable row level security;
alter table public.survey_reports enable row level security;
alter table public.change_requests enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (id = auth.uid() or public.is_master());
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists outlets_select on public.outlets;
create policy outlets_select on public.outlets for select to authenticated using (status = 'aktif' or public.is_master());
drop policy if exists outlets_master_insert on public.outlets;
create policy outlets_master_insert on public.outlets for insert to authenticated with check (public.is_master());
drop policy if exists outlets_master_update on public.outlets;
create policy outlets_master_update on public.outlets for update to authenticated using (public.is_master()) with check (public.is_master());
drop policy if exists outlets_master_delete on public.outlets;
create policy outlets_master_delete on public.outlets for delete to authenticated using (public.is_master());

drop policy if exists targets_select on public.survey_targets;
create policy targets_select on public.survey_targets for select to authenticated using (surveyor_id = auth.uid() or public.is_master());
drop policy if exists targets_master_insert on public.survey_targets;
create policy targets_master_insert on public.survey_targets for insert to authenticated with check (public.is_master());
drop policy if exists targets_master_update on public.survey_targets;
create policy targets_master_update on public.survey_targets for update to authenticated using (public.is_master()) with check (public.is_master());
drop policy if exists targets_master_delete on public.survey_targets;
create policy targets_master_delete on public.survey_targets for delete to authenticated using (public.is_master());

drop policy if exists reports_select on public.survey_reports;
create policy reports_select on public.survey_reports for select to authenticated using (surveyor_id = auth.uid() or public.is_master());
drop policy if exists reports_insert on public.survey_reports;
create policy reports_insert on public.survey_reports for insert to authenticated with check (surveyor_id = auth.uid() and exists (select 1 from public.outlets where id = outlet_id and status = 'aktif'));
drop policy if exists reports_master_update on public.survey_reports;
create policy reports_master_update on public.survey_reports for update to authenticated using (public.is_master()) with check (public.is_master());
drop policy if exists reports_master_delete on public.survey_reports;
create policy reports_master_delete on public.survey_reports for delete to authenticated using (public.is_master());

drop policy if exists requests_select on public.change_requests;
create policy requests_select on public.change_requests for select to authenticated using (requester_id = auth.uid() or public.is_master());
drop policy if exists requests_insert on public.change_requests;
create policy requests_insert on public.change_requests for insert to authenticated with check (
  requester_id = auth.uid()
  and status = 'pending'
  and exists (select 1 from public.survey_reports where id = report_id and surveyor_id = auth.uid())
);

drop policy if exists logs_select on public.audit_logs;
create policy logs_select on public.audit_logs for select to authenticated using (
  actor_id = auth.uid()
  or public.is_master()
  or exists (
    select 1 from public.change_requests
    where id = audit_logs.request_id and requester_id = auth.uid()
  )
);

revoke all on public.profiles, public.outlets, public.survey_targets, public.survey_reports, public.change_requests, public.audit_logs from anon;
grant select on public.profiles, public.outlets, public.survey_targets, public.survey_reports, public.change_requests, public.audit_logs to authenticated;
grant update (full_name) on public.profiles to authenticated;
grant insert, update, delete on public.outlets to authenticated;
grant insert, update, delete on public.survey_targets to authenticated;
grant insert, update, delete on public.survey_reports to authenticated;
grant insert on public.change_requests to authenticated;
grant usage, select on sequence public.audit_logs_id_seq to authenticated;
revoke all on function public.resolve_change_request(uuid, text, text) from public, anon;
grant execute on function public.resolve_change_request(uuid, text, text) to authenticated;

grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
alter default privileges in schema public grant all privileges on tables to service_role;
alter default privileges in schema public grant all privileges on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('survey-evidence', 'survey-evidence', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists evidence_select on storage.objects;
create policy evidence_select on storage.objects for select to authenticated using (
  bucket_id = 'survey-evidence'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_master())
);
drop policy if exists evidence_insert on storage.objects;
create policy evidence_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'survey-evidence'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_master())
);
drop policy if exists evidence_master_delete on storage.objects;
create policy evidence_master_delete on storage.objects for delete to authenticated using (
  bucket_id = 'survey-evidence' and public.is_master()
);

commit;
