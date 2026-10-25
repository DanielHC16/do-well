-- Productization foundation: server-owned administrator capability,
-- persisted marketplace workspace, report submission, and moderation audit.

create table public.account_roles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  role text not null default 'user',
  granted_by uuid references public.profiles (id) on delete restrict,
  granted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_roles_role_check check (role in ('user', 'admin')),
  constraint account_roles_admin_grant_check check (
    role <> 'admin' or granted_by is not null
  )
);

create table public.admin_actions (
  id uuid primary key default extensions.gen_random_uuid(),
  admin_id uuid not null references public.profiles (id) on delete restrict,
  action_type text not null,
  target_type text not null,
  target_id uuid not null,
  report_id uuid references public.reports (id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_actions_action_type_check check (
    action_type in ('report_resolved', 'report_dismissed')
  ),
  constraint admin_actions_target_type_check check (
    target_type in ('report', 'gig', 'profile')
  ),
  constraint admin_actions_details_check check (jsonb_typeof(details) = 'object')
);

alter table public.reports
  add column reviewed_by uuid references public.profiles (id) on delete restrict,
  add column reviewed_at timestamptz;

alter table public.reports
  add constraint reports_review_metadata_check check (
    (status in ('open', 'reviewing') and reviewed_by is null and reviewed_at is null)
    or (status in ('resolved', 'dismissed') and reviewed_by is not null and reviewed_at is not null)
  );

create index account_roles_role_idx on public.account_roles (role, user_id);
create index admin_actions_admin_created_idx on public.admin_actions (admin_id, created_at desc);
create index admin_actions_report_created_idx on public.admin_actions (report_id, created_at desc)
  where report_id is not null;

create trigger set_account_roles_updated_at
before update on public.account_roles
for each row execute function private.set_updated_at();

create trigger set_admin_actions_updated_at
before update on public.admin_actions
for each row execute function private.set_updated_at();

alter table public.account_roles enable row level security;
alter table public.account_roles force row level security;
alter table public.admin_actions enable row level security;
alter table public.admin_actions force row level security;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.account_roles as ar
    where ar.user_id = (select auth.uid())
      and ar.role = 'admin'
  );
$$;

revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

create policy account_roles_read_own
on public.account_roles
for select
to authenticated
using (user_id = (select auth.uid()));

create policy admin_actions_read_admin
on public.admin_actions
for select
to authenticated
using (private.is_admin());

create policy reports_read_admin
on public.reports
for select
to authenticated
using (private.is_admin());

grant select on table public.account_roles to authenticated;
grant select on table public.admin_actions to authenticated;
revoke insert, update, delete on table public.account_roles from anon, authenticated;
revoke insert, update, delete on table public.admin_actions from anon, authenticated;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate text;
  initial_mode text;
begin
  candidate := nullif(
    btrim(
      coalesce(
        new.raw_user_meta_data ->> 'full_name',
        new.raw_user_meta_data ->> 'display_name',
        ''
      )
    ),
    ''
  );

  if candidate is null or char_length(candidate) < 2 then
    candidate := 'New user';
  end if;

  initial_mode := case
    when new.raw_user_meta_data ->> 'preferred_mode' in ('worker', 'employer')
      then new.raw_user_meta_data ->> 'preferred_mode'
    else 'worker'
  end;

  insert into public.profiles (id, display_name, preferred_mode)
  values (new.id, left(candidate, 80), initial_mode)
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

drop function public.complete_onboarding(text, text);

