create or replace function public.confirm_assignment(
  p_assignment_id uuid
)
returns public.assignments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_assignment public.assignments;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into v_assignment
  from public.assignments
  where id = p_assignment_id
  for update;

  if not found then
    raise exception 'Assignment not found' using errcode = 'P0003';
  end if;

  if v_assignment.worker_id <> v_caller_id then
    raise exception 'Only the assigned worker can confirm the agreement' using errcode = 'P0020';
  end if;

  if v_assignment.status <> 'proposed' then
    raise exception 'Assignment is not in proposed status' using errcode = 'P0021';
  end if;

  update public.assignments
  set status = 'active',
      worker_confirmed_at = clock_timestamp(),
      started_at = clock_timestamp(),
      updated_at = clock_timestamp()
  where id = v_assignment.id
  returning * into v_assignment;

  insert into public.activity_events (
    recipient_id,
    actor_id,
    gig_id,
    assignment_id,
    event_type,
    dedupe_key,
    payload
  ) values (
    v_assignment.employer_id,
    v_caller_id,
    v_assignment.gig_id,
    v_assignment.id,
    'assignment_confirmed',
    'assignment_confirmed:' || v_assignment.id::text,
    jsonb_build_object(
      'assignment_id', v_assignment.id,
      'title', v_assignment.agreed_title,
      'amount', v_assignment.agreed_amount
    )
  )
  on conflict (recipient_id, dedupe_key) do nothing;

  return v_assignment;
end;
$$;

create or replace function public.decline_assignment(
  p_assignment_id uuid
)
returns public.assignments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_assignment public.assignments;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into v_assignment
  from public.assignments
  where id = p_assignment_id
  for update;

  if not found then
    raise exception 'Assignment not found' using errcode = 'P0003';
  end if;

  if v_assignment.worker_id <> v_caller_id then
    raise exception 'Only the assigned worker can decline the agreement' using errcode = 'P0020';
  end if;

  if v_assignment.status <> 'proposed' then
    raise exception 'Assignment is not in proposed status' using errcode = 'P0021';
  end if;

  update public.assignments
  set status = 'declined',
      cancelled_at = clock_timestamp(),
      updated_at = clock_timestamp()
  where id = v_assignment.id
  returning * into v_assignment;

  update public.gigs
  set status = 'published',
      closed_at = null,
      updated_at = clock_timestamp()
  where id = v_assignment.gig_id;

  update public.applications
  set status = 'declined',
      updated_at = clock_timestamp()
  where id = v_assignment.application_id;

  insert into public.activity_events (
    recipient_id,
    actor_id,
    gig_id,
    assignment_id,
    event_type,
    dedupe_key,
    payload
  ) values (
    v_assignment.employer_id,
    v_caller_id,
    v_assignment.gig_id,
    v_assignment.id,
    'assignment_declined',
    'assignment_declined:' || v_assignment.id::text,
    jsonb_build_object(
      'assignment_id', v_assignment.id,
      'title', v_assignment.agreed_title
    )
  )
  on conflict (recipient_id, dedupe_key) do nothing;

  return v_assignment;
end;
$$;

create or replace function public.cancel_proposed_assignment(
  p_assignment_id uuid
)
returns public.assignments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_assignment public.assignments;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into v_assignment
  from public.assignments
  where id = p_assignment_id
  for update;

  if not found then
    raise exception 'Assignment not found' using errcode = 'P0003';
  end if;

  if v_assignment.employer_id <> v_caller_id then
    raise exception 'Only the employer can cancel the proposed agreement' using errcode = 'P0022';
  end if;

  if v_assignment.status <> 'proposed' then
    raise exception 'Assignment is not in proposed status' using errcode = 'P0021';
  end if;

  update public.assignments
  set status = 'cancelled',
      cancelled_at = clock_timestamp(),
      updated_at = clock_timestamp()
  where id = v_assignment.id
  returning * into v_assignment;

  update public.gigs
  set status = 'published',
      closed_at = null,
      updated_at = clock_timestamp()
  where id = v_assignment.gig_id;

  update public.applications
  set status = 'rejected',
      updated_at = clock_timestamp()
  where id = v_assignment.application_id;

  insert into public.activity_events (
    recipient_id,
    actor_id,
    gig_id,
    assignment_id,
    event_type,
    dedupe_key,
    payload
  ) values (
    v_assignment.worker_id,
    v_caller_id,
    v_assignment.gig_id,
    v_assignment.id,
    'assignment_cancelled',
    'assignment_cancelled:' || v_assignment.id::text,
    jsonb_build_object(
      'assignment_id', v_assignment.id,
      'title', v_assignment.agreed_title
    )
  )
  on conflict (recipient_id, dedupe_key) do nothing;

  return v_assignment;
