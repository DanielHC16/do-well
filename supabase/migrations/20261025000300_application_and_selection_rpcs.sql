-- 20261025000300_application_and_selection_rpcs.sql
-- Milestone M07: Worker applications, application withdrawal, and atomic worker selection RPCs.

create or replace function public.apply_to_gig(
  p_gig_id uuid,
  p_message text default null,
  p_client_request_id uuid default extensions.gen_random_uuid()
)
returns public.applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_worker_id uuid := auth.uid();
  v_profile record;
  v_gig record;
  v_existing record;
  v_existing_live record;
  v_application public.applications%rowtype;
begin
  if v_worker_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication required';
  end if;

  select id, display_name, onboarding_completed_at
  into v_profile
  from public.profiles
  where id = v_worker_id;

  if v_profile.id is null or v_profile.onboarding_completed_at is null then
    raise exception using
      errcode = 'P0002',
      message = 'Worker onboarding must be completed before applying';
  end if;

  select id, employer_id, title, status, application_deadline, due_at
  into v_gig
  from public.gigs
  where id = p_gig_id;

  if v_gig.id is null then
    raise exception using
      errcode = 'P0003',
      message = 'gig not found';
  end if;

  if v_gig.status <> 'published' then
    raise exception using
      errcode = 'P0004',
      message = 'Applications are only accepted for published gigs';
  end if;

  if v_gig.employer_id = v_worker_id then
    raise exception using
      errcode = 'P0005',
      message = 'Employers cannot apply to their own gigs';
  end if;

  if v_gig.application_deadline is not null and now() > v_gig.application_deadline then
    raise exception using
      errcode = 'P0006',
      message = 'Application deadline has passed';
  end if;

  if v_gig.due_at is not null and now() > v_gig.due_at then
    raise exception using
      errcode = 'P0007',
      message = 'Gig due date has passed';
  end if;

  if p_message is not null and char_length(p_message) > 1000 then
    raise exception using
      errcode = 'P0009',
      message = 'Application message cannot exceed 1000 characters';
  end if;

  -- Idempotency by worker_id and client_request_id
  select *
  into v_existing
  from public.applications
  where worker_id = v_worker_id
    and client_request_id = p_client_request_id;

  if v_existing.id is not null then
    return v_existing;
  end if;

  -- Active application check for this worker on this gig
  select *
  into v_existing_live
  from public.applications
  where gig_id = p_gig_id
    and worker_id = v_worker_id
    and status in ('pending', 'accepted');

  if v_existing_live.id is not null then
    raise exception using
      errcode = 'P0008',
      message = 'You have already applied to this gig';
  end if;

  insert into public.applications (
    gig_id,
    worker_id,
    message,
    status,
    client_request_id
  ) values (
    p_gig_id,
    v_worker_id,
    p_message,
    'pending',
    p_client_request_id
  )
  returning * into v_application;

  -- Record audit event for the employer
  insert into public.activity_events (
    recipient_id,
    actor_id,
    gig_id,
    event_type,
    payload,
    dedupe_key
  ) values (
    v_gig.employer_id,
    v_worker_id,
    v_gig.id,
    'gig_application_received',
    jsonb_build_object(
      'gig_id', v_gig.id,
      'gig_title', v_gig.title,
      'application_id', v_application.id,
      'worker_id', v_worker_id,
      'worker_name', v_profile.display_name
    ),
    'app_recv:' || v_application.id::text
  )
  on conflict (recipient_id, dedupe_key) do nothing;

  return v_application;
end;
$$;

create or replace function public.withdraw_application(
  p_application_id uuid
)
returns public.applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_worker_id uuid := auth.uid();
  v_application public.applications%rowtype;
  v_gig record;
begin
  if v_worker_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication required';
  end if;

  select *
  into v_application
  from public.applications
  where id = p_application_id;

  if v_application.id is null then
    raise exception using
      errcode = 'P0003',
      message = 'application not found';
  end if;

  if v_application.worker_id <> v_worker_id then
    raise exception using
      errcode = 'P0010',
      message = 'Only the applicant can withdraw this application';
  end if;

  if v_application.status = 'withdrawn' then
    return v_application;
  end if;

  if v_application.status <> 'pending' then
    raise exception using
      errcode = 'P0011',
      message = 'Only pending applications can be withdrawn';
  end if;

  update public.applications
  set status = 'withdrawn',
      decided_at = now(),
      updated_at = now()
  where id = p_application_id
  returning * into v_application;

  select id, employer_id, title into v_gig
  from public.gigs
  where id = v_application.gig_id;

  insert into public.activity_events (
    recipient_id,
    actor_id,
    gig_id,
    event_type,
    payload,
    dedupe_key
  ) values (
    v_gig.employer_id,
    v_worker_id,
    v_gig.id,
    'gig_application_withdrawn',
    jsonb_build_object(
      'gig_id', v_gig.id,
      'gig_title', v_gig.title,
      'application_id', v_application.id
    ),
    'app_withdrawn:' || v_application.id::text || ':' || v_application.updated_at::text
  )
  on conflict (recipient_id, dedupe_key) do nothing;

  return v_application;
end;
$$;

create or replace function public.select_worker_atomic(
  p_application_id uuid,
  p_client_request_id uuid default extensions.gen_random_uuid()
)
returns public.assignments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_employer_id uuid := auth.uid();
  v_existing_assignment public.assignments%rowtype;
  v_target_app public.applications%rowtype;
  v_gig public.gigs%rowtype;
  v_assignment public.assignments%rowtype;