create function public.complete_onboarding(
  p_display_name text,
  p_home_area text,
  p_preferred_mode text default 'worker'
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  normalized_display_name text := btrim(coalesce(p_display_name, ''));
  normalized_home_area text := btrim(coalesce(p_home_area, ''));
  result public.profiles;
begin
  if caller_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if char_length(normalized_display_name) not between 2 and 80 then
    raise exception 'Display name is invalid.' using errcode = '22023';
  end if;

  if char_length(normalized_home_area) not between 1 and 120 then
    raise exception 'Home area is invalid.' using errcode = '22023';
  end if;

  if p_preferred_mode is null or p_preferred_mode not in ('worker', 'employer') then
    raise exception 'Preferred workspace must be worker or employer.'
      using errcode = 'P0061';
  end if;

  perform public.ensure_profile();

  update public.profiles as p
  set
    display_name = normalized_display_name,
    home_area = normalized_home_area,
    preferred_mode = p_preferred_mode,
    onboarding_completed_at = coalesce(p.onboarding_completed_at, now())
  where p.id = caller_id
  returning p.* into strict result;

  return result;
end;
$$;

revoke all on function public.complete_onboarding(text, text, text) from public, anon;
grant execute on function public.complete_onboarding(text, text, text) to authenticated;

create function public.get_my_capabilities()
returns table (
  user_id uuid,
  role text,
  preferred_mode text,
  is_admin boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  return query
  select
    p.id,
    coalesce(ar.role, 'user'::text),
    p.preferred_mode,
    coalesce(ar.role = 'admin', false)
  from public.profiles as p
  left join public.account_roles as ar on ar.user_id = p.id
  where p.id = caller_id;
end;
$$;

create function public.set_preferred_mode(p_mode text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  result public.profiles;
begin
  if caller_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if p_mode is null or p_mode not in ('worker', 'employer') then
    raise exception 'Preferred workspace must be worker or employer.'
      using errcode = 'P0061';
  end if;

  update public.profiles
  set preferred_mode = p_mode
  where id = caller_id
  returning * into result;

  if not found then
    raise exception 'Profile not found.' using errcode = 'P0060';
  end if;

  return result;
end;
$$;

create function public.submit_report(
  p_category text,
  p_details text,
  p_subject_profile_id uuid default null,
  p_gig_id uuid default null,
  p_assignment_id uuid default null,
  p_client_request_id uuid default extensions.gen_random_uuid()
)
returns public.reports
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  normalized_details text := btrim(coalesce(p_details, ''));
  existing_report public.reports;
  result public.reports;
begin
  if caller_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = caller_id and onboarding_completed_at is not null
  ) then
    raise exception 'Caller must complete onboarding before submitting a report.'
      using errcode = 'P0002';
  end if;

  if p_category is null or p_category not in ('scam', 'unsafe', 'harassment', 'prohibited', 'other') then
    raise exception 'Report category is invalid.' using errcode = 'P0062';
  end if;

  if char_length(normalized_details) not between 20 and 2000 then
    raise exception 'Report details must contain between 20 and 2000 characters.'
      using errcode = 'P0062';
  end if;

  select * into existing_report
  from public.reports
  where reporter_id = caller_id and client_request_id = p_client_request_id;

  if found then
    if existing_report.category is distinct from p_category
      or existing_report.details is distinct from normalized_details
      or existing_report.subject_profile_id is distinct from p_subject_profile_id
      or existing_report.gig_id is distinct from p_gig_id
      or existing_report.assignment_id is distinct from p_assignment_id
    then
      raise exception 'Report request identifier was already used for different report data.'
        using errcode = 'P0063';
    end if;
    return existing_report;
  end if;

  if p_subject_profile_id is null and p_gig_id is null and p_assignment_id is null then
    raise exception 'A report must identify a profile, gig, or assignment.'
      using errcode = 'P0062';
  end if;

  if p_subject_profile_id = caller_id then
    raise exception 'A user cannot report their own profile.' using errcode = 'P0062';
  end if;

  if p_subject_profile_id is not null and not exists (
    select 1 from public.profiles where id = p_subject_profile_id
  ) then
    raise exception 'Reported profile was not found.' using errcode = 'P0064';
  end if;

  if p_gig_id is not null and not exists (
    select 1 from public.gigs as g
    where g.id = p_gig_id
      and (
        g.status = 'published'
        or g.employer_id = caller_id
        or private.has_gig_relationship(g.id)
      )
  ) then
    raise exception 'Reported gig was not found or is not visible to the caller.'
      using errcode = 'P0064';
  end if;

  if p_assignment_id is not null and not private.is_assignment_participant(p_assignment_id) then
    raise exception 'Reported assignment was not found or is not visible to the caller.'
      using errcode = 'P0064';
  end if;

  insert into public.reports (
    reporter_id,
    subject_profile_id,
    gig_id,
    assignment_id,
    category,
    details,
    client_request_id
  ) values (
    caller_id,
    p_subject_profile_id,
    p_gig_id,
    p_assignment_id,
    p_category,
    normalized_details,
    p_client_request_id
  ) returning * into result;

  return result;
end;
$$;

create function public.list_admin_reports(
  p_status text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns setof public.reports
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.is_admin() then
    raise exception 'Administrator capability required.' using errcode = '42501';
  end if;

  if p_status is not null and p_status not in ('open', 'reviewing', 'resolved', 'dismissed') then
    raise exception 'Report status filter is invalid.' using errcode = 'P0065';
  end if;

  if p_limit not between 1 and 100 or p_offset < 0 then
    raise exception 'Report pagination is invalid.' using errcode = 'P0065';
  end if;

  return query
  select r.*
  from public.reports as r
  where p_status is null or r.status = p_status
  order by r.created_at desc, r.id desc
  limit p_limit offset p_offset;
end;
$$;

create function public.get_admin_report(p_report_id uuid)
returns public.reports
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result public.reports;
begin
  if auth.uid() is null or not private.is_admin() then
    raise exception 'Administrator capability required.' using errcode = '42501';
  end if;

  select * into result from public.reports where id = p_report_id;
  if not found then
    raise exception 'Report not found.' using errcode = 'P0064';
  end if;
  return result;
end;
$$;

create function public.get_admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.is_admin() then
    raise exception 'Administrator capability required.' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'profiles', (select count(*) from public.profiles),
    'open_reports', (select count(*) from public.reports where status in ('open', 'reviewing')),
    'published_gigs', (select count(*) from public.gigs where status = 'published'),
    'active_assignments', (select count(*) from public.assignments where status in ('proposed', 'active', 'submitted', 'revision_requested'))
  );
end;
$$;

create function public.resolve_report(
  p_report_id uuid,
  p_decision text,
  p_resolution_note text
)
returns public.reports
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  normalized_note text := btrim(coalesce(p_resolution_note, ''));
  current_report public.reports;
  result public.reports;
begin
  if caller_id is null or not private.is_admin() then
    raise exception 'Administrator capability required.' using errcode = '42501';
  end if;

  if p_decision is null or p_decision not in ('resolved', 'dismissed') then
    raise exception 'Report decision must be resolved or dismissed.' using errcode = 'P0066';
  end if;

  if char_length(normalized_note) not between 10 and 2000 then
    raise exception 'Resolution note must contain between 10 and 2000 characters.'
      using errcode = 'P0066';
  end if;

  select * into current_report
  from public.reports
  where id = p_report_id
  for update;

  if not found then
    raise exception 'Report not found.' using errcode = 'P0064';
  end if;

  if current_report.status in ('resolved', 'dismissed') then
    if current_report.status = p_decision
      and current_report.resolution_note = normalized_note
      and current_report.reviewed_by = caller_id
    then
      return current_report;
    end if;
    raise exception 'Report already has a terminal moderation decision.'
      using errcode = 'P0067';
  end if;

  update public.reports
  set
    status = p_decision,
    resolution_note = normalized_note,
    reviewed_by = caller_id,
    reviewed_at = now()
  where id = p_report_id
  returning * into result;

  insert into public.admin_actions (
    admin_id,
    action_type,
    target_type,
    target_id,
    report_id,
    details
  ) values (
    caller_id,
    case when p_decision = 'resolved' then 'report_resolved' else 'report_dismissed' end,
    'report',
    p_report_id,
    p_report_id,
    jsonb_build_object('decision', p_decision, 'resolution_note', normalized_note)
  );

  return result;
end;
$$;

revoke all on function public.get_my_capabilities() from public, anon;
revoke all on function public.set_preferred_mode(text) from public, anon;
revoke all on function public.submit_report(text, text, uuid, uuid, uuid, uuid) from public, anon;
revoke all on function public.list_admin_reports(text, integer, integer) from public, anon;
revoke all on function public.get_admin_report(uuid) from public, anon;
revoke all on function public.get_admin_overview() from public, anon;
revoke all on function public.resolve_report(uuid, text, text) from public, anon;

grant execute on function public.get_my_capabilities() to authenticated;
grant execute on function public.set_preferred_mode(text) to authenticated;
grant execute on function public.submit_report(text, text, uuid, uuid, uuid, uuid) to authenticated;
grant execute on function public.list_admin_reports(text, integer, integer) to authenticated;
grant execute on function public.get_admin_report(uuid) to authenticated;
grant execute on function public.get_admin_overview() to authenticated;
grant execute on function public.resolve_report(uuid, text, text) to authenticated;
