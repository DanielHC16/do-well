-- Milestone M09: Work Submission, Revision, and Approval RPCs
-- Atomically manages worker submission, employer revision requests, and completion approval

create or replace function public.submit_assignment_work(
  p_assignment_id uuid,
  p_note text default null,
  p_milestone_id uuid default null,
  p_client_request_id uuid default extensions.gen_random_uuid()
)
returns public.submissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_assignment public.assignments%rowtype;
  v_existing_submission public.submissions%rowtype;
  v_next_version smallint;
  v_new_submission public.submissions%rowtype;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = v_caller_id
      and onboarding_completed_at is not null
  ) then
    raise exception 'Caller must complete onboarding before submitting work.'
      using errcode = 'P0002';
  end if;

  if p_note is not null and char_length(p_note) > 2000 then
    raise exception 'Submission note cannot exceed 2000 characters.'
      using errcode = 'P0039';
  end if;

  select * into v_assignment
  from public.assignments
  where id = p_assignment_id;

  if not found or v_assignment.worker_id <> v_caller_id then
    raise exception 'Assignment not found or caller is not assigned worker.'
      using errcode = 'P0031';
  end if;

  -- Idempotency check: if caller previously submitted with same client_request_id
  select * into v_existing_submission
  from public.submissions
  where submitted_by = v_caller_id
    and client_request_id = p_client_request_id;

  if found then
    return v_existing_submission;
  end if;

  if v_assignment.status not in ('active', 'revision_requested') then
    raise exception 'Work can only be submitted on active or revision-requested assignments.'
      using errcode = 'P0032';
  end if;

  if p_milestone_id is not null then
    if not exists (
      select 1 from public.milestones
      where id = p_milestone_id
        and assignment_id = p_assignment_id
    ) then
      raise exception 'Specified milestone does not belong to this assignment.'
        using errcode = 'P0033';
    end if;
  end if;

  -- Determine next version for this assignment
  select coalesce(max(version), 0) + 1 into v_next_version
  from public.submissions
  where assignment_id = p_assignment_id;

  insert into public.submissions (
    assignment_id,
    milestone_id,
    submitted_by,
    version,
    note,
    status,
    submitted_at,
    client_request_id,
    created_at,
    updated_at
  ) values (
    p_assignment_id,
    p_milestone_id,
    v_caller_id,
    v_next_version,
    p_note,
    'submitted',
    now(),
    p_client_request_id,
    now(),
    now()
  )
  returning * into v_new_submission;

  update public.assignments
  set status = 'submitted',
      updated_at = now()
  where id = p_assignment_id;

  insert into public.activity_events (
    recipient_id,
    event_type,
    payload,
    dedupe_key,
    gig_id,
    assignment_id,
    created_at
  ) values (
    v_assignment.employer_id,
    'work_submitted',
    jsonb_build_object(
      'assignment_id', p_assignment_id,
      'gig_id', v_assignment.gig_id,
      'title', v_assignment.agreed_title,
      'submission_id', v_new_submission.id,
      'version', v_next_version,
      'note', p_note
    ),
    'work_submitted:' || p_assignment_id || ':' || v_next_version::text,
    v_assignment.gig_id,
    p_assignment_id,
    now()
  )
  on conflict (recipient_id, dedupe_key) do nothing;

  return v_new_submission;
end;
$$;

create or replace function public.request_submission_revision(
  p_submission_id uuid,
  p_review_note text
)
returns public.submissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_submission public.submissions%rowtype;
  v_assignment public.assignments%rowtype;
  v_updated_submission public.submissions%rowtype;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  if p_review_note is null or char_length(btrim(p_review_note)) < 1 or char_length(p_review_note) > 2000 then
    raise exception 'Review note must be between 1 and 2000 characters.'
      using errcode = 'P0034';
  end if;

  select * into v_submission
  from public.submissions
  where id = p_submission_id;

  if not found then
    raise exception 'Submission not found.'
      using errcode = 'P0035';
  end if;

  select * into v_assignment
  from public.assignments
  where id = v_submission.assignment_id;

  if not found or v_assignment.employer_id <> v_caller_id then
    raise exception 'Caller is not the employer of this assignment.'
      using errcode = 'P0036';
  end if;

  if v_submission.status <> 'submitted' then
    raise exception 'Only pending submitted work can be requested for revision.'
      using errcode = 'P0037';
  end if;

  if v_assignment.status <> 'submitted' then
    raise exception 'Assignment is not in submitted status.'
      using errcode = 'P0038';
  end if;

  update public.submissions
  set status = 'revision_requested',
      review_note = btrim(p_review_note),
      reviewed_at = now(),
      updated_at = now()
  where id = p_submission_id
  returning * into v_updated_submission;

  update public.assignments
  set status = 'revision_requested',
      updated_at = now()
  where id = v_submission.assignment_id;

  insert into public.activity_events (
    recipient_id,
    event_type,
    payload,
    dedupe_key,
    gig_id,
    assignment_id,
    created_at
  ) values (
    v_assignment.worker_id,
    'revision_requested',
    jsonb_build_object(
      'assignment_id', v_submission.assignment_id,
      'gig_id', v_assignment.gig_id,
      'title', v_assignment.agreed_title,
      'submission_id', p_submission_id,
      'version', v_submission.version,
      'review_note', btrim(p_review_note)
    ),
    'revision_requested:' || p_submission_id::text,
    v_assignment.gig_id,
    v_submission.assignment_id,
    now()
  )
  on conflict (recipient_id, dedupe_key) do nothing;

  return v_updated_submission;
