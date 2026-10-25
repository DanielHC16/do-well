-- Milestone M12: Evidence Submission and File Attachment RPCs
-- Atomically manages reserving pending submissions, verifying uploaded evidence objects, and finalizing submissions

create or replace function public.begin_submission(
  p_assignment_id uuid,
  p_milestone_id uuid default null,
  p_note text default null,
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

  -- Idempotency check: if caller previously reserved with same client_request_id
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

  -- Insert submission in pending_upload status. Assignment status is NOT changed yet!
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
    'pending_upload',
    null,
    p_client_request_id,
    now(),
    now()
  )
  returning * into v_new_submission;

  return v_new_submission;
end;
$$;

create or replace function public.finalize_submission(
  p_submission_id uuid,
  p_files jsonb default '[]'::jsonb
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
  v_file jsonb;
  v_object_path text;
  v_media_type text;
  v_size_bytes integer;
  v_expected_prefix text;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  select * into v_submission
  from public.submissions
  where id = p_submission_id;

  if not found then
    raise exception 'Submission not found.'
      using errcode = 'P0035';
  end if;

  if v_submission.submitted_by <> v_caller_id then
    raise exception 'Caller is not the submitter of this submission.'
      using errcode = 'P0031';
  end if;

  -- If already submitted, return it idempotently
  if v_submission.status = 'submitted' then
    return v_submission;
  end if;

  if v_submission.status <> 'pending_upload' then
    raise exception 'Submission is not in pending_upload status.'
      using errcode = 'P0040';
  end if;

  select * into v_assignment
  from public.assignments
  where id = v_submission.assignment_id;

  if not found or v_assignment.worker_id <> v_caller_id then
    raise exception 'Assignment not found or caller is not assigned worker.'
      using errcode = 'P0031';
  end if;

  v_expected_prefix := v_caller_id::text || '/' || v_submission.assignment_id::text || '/' || v_submission.id::text || '/';

  -- Validate and insert file references
  if p_files is not null and jsonb_array_length(p_files) > 0 then
    for v_file in select * from jsonb_array_elements(p_files)
    loop
      v_object_path := v_file ->> 'object_path';
      v_media_type := v_file ->> 'media_type';
      v_size_bytes := (v_file ->> 'size_bytes')::integer;

      if v_object_path is null or not (v_object_path like v_expected_prefix || '%') then
        raise exception 'Invalid evidence object path.'
          using errcode = 'P0041';
      end if;

      if v_media_type not in ('image/jpeg', 'image/png', 'image/webp') then
        raise exception 'Invalid media type.'
          using errcode = 'P0042';
      end if;

      if v_size_bytes is null or v_size_bytes < 1 or v_size_bytes > 5242880 then
        raise exception 'File size exceeds 5MB limit.'
          using errcode = 'P0043';
      end if;

      insert into public.submission_files (
        submission_id,
        uploader_id,
        object_path,
        media_type,
        size_bytes,
        created_at,
        updated_at
      ) values (
        v_submission.id,
        v_caller_id,
        v_object_path,
        v_media_type,
        v_size_bytes,
        now(),
        now()
      )
      on conflict (object_path) do nothing;
    end loop;
  end if;

  -- Advance submission to submitted
  update public.submissions
  set status = 'submitted',
      submitted_at = now(),
      updated_at = now()
  where id = p_submission_id
  returning * into v_updated_submission;

  -- Advance assignment status to submitted
  update public.assignments
  set status = 'submitted',
      updated_at = now()
  where id = v_submission.assignment_id;

  -- Record activity event for employer
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
      'assignment_id', v_submission.assignment_id,
      'gig_id', v_assignment.gig_id,
      'title', v_assignment.agreed_title,
      'submission_id', v_updated_submission.id,
      'version', v_updated_submission.version,
      'note', v_updated_submission.note,
      'file_count', jsonb_array_length(coalesce(p_files, '[]'::jsonb))
    ),
    'work_submitted:' || v_submission.assignment_id::text || ':' || v_updated_submission.version::text,
    v_assignment.gig_id,
    v_submission.assignment_id,
    now()
  )
  on conflict (recipient_id, dedupe_key) do nothing;

  return v_updated_submission;
end;
$$;

create or replace function public.list_submission_files(
  p_submission_id uuid
)
returns setof public.submission_files
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_submission public.submissions%rowtype;
  v_assignment public.assignments%rowtype;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
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

  if not found or (v_assignment.employer_id <> v_caller_id and v_assignment.worker_id <> v_caller_id) then
    raise exception 'Assignment not found or caller is not a participant.'
      using errcode = 'P0003';
  end if;

  return query
  select *
  from public.submission_files
  where submission_id = p_submission_id
  order by created_at asc;
end;
$$;

-- Permissions hardening: revoke from public/anon, grant strictly to authenticated
revoke all on function public.begin_submission(uuid, uuid, text, uuid) from public, anon;
grant execute on function public.begin_submission(uuid, uuid, text, uuid) to authenticated;

revoke all on function public.finalize_submission(uuid, jsonb) from public, anon;
grant execute on function public.finalize_submission(uuid, jsonb) to authenticated;

revoke all on function public.list_submission_files(uuid) from public, anon;
grant execute on function public.list_submission_files(uuid) to authenticated;