end;
$$;

create or replace function public.create_assignment_milestone(
  p_assignment_id uuid,
  p_title text,
  p_description text default null,
  p_due_at timestamptz default null
)
returns public.milestones
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_assignment public.assignments;
  v_next_position smallint;
  v_clean_title text;
  v_clean_description text;
  v_milestone public.milestones;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into v_assignment
  from public.assignments
  where id = p_assignment_id;

  if not found then
    raise exception 'Assignment not found' using errcode = 'P0003';
  end if;

  if v_assignment.employer_id <> v_caller_id then
    raise exception 'Only the employer can create milestones' using errcode = 'P0023';
  end if;

  if v_assignment.status not in ('proposed', 'active') then
    raise exception 'Cannot create milestones for this assignment status' using errcode = 'P0024';
  end if;

  v_clean_title := btrim(coalesce(p_title, ''));
  if char_length(v_clean_title) < 2 or char_length(v_clean_title) > 100 then
    raise exception 'Milestone title must be between 2 and 100 characters' using errcode = 'P0025';
  end if;

  v_clean_description := nullif(btrim(coalesce(p_description, '')), '');
  if v_clean_description is not null and char_length(v_clean_description) > 1000 then
    raise exception 'Milestone description cannot exceed 1000 characters' using errcode = 'P0026';
  end if;

  select coalesce(max(position), 0) + 1 into v_next_position
  from public.milestones
  where assignment_id = p_assignment_id;

  if v_next_position > 20 then
    raise exception 'Maximum of 20 milestones reached' using errcode = 'P0027';
  end if;

  insert into public.milestones (
    assignment_id,
    position,
    title,
    description,
    due_at,
    status
  ) values (
    p_assignment_id,
    v_next_position,
    v_clean_title,
    v_clean_description,
    p_due_at,
    'pending'
  )
  returning * into v_milestone;

  insert into public.activity_events (
    recipient_id,
    actor_id,
    gig_id,
    assignment_id,
    event_type,
    dedupe_key,
    payload
  ) values (
    v_assignment.worker_id,
    v_caller_id,
    v_assignment.gig_id,
    v_assignment.id,
    'milestone_created',
    'milestone_created:' || v_milestone.id::text,
    jsonb_build_object(
      'assignment_id', v_assignment.id,
      'milestone_id', v_milestone.id,
      'position', v_milestone.position,
      'title', v_milestone.title
    )
  )
  on conflict (recipient_id, dedupe_key) do nothing;

  return v_milestone;
end;
$$;

create or replace function public.start_assignment_milestone(
  p_milestone_id uuid
)
returns public.milestones
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_milestone public.milestones;
  v_assignment public.assignments;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into v_milestone
  from public.milestones
  where id = p_milestone_id
  for update;

  if not found then
    raise exception 'Milestone not found' using errcode = 'P0003';
  end if;

  select * into v_assignment
  from public.assignments
  where id = v_milestone.assignment_id;

  if v_assignment.worker_id <> v_caller_id then
    raise exception 'Only the assigned worker can start a milestone' using errcode = 'P0028';
  end if;

  if v_assignment.status <> 'active' then
    raise exception 'Assignment is not active' using errcode = 'P0029';
  end if;

  if v_milestone.status <> 'pending' then
    raise exception 'Milestone is not pending' using errcode = 'P0030';
  end if;

  update public.milestones
  set status = 'in_progress',
      updated_at = clock_timestamp()
  where id = v_milestone.id
  returning * into v_milestone;

  insert into public.activity_events (
    recipient_id,
    actor_id,
    gig_id,
    assignment_id,
    event_type,
    dedupe_key,
    payload
  ) values (
    v_assignment.employer_id,
    v_caller_id,
    v_assignment.gig_id,
    v_assignment.id,
    'milestone_started',
    'milestone_started:' || v_milestone.id::text,
    jsonb_build_object(
      'assignment_id', v_assignment.id,
      'milestone_id', v_milestone.id,
      'position', v_milestone.position,
      'title', v_milestone.title
    )
  )
  on conflict (recipient_id, dedupe_key) do nothing;

  return v_milestone;