end;
$$;

create or replace function public.approve_assignment_completion(
  p_submission_id uuid,
  p_review_note text default null
)
returns public.submissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_submission public.submissions%rowtype;
  v_assignment public.assignments%rowtype;
  v_updated_submission public.submissions%rowtype;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  if p_review_note is not null and char_length(p_review_note) > 2000 then
    raise exception 'Review note cannot exceed 2000 characters.'
      using errcode = 'P0039';
  end if;

  select * into v_submission
  from public.submissions
  where id = p_submission_id;

  if not found then
    raise exception 'Submission not found.'
      using errcode = 'P0035';
  end if;

  select * into v_assignment
  from public.assignments
  where id = v_submission.assignment_id;

  if not found or v_assignment.employer_id <> v_caller_id then
    raise exception 'Caller is not the employer of this assignment.'
      using errcode = 'P0036';
  end if;

  if v_submission.status <> 'submitted' then
    raise exception 'Only pending submitted work can be approved.'
      using errcode = 'P0037';
  end if;

  if v_assignment.status <> 'submitted' then
    raise exception 'Assignment is not in submitted status.'
      using errcode = 'P0038';
  end if;

  update public.submissions
  set status = 'approved',
      review_note = p_review_note,
      reviewed_at = now(),
      updated_at = now()
  where id = p_submission_id
  returning * into v_updated_submission;

  update public.assignments
  set status = 'completed',
      completed_at = now(),
      updated_at = now()
  where id = v_submission.assignment_id;

  -- Concurrently approve any remaining pending or in_progress milestones
  update public.milestones
  set status = 'approved',
      approved_at = coalesce(approved_at, now()),
      updated_at = now()
  where assignment_id = v_submission.assignment_id
    and status <> 'approved';

  insert into public.activity_events (
    recipient_id,
    event_type,
    payload,
    dedupe_key,
    gig_id,
    assignment_id,
    created_at
  ) values (
    v_assignment.worker_id,
    'assignment_completed',
    jsonb_build_object(
      'assignment_id', v_submission.assignment_id,
      'gig_id', v_assignment.gig_id,
      'title', v_assignment.agreed_title,
      'amount', v_assignment.agreed_amount,
      'submission_id', p_submission_id,
      'version', v_submission.version,
      'review_note', p_review_note
    ),
    'assignment_completed:' || p_submission_id::text,
    v_assignment.gig_id,
    v_submission.assignment_id,
    now()
  )
  on conflict (recipient_id, dedupe_key) do nothing;

  return v_updated_submission;
end;
$$;

create or replace function public.list_assignment_submissions(
  p_assignment_id uuid
)
returns setof public.submissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_assignment public.assignments%rowtype;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  select * into v_assignment
  from public.assignments
  where id = p_assignment_id;

  if not found or (v_assignment.employer_id <> v_caller_id and v_assignment.worker_id <> v_caller_id) then
    raise exception 'Assignment not found or caller is not a participant.'
      using errcode = 'P0003';
  end if;

  return query
  select *
  from public.submissions
  where assignment_id = p_assignment_id
  order by version desc, created_at desc;
end;
$$;

create or replace function public.get_latest_assignment_submission(
  p_assignment_id uuid
)
returns public.submissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_assignment public.assignments%rowtype;
  v_latest public.submissions%rowtype;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  select * into v_assignment
  from public.assignments
  where id = p_assignment_id;

  if not found or (v_assignment.employer_id <> v_caller_id and v_assignment.worker_id <> v_caller_id) then
    raise exception 'Assignment not found or caller is not a participant.'
      using errcode = 'P0003';
  end if;

  select * into v_latest
  from public.submissions
  where assignment_id = p_assignment_id
  order by version desc, created_at desc
  limit 1;

  return v_latest;
end;
$$;

-- Permissions hardening: revoke from public/anon, grant strictly to authenticated
revoke all on function public.submit_assignment_work(uuid, text, uuid, uuid) from public, anon;
grant execute on function public.submit_assignment_work(uuid, text, uuid, uuid) to authenticated;

revoke all on function public.request_submission_revision(uuid, text) from public, anon;
grant execute on function public.request_submission_revision(uuid, text) to authenticated;

revoke all on function public.approve_assignment_completion(uuid, text) from public, anon;
grant execute on function public.approve_assignment_completion(uuid, text) to authenticated;

revoke all on function public.list_assignment_submissions(uuid) from public, anon;
grant execute on function public.list_assignment_submissions(uuid) to authenticated;

revoke all on function public.get_latest_assignment_submission(uuid) from public, anon;
grant execute on function public.get_latest_assignment_submission(uuid) to authenticated;