begin
  if v_employer_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication required';
  end if;

  -- Idempotency check: assignment with (employer_id, client_request_id)
  select *
  into v_existing_assignment
  from public.assignments
  where employer_id = v_employer_id
    and client_request_id = p_client_request_id;

  if v_existing_assignment.id is not null then
    return v_existing_assignment;
  end if;

  -- Row-lock target application
  select *
  into v_target_app
  from public.applications
  where id = p_application_id
  for update;

  if v_target_app.id is null then
    raise exception using
      errcode = 'P0003',
      message = 'application not found';
  end if;

  if v_target_app.status <> 'pending' then
    raise exception using
      errcode = 'P0012',
      message = 'Application is no longer pending';
  end if;

  -- Row-lock gig
  select *
  into v_gig
  from public.gigs
  where id = v_target_app.gig_id
  for update;

  if v_gig.id is null then
    raise exception using
      errcode = 'P0003',
      message = 'gig not found';
  end if;

  if v_gig.employer_id <> v_employer_id then
    raise exception using
      errcode = 'P0013',
      message = 'Only the gig employer can select an applicant';
  end if;

  if v_gig.status <> 'published' then
    raise exception using
      errcode = 'P0014',
      message = 'Worker can only be selected for published gigs';
  end if;

  -- 1. Accept target application
  update public.applications
  set status = 'accepted',
      decided_at = now(),
      updated_at = now()
  where id = v_target_app.id
  returning * into v_target_app;

  -- 2. Reject all other pending applications for this gig
  update public.applications
  set status = 'rejected',
      decided_at = now(),
      updated_at = now()
  where gig_id = v_gig.id
    and id <> v_target_app.id
    and status = 'pending';

  -- 3. Close the gig noticeboard listing
  update public.gigs
  set status = 'closed',
      closed_at = now(),
      updated_at = now()
  where id = v_gig.id
  returning * into v_gig;

  -- 4. Atomically create assignment in 'proposed' status
  insert into public.assignments (
    gig_id,
    application_id,
    employer_id,
    worker_id,
    agreement_version,
    agreed_title,
    agreed_description,
    agreed_amount,
    currency,
    due_at,
    status,
    employer_confirmed_at,
    client_request_id
  ) values (
    v_gig.id,
    v_target_app.id,
    v_employer_id,
    v_target_app.worker_id,
    1,
    v_gig.title,
    v_gig.description,
    v_gig.budget_amount,
    v_gig.currency,
    v_gig.due_at,
    'proposed',
    now(),
    p_client_request_id
  )
  returning * into v_assignment;

  -- 5. Audit event for the winning worker
  insert into public.activity_events (
    recipient_id,
    actor_id,
    gig_id,
    assignment_id,
    event_type,
    payload,
    dedupe_key
  ) values (
    v_target_app.worker_id,
    v_employer_id,
    v_gig.id,
    v_assignment.id,
    'gig_applicant_selected',
    jsonb_build_object(
      'gig_id', v_gig.id,
      'gig_title', v_gig.title,
      'assignment_id', v_assignment.id,
      'amount', v_assignment.agreed_amount,
      'currency', v_assignment.currency
    ),
    'worker_selected:' || v_assignment.id::text
  )
  on conflict (recipient_id, dedupe_key) do nothing;

  return v_assignment;
end;
$$;

create or replace function public.list_gig_applicants(
  p_gig_id uuid
)
returns table (
  id uuid,
  gig_id uuid,
  worker_id uuid,
  message text,
  status text,
  decided_at timestamptz,
  created_at timestamptz,
  worker_display_name text,
  worker_home_area text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid := auth.uid();
begin
  if v_caller_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication required';
  end if;

  if not exists (
    select 1 from public.gigs
    where public.gigs.id = p_gig_id and public.gigs.employer_id = v_caller_id
  ) then
    raise exception using
      errcode = 'P0013',
      message = 'Only the gig employer can view applicants';
  end if;

  return query
  select
    a.id,
    a.gig_id,
    a.worker_id,
    a.message,
    a.status::text,
    a.decided_at,
    a.created_at,
    p.display_name::text as worker_display_name,
    p.home_area::text as worker_home_area
  from public.applications a
  join public.profiles p on p.id = a.worker_id
  where a.gig_id = p_gig_id
  order by a.created_at desc;
end;
$$;

create or replace function public.get_worker_application_for_gig(
  p_gig_id uuid
)
returns public.applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_worker_id uuid := auth.uid();
  v_app public.applications%rowtype;
begin
  if v_worker_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication required';
  end if;

  select *
  into v_app
  from public.applications
  where gig_id = p_gig_id
    and worker_id = v_worker_id
  order by created_at desc
  limit 1;

  return v_app;
end;
$$;

revoke all on function public.apply_to_gig(uuid, text, uuid) from public, anon;
grant execute on function public.apply_to_gig(uuid, text, uuid) to authenticated;

revoke all on function public.withdraw_application(uuid) from public, anon;
grant execute on function public.withdraw_application(uuid) to authenticated;

revoke all on function public.select_worker_atomic(uuid, uuid) from public, anon;
grant execute on function public.select_worker_atomic(uuid, uuid) to authenticated;

revoke all on function public.list_gig_applicants(uuid) from public, anon;
grant execute on function public.list_gig_applicants(uuid) to authenticated;

revoke all on function public.get_worker_application_for_gig(uuid) from public, anon;
grant execute on function public.get_worker_application_for_gig(uuid) to authenticated;
