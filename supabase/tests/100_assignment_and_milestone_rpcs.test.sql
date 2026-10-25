begin;

create extension if not exists pgtap;
select plan(31);

-- Fixture data setup: 1 employer, 2 workers
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  (
    '00000000-0000-0000-0000-000000000000',
    'c0000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'employer-m08@example.test', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Employer M08"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'c0000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'worker1-m08@example.test', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Worker One M08"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'c0000000-0000-4000-8000-000000000003',
    'authenticated', 'authenticated', 'worker2-m08@example.test', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Worker Two M08"}'::jsonb,
    now(), now(), '', '', '', ''
  )
on conflict (id) do nothing;

insert into public.profiles (id, display_name, home_area, onboarding_completed_at)
values
  ('c0000000-0000-4000-8000-000000000001', 'Employer M08', 'Legazpi Village, Makati', now()),
  ('c0000000-0000-4000-8000-000000000002', 'Worker One M08', 'Poblacion, Makati', now()),
  ('c0000000-0000-4000-8000-000000000003', 'Worker Two M08', 'Bel-Air, Makati', now())
on conflict (id) do update set
  display_name = excluded.display_name,
  home_area = excluded.home_area,
  onboarding_completed_at = excluded.onboarding_completed_at;

-- Insert all gigs as postgres role
insert into public.gigs (
  id,
  employer_id,
  title,
  description,
  category,
  work_mode,
  public_area,
  public_latitude,
  public_longitude,
  budget_amount,
  currency,
  status,
  published_at
) values
  (
    'c1000000-0000-4000-8000-000000000001',
    'c0000000-0000-4000-8000-000000000001',
    'Office Furniture Assembly',
    'Assemble 4 ergonomic desks and 6 office chairs in Makati.',
    'errands',
    'onsite',
    'Legazpi Village, Makati',
    14.5547,
    121.0244,
    2500,
    'PHP',
    'published',
    now()
  ),
  (
    'c1000000-0000-4000-8000-000000000002',
    'c0000000-0000-4000-8000-000000000001',
    'Aircon Filter Cleaning',
    'Clean 2 split-type aircon units in apartment.',
    'cleaning',
    'onsite',
    'Legazpi Village, Makati',
    14.5547,
    121.0244,
    1500,
    'PHP',
    'published',
    now()
  ),
  (
    'c1000000-0000-4000-8000-000000000003',
    'c0000000-0000-4000-8000-000000000001',
    'Balcony Waterproofing',
    'Seal balcony perimeter tile joints against water leakage.',
    'other',
    'onsite',
    'Legazpi Village, Makati',
    14.5547,
    121.0244,
    3500,
    'PHP',
    'published',
    now()
  );

-- Worker 1 applies to Gig 1
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', 'c0000000-0000-4000-8000-000000000002',
    'role', 'authenticated'
  )::text,
  true
);

select public.apply_to_gig(
  'c1000000-0000-4000-8000-000000000001',
  'Experienced with office installations.',
  'c2000000-0000-4000-8000-000000000001'
);

-- Employer selects Worker 1 -> Proposed assignment created
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', 'c0000000-0000-4000-8000-000000000001',
    'role', 'authenticated'
  )::text,
  true
);

select public.select_worker_atomic(
  (select id from public.applications where worker_id = 'c0000000-0000-4000-8000-000000000002'),
  'c3000000-0000-4000-8000-000000000001'
);

select set_config('test.assignment_id_1', id::text, false)
from public.assignments
where gig_id = 'c1000000-0000-4000-8000-000000000001';

-- Test 1: Verify assignment exists in proposed status
select results_eq(
  $$
    select status, agreed_title, agreed_amount, worker_confirmed_at is null
    from public.assignments
    where gig_id = 'c1000000-0000-4000-8000-000000000001'
  $$,
  $$
    values ('proposed'::text, 'Office Furniture Assembly'::text, 2500::numeric(12,2), true)
  $$,
  'Assignment is instantiated in proposed status with correct title and amount'
);

-- Test 2: Anonymous call to confirm_assignment rejected (42501)
set local role anon;
select throws_ok(
  $$
    select public.confirm_assignment(
      (select id from public.assignments where gig_id = 'c1000000-0000-4000-8000-000000000001')
    )
  $$,
  '42501',
  null,
  'Anonymous caller cannot confirm assignment'
);

-- Test 3: Employer cannot confirm assignment (P0020)
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', 'c0000000-0000-4000-8000-000000000001',
    'role', 'authenticated'
  )::text,
  true
);