end;
$$;

create or replace function public.list_assignment_milestones(
  p_assignment_id uuid
)
returns setof public.milestones
language sql
security definer
set search_path = ''
as $$
  select m.*
  from public.milestones as m
  join public.assignments as a on a.id = m.assignment_id
  where m.assignment_id = p_assignment_id
    and (a.employer_id = auth.uid() or a.worker_id = auth.uid())
  order by m.position asc;
$$;

create or replace function public.get_assignment_detail(
  p_assignment_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_assignment public.assignments;
  v_employer public.profiles;
  v_worker public.profiles;
  v_gig public.gigs;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into v_assignment
  from public.assignments
  where id = p_assignment_id;

  if not found then
    raise exception 'Assignment not found' using errcode = 'P0003';
  end if;

  if v_assignment.employer_id <> v_caller_id and v_assignment.worker_id <> v_caller_id then
    raise exception 'Unauthorized to view assignment' using errcode = '42501';
  end if;

  select * into v_employer from public.profiles where id = v_assignment.employer_id;
  select * into v_worker from public.profiles where id = v_assignment.worker_id;
  select * into v_gig from public.gigs where id = v_assignment.gig_id;

  return jsonb_build_object(
    'assignment', to_jsonb(v_assignment),
    'employer', jsonb_build_object(
      'id', v_employer.id,
      'displayName', v_employer.display_name,
      'homeArea', v_employer.home_area
    ),
    'worker', jsonb_build_object(
      'id', v_worker.id,
      'displayName', v_worker.display_name,
      'homeArea', v_worker.home_area
    ),
    'gig', jsonb_build_object(
      'id', v_gig.id,
      'title', v_gig.title,
      'category', v_gig.category,
      'workMode', v_gig.work_mode,
      'publicArea', v_gig.public_area
    )
  );
end;
$$;

create or replace function public.list_user_activity(
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  id uuid,
  event_type text,
  payload jsonb,
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz,
  gig_id uuid,
  assignment_id uuid
)
language sql
security definer
set search_path = ''
as $$
  select
    ae.id,
    ae.event_type,
    ae.payload,
    ae.dedupe_key,
    ae.read_at,
    ae.created_at,
    ae.gig_id,
    ae.assignment_id
  from public.activity_events as ae
  where ae.recipient_id = auth.uid()
  order by ae.created_at desc
  limit least(coalesce(p_limit, 50), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

create or replace function public.mark_activity_read(
  p_event_id uuid
)
returns public.activity_events
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_event public.activity_events;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  update public.activity_events
  set read_at = coalesce(read_at, clock_timestamp()),
      updated_at = clock_timestamp()
  where id = p_event_id
    and recipient_id = v_caller_id
  returning * into v_event;

  if not found then
    raise exception 'Activity event not found' using errcode = 'P0003';
  end if;

  return v_event;
end;
$$;

revoke all on function public.confirm_assignment(uuid) from public, anon;
grant execute on function public.confirm_assignment(uuid) to authenticated;

revoke all on function public.decline_assignment(uuid) from public, anon;
grant execute on function public.decline_assignment(uuid) to authenticated;

revoke all on function public.cancel_proposed_assignment(uuid) from public, anon;
grant execute on function public.cancel_proposed_assignment(uuid) to authenticated;

revoke all on function public.create_assignment_milestone(uuid, text, text, timestamptz) from public, anon;
grant execute on function public.create_assignment_milestone(uuid, text, text, timestamptz) to authenticated;

revoke all on function public.start_assignment_milestone(uuid) from public, anon;
grant execute on function public.start_assignment_milestone(uuid) to authenticated;

revoke all on function public.list_assignment_milestones(uuid) from public, anon;
grant execute on function public.list_assignment_milestones(uuid) to authenticated;

revoke all on function public.get_assignment_detail(uuid) from public, anon;
grant execute on function public.get_assignment_detail(uuid) to authenticated;

revoke all on function public.list_user_activity(int, int) from public, anon;
grant execute on function public.list_user_activity(int, int) to authenticated;

revoke all on function public.mark_activity_read(uuid) from public, anon;
grant execute on function public.mark_activity_read(uuid) to authenticated;

