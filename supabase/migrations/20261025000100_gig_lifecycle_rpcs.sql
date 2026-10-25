-- M05: Gig lifecycle RPCs for publishing and closing employer gigs
-- Enforces transactional state transitions, constraints, and activity events.

create or replace function public.publish_gig(p_gig_id uuid)
returns public.gigs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid := auth.uid();
  v_gig public.gigs%rowtype;
begin
  if v_caller_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication required';
  end if;

  select * into v_gig
  from public.gigs
  where id = p_gig_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'gig not found';
  end if;

  if v_gig.employer_id <> v_caller_id then
    raise exception using
      errcode = '42501',
      message = 'forbidden: caller does not own this gig';
  end if;

  if v_gig.status <> 'draft' then
    raise exception using
      errcode = '22000',
      message = 'only draft gigs can be published';
  end if;

  if v_gig.work_mode in ('onsite', 'hybrid') and (v_gig.public_area is null or btrim(v_gig.public_area) = '') then
    raise exception using
      errcode = '22000',
      message = 'public area is required for onsite and hybrid gigs';
  end if;

  if v_gig.budget_amount <= 0 then
    raise exception using
      errcode = '22000',
      message = 'budget amount must be positive';
  end if;

  update public.gigs
  set
    status = 'published',
    published_at = coalesce(published_at, now()),
    updated_at = now()
  where id = p_gig_id
  returning * into v_gig;

  insert into public.activity_events (
    recipient_id,
    actor_id,
    gig_id,
    event_type,
    payload,
    dedupe_key
  ) values (
    v_caller_id,
    v_caller_id,
    p_gig_id,
    'gig_published',
    jsonb_build_object(
      'gig_id', p_gig_id,
      'title', v_gig.title,
      'published_at', v_gig.published_at
    ),
    'gig_published:' || p_gig_id::text
  )
  on conflict (recipient_id, dedupe_key) do nothing;

  return v_gig;
end;
$$;

create or replace function public.close_gig(p_gig_id uuid)
returns public.gigs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid := auth.uid();
  v_gig public.gigs%rowtype;
begin
  if v_caller_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication required';
  end if;

  select * into v_gig
  from public.gigs
  where id = p_gig_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'gig not found';
  end if;

  if v_gig.employer_id <> v_caller_id then
    raise exception using
      errcode = '42501',
      message = 'forbidden: caller does not own this gig';
  end if;

  if v_gig.status in ('completed', 'closed', 'cancelled') then
    raise exception using
      errcode = '22000',
      message = 'gig is already in a terminal state';
  end if;

  if exists (
    select 1 from public.assignments as a
    where a.gig_id = p_gig_id
      and a.status in ('proposed', 'active', 'submitted', 'revision_requested')
  ) then
    raise exception using
      errcode = '22000',
      message = 'cannot close gig with active assignment';
  end if;

  update public.gigs
  set
    status = 'closed',
    closed_at = coalesce(closed_at, now()),
    updated_at = now()
  where id = p_gig_id
  returning * into v_gig;

  insert into public.activity_events (
    recipient_id,
    actor_id,
    gig_id,
    event_type,
    payload,
    dedupe_key
  ) values (
    v_caller_id,
    v_caller_id,
    p_gig_id,
    'gig_closed',
    jsonb_build_object(
      'gig_id', p_gig_id,
      'title', v_gig.title,
      'closed_at', v_gig.closed_at
    ),
    'gig_closed:' || p_gig_id::text
  )
  on conflict (recipient_id, dedupe_key) do nothing;

  return v_gig;
end;
$$;

revoke all on function public.publish_gig(uuid) from public, anon;
grant execute on function public.publish_gig(uuid) to authenticated;

revoke all on function public.close_gig(uuid) from public, anon;
grant execute on function public.close_gig(uuid) to authenticated;