select throws_ok(
  $$
    select public.confirm_assignment(
      (select id from public.assignments where gig_id = 'c1000000-0000-4000-8000-000000000001')
    )
  $$,
  'P0020',
  'Only the assigned worker can confirm the agreement',
  'Employer cannot confirm assignment'
);

-- Test 4: Unrelated Worker 2 cannot confirm assignment (P0020)
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', 'c0000000-0000-4000-8000-000000000003',
    'role', 'authenticated'
  )::text,
  true
);

select throws_ok(
  format('select public.confirm_assignment(%L::uuid)', current_setting('test.assignment_id_1')),
  'P0020',
  'Only the assigned worker can confirm the agreement',
  'Unrelated worker cannot confirm assignment'
);

-- Test 5: Worker 1 confirms assignment successfully
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', 'c0000000-0000-4000-8000-000000000002',
    'role', 'authenticated'
  )::text,
  true
);

select public.confirm_assignment(
  (select id from public.assignments where gig_id = 'c1000000-0000-4000-8000-000000000001')
);

-- Test 6: Verify assignment status is active, worker_confirmed_at and started_at set
select results_eq(
  $$
    select status, worker_confirmed_at is not null, started_at is not null
    from public.assignments
    where gig_id = 'c1000000-0000-4000-8000-000000000001'
  $$,
  $$
    values ('active'::text, true, true)
  $$,
  'Assignment transitions to active and timestamps are recorded'
);

-- Test 7: Verify activity event emitted for employer
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', 'c0000000-0000-4000-8000-000000000001',
    'role', 'authenticated'
  )::text,
  true
);

select results_eq(
  $$
    select event_type, recipient_id
    from public.activity_events
    where recipient_id = 'c0000000-0000-4000-8000-000000000001'
      and event_type = 'assignment_confirmed'
  $$,
  $$
    values ('assignment_confirmed'::text, 'c0000000-0000-4000-8000-000000000001'::uuid)
  $$,
  'Employer receives assignment_confirmed activity event'
);

-- Test 8: Cannot re-confirm active assignment (P0021)
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', 'c0000000-0000-4000-8000-000000000002',
    'role', 'authenticated'
  )::text,
  true
);

select throws_ok(
  $$
    select public.confirm_assignment(
      (select id from public.assignments where gig_id = 'c1000000-0000-4000-8000-000000000001')
    )
  $$,
  'P0021',
  'Assignment is not in proposed status',
  'Cannot confirm non-proposed assignment'
);

-- Milestone Tests
-- Test 9: Non-employer cannot create milestone (P0023)
select throws_ok(
  $$
    select public.create_assignment_milestone(
      (select id from public.assignments where gig_id = 'c1000000-0000-4000-8000-000000000001'),
      'Inspect site layout'
    )
  $$,
  'P0023',
  'Only the employer can create milestones',
  'Worker cannot create milestones'
);

-- Test 10: Employer creates Milestone 1
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', 'c0000000-0000-4000-8000-000000000001',
    'role', 'authenticated'
  )::text,
  true
);

select lives_ok(
  $$
    select public.create_assignment_milestone(
      (select id from public.assignments where gig_id = 'c1000000-0000-4000-8000-000000000001'),
      'Inspect site layout and verify parts',
      'Check hardware packages for 4 desks and 6 chairs.'
    )
  $$,
  'Employer creates Milestone 1 successfully'
);

-- Test 11: Milestone 1 has position 1 and status pending
select results_eq(
  $$
    select position, title, status
    from public.milestones
    where assignment_id = (select id from public.assignments where gig_id = 'c1000000-0000-4000-8000-000000000001')
      and position = 1
  $$,
  $$
    values (1::smallint, 'Inspect site layout and verify parts'::text, 'pending'::text)
  $$,
  'Milestone 1 has position 1 and status pending'
);

-- Test 12: Employer creates Milestone 2
select lives_ok(
  $$
    select public.create_assignment_milestone(
      (select id from public.assignments where gig_id = 'c1000000-0000-4000-8000-000000000001'),
      'Complete furniture assembly and clean workspace',
      'All desks and chairs assembled and tested.'
    )
  $$,
  'Employer creates Milestone 2 successfully'
);

-- Test 13: Milestone 2 auto-increments position to 2
select results_eq(
  $$
    select position, status
    from public.milestones
    where assignment_id = (select id from public.assignments where gig_id = 'c1000000-0000-4000-8000-000000000001')
      and position = 2
  $$,
  $$
    values (2::smallint, 'pending'::text)
  $$,
  'Milestone 2 has position 2 and status pending'
);

