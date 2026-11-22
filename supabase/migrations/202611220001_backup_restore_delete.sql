begin;

alter table public.survey_reports
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.profiles(id) on delete set null;

create index if not exists survey_reports_deleted_idx
  on public.survey_reports(deleted_at)
  where deleted_at is not null;

drop policy if exists reports_select on public.survey_reports;
create policy reports_select on public.survey_reports for select to authenticated using (
  (surveyor_id = auth.uid() and deleted_at is null) or public.is_master()
);

create or replace function public.preview_restore_backup(p_backup jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  outlet_total integer := jsonb_array_length(coalesce(p_backup #> '{data,outlets}', '[]'::jsonb));
  target_total integer := jsonb_array_length(coalesce(p_backup #> '{data,targets}', '[]'::jsonb));
  report_total integer := jsonb_array_length(coalesce(p_backup #> '{data,reports}', '[]'::jsonb));
  outlet_duplicates integer;
  target_duplicates integer;
  report_duplicates integer;
  report_rejected integer;
begin
  if not public.is_master() then raise exception 'Akses master diperlukan'; end if;
  if coalesce((p_backup ->> 'schemaVersion')::integer, 0) <> 1 then raise exception 'Versi cadangan tidak didukung'; end if;

  select count(*) into outlet_duplicates
  from jsonb_array_elements(coalesce(p_backup #> '{data,outlets}', '[]'::jsonb)) item
  join public.outlets existing on existing.id = (item ->> 'id')::uuid;

  select count(*) into target_duplicates
  from jsonb_array_elements(coalesce(p_backup #> '{data,targets}', '[]'::jsonb)) item
  join public.survey_targets existing on existing.id = (item ->> 'id')::uuid;

  select count(*) into report_duplicates
  from jsonb_array_elements(coalesce(p_backup #> '{data,reports}', '[]'::jsonb)) item
  join public.survey_reports existing on existing.id = (item ->> 'id')::uuid;

  select count(*) into report_rejected
  from jsonb_array_elements(coalesce(p_backup #> '{data,reports}', '[]'::jsonb)) item
  where not exists (select 1 from public.profiles where id = (item ->> 'surveyor_id')::uuid)
     or not exists (
       select 1 from public.outlets where id = (item ->> 'outlet_id')::uuid
       union all
       select 1 from jsonb_array_elements(coalesce(p_backup #> '{data,outlets}', '[]'::jsonb)) backup_outlet
       where backup_outlet ->> 'id' = item ->> 'outlet_id'
     );

  return jsonb_build_object(
    'new', jsonb_build_object(
      'outlets', greatest(outlet_total - outlet_duplicates, 0),
      'targets', greatest(target_total - target_duplicates, 0),
      'reports', greatest(report_total - report_duplicates - report_rejected, 0)
    ),
    'duplicates', jsonb_build_object('outlets', outlet_duplicates, 'targets', target_duplicates, 'reports', report_duplicates),
    'rejected', jsonb_build_object('reports', report_rejected),
    'total', jsonb_build_object('outlets', outlet_total, 'targets', target_total, 'reports', report_total)
  );
end;
$$;

create or replace function public.restore_backup(p_backup jsonb, p_mode text default 'skip')
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  item jsonb;
  restored_outlets integer := 0;
  restored_targets integer := 0;
  restored_reports integer := 0;
  skipped integer := 0;
begin
  if not public.is_master() then raise exception 'Akses master diperlukan'; end if;
  if p_mode not in ('skip', 'overwrite') then raise exception 'Mode pemulihan tidak valid'; end if;
  if coalesce((p_backup ->> 'schemaVersion')::integer, 0) <> 1 then raise exception 'Versi cadangan tidak didukung'; end if;

  for item in select value from jsonb_array_elements(coalesce(p_backup #> '{data,outlets}', '[]'::jsonb)) loop
    if p_mode = 'skip' and exists (select 1 from public.outlets where id = (item ->> 'id')::uuid) then skipped := skipped + 1; continue; end if;
    insert into public.outlets (id, outlet_name, pic_name, store_name, address, phone, email, latitude, longitude, status, created_by, created_at, updated_at)
    values ((item ->> 'id')::uuid, item ->> 'outlet_name', item ->> 'pic_name', item ->> 'store_name', item ->> 'address', item ->> 'phone', item ->> 'email', nullif(item ->> 'latitude', '')::numeric, nullif(item ->> 'longitude', '')::numeric, coalesce(item ->> 'status', 'aktif'), auth.uid(), coalesce((item ->> 'created_at')::timestamptz, now()), now())
    on conflict (id) do update set outlet_name = excluded.outlet_name, pic_name = excluded.pic_name, store_name = excluded.store_name, address = excluded.address, phone = excluded.phone, email = excluded.email, latitude = excluded.latitude, longitude = excluded.longitude, status = excluded.status, updated_at = now();
    restored_outlets := restored_outlets + 1;
  end loop;

  for item in select value from jsonb_array_elements(coalesce(p_backup #> '{data,targets}', '[]'::jsonb)) loop
    if not exists (select 1 from public.profiles where id = (item ->> 'surveyor_id')::uuid) then skipped := skipped + 1; continue; end if;
    if p_mode = 'skip' and exists (select 1 from public.survey_targets where id = (item ->> 'id')::uuid) then skipped := skipped + 1; continue; end if;
    insert into public.survey_targets (id, surveyor_id, period_start, target_count, created_by, created_at, updated_at)
    values ((item ->> 'id')::uuid, (item ->> 'surveyor_id')::uuid, (item ->> 'period_start')::date, (item ->> 'target_count')::integer, auth.uid(), coalesce((item ->> 'created_at')::timestamptz, now()), now())
    on conflict (id) do update set surveyor_id = excluded.surveyor_id, period_start = excluded.period_start, target_count = excluded.target_count, updated_at = now();
    restored_targets := restored_targets + 1;
  end loop;

  for item in select value from jsonb_array_elements(coalesce(p_backup #> '{data,reports}', '[]'::jsonb)) loop
    if not exists (select 1 from public.profiles where id = (item ->> 'surveyor_id')::uuid)
       or not exists (select 1 from public.outlets where id = (item ->> 'outlet_id')::uuid) then skipped := skipped + 1; continue; end if;
    if p_mode = 'skip' and exists (select 1 from public.survey_reports where id = (item ->> 'id')::uuid) then skipped := skipped + 1; continue; end if;
    insert into public.survey_reports (id, surveyor_id, surveyor_name, outlet_id, recorded_at, answers, evidence_path, evidence_metadata, team_members, attendance_confirmed, presence, created_at, updated_at, deleted_at, deleted_by)
    values ((item ->> 'id')::uuid, (item ->> 'surveyor_id')::uuid, item ->> 'surveyor_name', (item ->> 'outlet_id')::uuid, (item ->> 'recorded_at')::timestamptz, item -> 'answers', item ->> 'evidence_path', coalesce(item -> 'evidence_metadata', '{}'::jsonb), item ->> 'team_members', true, coalesce(item -> 'presence', '{}'::jsonb), coalesce((item ->> 'created_at')::timestamptz, now()), now(), null, null)
    on conflict (id) do update set surveyor_id = excluded.surveyor_id, surveyor_name = excluded.surveyor_name, outlet_id = excluded.outlet_id, recorded_at = excluded.recorded_at, answers = excluded.answers, evidence_path = excluded.evidence_path, evidence_metadata = excluded.evidence_metadata, team_members = excluded.team_members, attendance_confirmed = true, presence = excluded.presence, deleted_at = null, deleted_by = null, updated_at = now();
    restored_reports := restored_reports + 1;
  end loop;

  insert into public.audit_logs (actor_id, actor_name, actor_role, action, entity_type, description, details)
  select auth.uid(), full_name, role, 'restore', 'backup', 'Memulihkan data dari cadangan', jsonb_build_object('outlets', restored_outlets, 'targets', restored_targets, 'reports', restored_reports, 'skipped', skipped, 'mode', p_mode)
  from public.profiles where id = auth.uid();

  return jsonb_build_object('outlets', restored_outlets, 'targets', restored_targets, 'reports', restored_reports, 'skipped', skipped);
end;
$$;

create or replace function public.preview_survey_delete(p_from timestamptz, p_to timestamptz, p_surveyor_id uuid default null, p_permanent boolean default false)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare result integer;
begin
  if not public.is_master() then raise exception 'Akses master diperlukan'; end if;
  select count(*) into result from public.survey_reports
  where recorded_at >= p_from and recorded_at < p_to
    and (p_surveyor_id is null or surveyor_id = p_surveyor_id)
    and ((p_permanent and deleted_at is not null) or (not p_permanent and deleted_at is null));
  return result;
end;
$$;

create or replace function public.delete_surveys_controlled(p_from timestamptz, p_to timestamptz, p_surveyor_id uuid default null, p_permanent boolean default false)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare affected integer;
declare actor public.profiles%rowtype;
begin
  if not public.is_master() then raise exception 'Akses master diperlukan'; end if;
  select * into actor from public.profiles where id = auth.uid();

  if p_permanent then
    delete from public.survey_reports
    where recorded_at >= p_from and recorded_at < p_to
      and (p_surveyor_id is null or surveyor_id = p_surveyor_id)
      and deleted_at is not null;
  else
    update public.survey_reports set deleted_at = now(), deleted_by = auth.uid()
    where recorded_at >= p_from and recorded_at < p_to
      and (p_surveyor_id is null or surveyor_id = p_surveyor_id)
      and deleted_at is null;
  end if;
  get diagnostics affected = row_count;

  insert into public.audit_logs (actor_id, actor_name, actor_role, action, entity_type, description, details)
  values (auth.uid(), actor.full_name, actor.role, case when p_permanent then 'permanent_delete' else 'soft_delete' end, 'survey_reports', case when p_permanent then 'Menghapus permanen data survei terpilih' else 'Memindahkan data survei terpilih ke masa pemulihan 30 hari' end, jsonb_build_object('from', p_from, 'to', p_to, 'surveyor_id', p_surveyor_id, 'count', affected));
  return affected;
end;
$$;

revoke all on function public.preview_restore_backup(jsonb) from public, anon;
revoke all on function public.restore_backup(jsonb, text) from public, anon;
revoke all on function public.preview_survey_delete(timestamptz, timestamptz, uuid, boolean) from public, anon;
revoke all on function public.delete_surveys_controlled(timestamptz, timestamptz, uuid, boolean) from public, anon;
grant execute on function public.preview_restore_backup(jsonb) to authenticated;
grant execute on function public.restore_backup(jsonb, text) to authenticated;
grant execute on function public.preview_survey_delete(timestamptz, timestamptz, uuid, boolean) to authenticated;
grant execute on function public.delete_surveys_controlled(timestamptz, timestamptz, uuid, boolean) to authenticated;

commit;