-- Test 14: Worker receives milestone_created activity event
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', 'c0000000-0000-4000-8000-000000000002',
    'role', 'authenticated'
  )::text,
  true
);

select results_eq(
  $$
    select count(*)::int
    from public.activity_events
    where recipient_id = 'c0000000-0000-4000-8000-000000000002'
      and event_type = 'milestone_created'
  $$,
  $$
    values (2::int)
  $$,
  'Worker received 2 milestone_created activity events'
);

-- Test 15: Non-worker cannot start milestone (P0028)
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', 'c0000000-0000-4000-8000-000000000001',
    'role', 'authenticated'
  )::text,
  true
);

select throws_ok(
  $$
    select public.start_assignment_milestone(
      (select id from public.milestones where position = 1 and assignment_id = (
        select id from public.assignments where gig_id = 'c1000000-0000-4000-8000-000000000001'
      ))
    )
  $$,
  'P0028',
  'Only the assigned worker can start a milestone',
  'Employer cannot start milestone'
);

-- Test 16: Worker 1 starts Milestone 1
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', 'c0000000-0000-4000-8000-000000000002',
    'role', 'authenticated'
  )::text,
  true
);

select lives_ok(
  $$
    select public.start_assignment_milestone(
      (select id from public.milestones where position = 1 and assignment_id = (
        select id from public.assignments where gig_id = 'c1000000-0000-4000-8000-000000000001'
      ))
    )
  $$,
  'Worker 1 starts Milestone 1 successfully'
);

-- Test 17: Milestone 1 status is in_progress
select results_eq(
  $$
    select status
    from public.milestones
    where position = 1 and assignment_id = (
      select id from public.assignments where gig_id = 'c1000000-0000-4000-8000-000000000001'
    )
  $$,
  $$
    values ('in_progress'::text)
  $$,
  'Milestone 1 is now in_progress'
);

-- Test 18: Cannot re-start in_progress milestone (P0030)
select throws_ok(
  $$
    select public.start_assignment_milestone(
      (select id from public.milestones where position = 1 and assignment_id = (
        select id from public.assignments where gig_id = 'c1000000-0000-4000-8000-000000000001'
      ))
    )
  $$,
  'P0030',
  'Milestone is not pending',
  'Cannot start already in_progress milestone'
);

-- Test 19: Employer receives milestone_started activity event
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', 'c0000000-0000-4000-8000-000000000001',
    'role', 'authenticated'
  )::text,
  true
);

select results_eq(
  $$
    select count(*)::int
    from public.activity_events
    where recipient_id = 'c0000000-0000-4000-8000-000000000001'
      and event_type = 'milestone_started'
  $$,
  $$
    values (1::int)
  $$,
  'Employer received milestone_started activity event'
);

-- Test 20: list_assignment_milestones returns ordered milestones
select results_eq(
  $$
    select position, status
    from public.list_assignment_milestones(
      (select id from public.assignments where gig_id = 'c1000000-0000-4000-8000-000000000001')
    )
  $$,
  $$
    values (1::smallint, 'in_progress'::text), (2::smallint, 'pending'::text)
  $$,
  'list_assignment_milestones returns milestones ordered by position'
);

-- Test 21: get_assignment_detail returns valid json structure
select is(
  (select public.get_assignment_detail(
    (select id from public.assignments where gig_id = 'c1000000-0000-4000-8000-000000000001')
  )->'assignment'->>'status'),
  'active',
  'get_assignment_detail returns assignment status active'
);

-- Test 22: get_assignment_detail includes employer and worker details
select is(
  (select public.get_assignment_detail(
    (select id from public.assignments where gig_id = 'c1000000-0000-4000-8000-000000000001')
  )->'worker'->>'displayName'),
  'Worker One M08',
  'get_assignment_detail includes worker displayName'
);

-- Test 23: get_assignment_detail rejects unrelated third party (42501)
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', 'c0000000-0000-4000-8000-000000000003',
    'role', 'authenticated'
  )::text,
  true
);

select throws_ok(
  format('select public.get_assignment_detail(%L::uuid)', current_setting('test.assignment_id_1')),
  '42501',
  'Unauthorized to view assignment',
  'Unrelated user cannot view assignment detail'
);

-- Test 24: list_user_activity returns events for recipient
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', 'c0000000-0000-4000-8000-000000000001',
    'role', 'authenticated'
  )::text,
  true
);

select cmp_ok(
  (select count(*)::int from public.list_user_activity(50, 0)),
  '>=',
  2,
  'list_user_activity returns multiple activity events for employer'
);

select set_config('test.event_id', id::text, false)
from public.list_user_activity(1, 0);

-- Test 25: mark_activity_read marks event as read
select is(
  (
    select read_at is null
    from public.activity_events
    where id = current_setting('test.event_id')::uuid
  ),
  true,
  'Recent event initially has read_at null'
);

-- Test 26: Call mark_activity_read
select lives_ok(
  format('select public.mark_activity_read(%L::uuid)', current_setting('test.event_id')),
  'mark_activity_read executes cleanly'
);

-- Test 27: Verify read_at is now set
select is(
  (
    select read_at is not null
    from public.activity_events
    where id = current_setting('test.event_id')::uuid
  ),
  true,
  'Activity event read_at is now populated'
);

-- DECLINE FLOW TEST
-- Worker 2 applies to Gig 2
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', 'c0000000-0000-4000-8000-000000000003',
    'role', 'authenticated'
  )::text,
  true
);

select public.apply_to_gig(
  'c1000000-0000-4000-8000-000000000002',
  'Experienced HVAC technician.',
  'c2000000-0000-4000-8000-000000000002'
);

-- Employer selects Worker 2
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', 'c0000000-0000-4000-8000-000000000001',
    'role', 'authenticated'
  )::text,
  true
);

select public.select_worker_atomic(
  (select id from public.applications where gig_id = 'c1000000-0000-4000-8000-000000000002'),
  'c3000000-0000-4000-8000-000000000002'
);

-- Test 28: Worker 2 declines assignment
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', 'c0000000-0000-4000-8000-000000000003',
    'role', 'authenticated'
  )::text,
  true
);

select public.decline_assignment(
  (select id from public.assignments where gig_id = 'c1000000-0000-4000-8000-000000000002')
);

-- Test 29: Assignment status is declined and cancelled_at is set
select results_eq(
  $$
    select status, cancelled_at is not null
    from public.assignments
    where gig_id = 'c1000000-0000-4000-8000-000000000002'
  $$,
  $$
    values ('declined'::text, true)
  $$,
  'Declined assignment has status declined and cancelled_at set'
);

-- Test 30: Gig 2 status reverted to published
select is(
  (select status from public.gigs where id = 'c1000000-0000-4000-8000-000000000002'),
  'published',
  'Gig is reopened to published after worker decline'
);

-- CANCEL FLOW TEST
-- Worker 1 applies to Gig 3
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', 'c0000000-0000-4000-8000-000000000002',
    'role', 'authenticated'
  )::text,
  true
);

select public.apply_to_gig(
  'c1000000-0000-4000-8000-000000000003',
  'Waterproofing certified contractor.',
  'c2000000-0000-4000-8000-000000000003'
);

-- Employer selects Worker 1
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', 'c0000000-0000-4000-8000-000000000001',
    'role', 'authenticated'
  )::text,
  true
);

select public.select_worker_atomic(
  (select id from public.applications where gig_id = 'c1000000-0000-4000-8000-000000000003'),
  'c3000000-0000-4000-8000-000000000003'
);

-- Test 31: Worker cannot cancel assignment (P0022)
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', 'c0000000-0000-4000-8000-000000000002',
    'role', 'authenticated'
  )::text,
  true
);

select throws_ok(
  $$
    select public.cancel_proposed_assignment(
      (select id from public.assignments where gig_id = 'c1000000-0000-4000-8000-000000000003')
    )
  $$,
  'P0022',
  'Only the employer can cancel the proposed agreement',
  'Worker cannot cancel proposed assignment'
);

-- Test 32: Employer cancels assignment
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', 'c0000000-0000-4000-8000-000000000001',
    'role', 'authenticated'
  )::text,
  true
);

select public.cancel_proposed_assignment(
  (select id from public.assignments where gig_id = 'c1000000-0000-4000-8000-000000000003')
);

-- Test 33: Assignment status is cancelled
select results_eq(
  $$
    select status, cancelled_at is not null
    from public.assignments
    where gig_id = 'c1000000-0000-4000-8000-000000000003'
  $$,
  $$
    values ('cancelled'::text, true)
  $$,
  'Cancelled assignment has status cancelled and cancelled_at set'
);

-- Test 34: Gig 3 status reverted to published
select is(
  (select status from public.gigs where id = 'c1000000-0000-4000-8000-000000000003'),
  'published',
  'Gig is reopened to published after employer cancellation'
);

select * from finish();
rollback;
