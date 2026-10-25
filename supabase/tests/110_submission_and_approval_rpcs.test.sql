begin;

create extension if not exists pgtap;

select plan(33);

-- Setup test users
insert into auth.users (id, email, raw_user_meta_data)
values
  ('d0000000-0000-4000-8000-000000000001', 'm09-employer@example.com', '{"display_name":"M09 Employer"}'::jsonb),
  ('d0000000-0000-4000-8000-000000000002', 'm09-worker@example.com', '{"display_name":"M09 Worker"}'::jsonb),
  ('d0000000-0000-4000-8000-000000000003', 'm09-other@example.com', '{"display_name":"M09 Other"}'::jsonb)
on conflict (id) do nothing;

insert into public.profiles (id, display_name, home_area, onboarding_completed_at)
values
  ('d0000000-0000-4000-8000-000000000001', 'M09 Employer', 'Legazpi Village, Makati', now()),
  ('d0000000-0000-4000-8000-000000000002', 'M09 Worker', 'Poblacion, Makati', now()),
  ('d0000000-0000-4000-8000-000000000003', 'M09 Other', 'Salcedo Village, Makati', now())
on conflict (id) do update set
  display_name = excluded.display_name,
  onboarding_completed_at = now();

-- Create test gig, application, assignment, and milestone
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
  published_at,
  closed_at,
  created_at,
  updated_at
) values (
  'd1000000-0000-4000-8000-000000000001',
  'd0000000-0000-4000-8000-000000000001',
  'Office Setup and Wiring',
  'Assemble network racks and test connectivity cables carefully.',
  'errands',
  'onsite',
  'Legazpi Village, Makati',
  14.5500,
  121.0200,
  3500,
  'PHP',
  'closed',
  now(),
  now(),
  now(),
  now()
) on conflict (id) do nothing;

insert into public.applications (
  id,
  gig_id,
  worker_id,
  message,
  status,
  client_request_id,
  decided_at,
  created_at,
  updated_at
) values (
  'd2000000-0000-4000-8000-000000000001',
  'd1000000-0000-4000-8000-000000000001',
  'd0000000-0000-4000-8000-000000000002',
  'Experienced with commercial networking and cable testing.',
  'accepted',
  'd2100000-0000-4000-8000-000000000001',
  now(),
  now(),
  now()
) on conflict (id) do nothing;

insert into public.assignments (
  id,
  gig_id,
  application_id,
  employer_id,
  worker_id,
  agreement_version,
  agreed_title,
  agreed_description,
  agreed_amount,
  currency,
  status,
  employer_confirmed_at,
  worker_confirmed_at,
  started_at,
  client_request_id,
  created_at,
  updated_at
) values (
  'd3000000-0000-4000-8000-000000000001',
  'd1000000-0000-4000-8000-000000000001',
  'd2000000-0000-4000-8000-000000000001',
  'd0000000-0000-4000-8000-000000000001',
  'd0000000-0000-4000-8000-000000000002',
  1,
  'Office Setup and Wiring',
  'Assemble network racks and test connectivity cables carefully.',
  3500,
  'PHP',
  'active',
  now(),
  now(),
  now(),
  'd3100000-0000-4000-8000-000000000001',
  now(),
  now()
) on conflict (id) do nothing;

insert into public.milestones (
  id,
  assignment_id,
  position,
  title,
  description,
  status,
  created_at,
  updated_at
) values (
  'd4000000-0000-4000-8000-000000000001',
  'd3000000-0000-4000-8000-000000000001',
  1,
  'Rack Mount and Assembly',
  'Mount all standard racks in the server closet.',
  'in_progress',
  now(),
  now()
) on conflict (id) do nothing;

-- Cache configuration
select set_config('test.employer_id', 'd0000000-0000-4000-8000-000000000001', false);
select set_config('test.worker_id', 'd0000000-0000-4000-8000-000000000002', false);
select set_config('test.other_id', 'd0000000-0000-4000-8000-000000000003', false);
select set_config('test.assignment_id', 'd3000000-0000-4000-8000-000000000001', false);
select set_config('test.milestone_id', 'd4000000-0000-4000-8000-000000000001', false);

-- 1. Anonymous caller cannot call submit_assignment_work
select throws_ok(
  format('select public.submit_assignment_work(''%s''::uuid, ''Completed cabling.'')', current_setting('test.assignment_id')),
  '42501',
  'Authentication required.',
  'Test 1: Anonymous cannot submit work'
);

-- 2. Unrelated user cannot submit work (P0031)
select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.other_id'), 'role', 'authenticated')::text, true);

select throws_ok(
  format('select public.submit_assignment_work(''%s''::uuid, ''Completed cabling.'')', current_setting('test.assignment_id')),
  'P0031',
  'Assignment not found or caller is not assigned worker.',
  'Test 2: Unrelated user rejected from submitting work'
);

-- 3. Employer cannot submit work on their own gig (P0031)
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.employer_id'), 'role', 'authenticated')::text, true);

select throws_ok(
  format('select public.submit_assignment_work(''%s''::uuid, ''Completed cabling.'')', current_setting('test.assignment_id')),
  'P0031',
  'Assignment not found or caller is not assigned worker.',
  'Test 3: Employer cannot submit work on assignment'
);

-- 4. Foreign milestone ID is rejected (P0033)
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.worker_id'), 'role', 'authenticated')::text, true);

select throws_ok(
  format('select public.submit_assignment_work(''%s''::uuid, ''Completed cabling.'', ''00000000-0000-4000-8000-000000000099''::uuid)', current_setting('test.assignment_id')),
  'P0033',
  'Specified milestone does not belong to this assignment.',
  'Test 4: Foreign milestone ID rejected'
);

-- 5. Worker submits work on active assignment (v1)
select lives_ok(
  format('
    select set_config(''test.sub_1_id'', (id)::text, false)
    from public.submit_assignment_work(
      ''%s''::uuid,
      ''All racks mounted and wiring completed according to spec.'',
      ''%s''::uuid,
      ''e0000000-0000-4000-8000-000000000001''::uuid
    )
  ', current_setting('test.assignment_id'), current_setting('test.milestone_id')),
  'Test 5: Worker submits work on active assignment'
);

select results_eq(
  format('select status, version from public.submissions where id = ''%s''::uuid', current_setting('test.sub_1_id')),
  $$values ('submitted'::text, 1::smallint)$$,
  'Test 5b: Submission record created with status submitted and version 1'
);

-- 6. Assignment status transitions to submitted
select results_eq(
  format('select status from public.assignments where id = ''%s''::uuid', current_setting('test.assignment_id')),
  $$values ('submitted'::text)$$,
  'Test 6: Assignment status updated to submitted'
);

-- 7. Activity event work_submitted recorded for employer
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.employer_id'), 'role', 'authenticated')::text, true);

select results_eq(
  format('
    select recipient_id, event_type, (payload->>''version'')::int
    from public.activity_events
    where dedupe_key = ''work_submitted:'' || ''%s'' || '':1''
  ', current_setting('test.assignment_id')),
  format('values (''%s''::uuid, ''work_submitted''::text, 1)', current_setting('test.employer_id')),
  'Test 7: Activity event work_submitted recorded for employer'
);

select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.worker_id'), 'role', 'authenticated')::text, true);

-- 8. Idempotent replay with same client_request_id returns existing submission
select results_eq(
  format('
    select id::text
    from public.submit_assignment_work(
      ''%s''::uuid,
      ''Duplicate attempt note.'',
      null,
      ''e0000000-0000-4000-8000-000000000001''::uuid
    )
  ', current_setting('test.assignment_id')),
  format('values (''%s''::text)', current_setting('test.sub_1_id')),
  'Test 8: Idempotent replay returns existing submission'
);

-- 9. Worker cannot submit work while already in submitted status (P0032)
select throws_ok(
  format('
    select public.submit_assignment_work(
      ''%s''::uuid,
      ''Another submission attempt.'',
      null,
      ''e0000000-0000-4000-8000-000000000002''::uuid
    )
  ', current_setting('test.assignment_id')),
  'P0032',
  'Work can only be submitted on active or revision-requested assignments.',
  'Test 9: Cannot submit when already submitted'
);

-- 10. Anonymous cannot call request_submission_revision
select set_config('role', 'anon', true);
select set_config('request.jwt.claims', null, true);

select throws_ok(
  format('select public.request_submission_revision(''%s''::uuid, ''Please tidy up rack 2.'')', current_setting('test.sub_1_id')),
  '42501',
  'permission denied for function request_submission_revision',
  'Test 10: Anonymous cannot call request_submission_revision'
);

-- 11. Worker cannot call request_submission_revision (P0036)
select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.worker_id'), 'role', 'authenticated')::text, true);

select throws_ok(
  format('select public.request_submission_revision(''%s''::uuid, ''Self revision note.'')', current_setting('test.sub_1_id')),
  'P0036',
  'Caller is not the employer of this assignment.',
  'Test 11: Worker cannot request revision'
);

-- 12. Unrelated user cannot call request_submission_revision (P0036)
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.other_id'), 'role', 'authenticated')::text, true);

select throws_ok(
  format('select public.request_submission_revision(''%s''::uuid, ''Other user note.'')', current_setting('test.sub_1_id')),
  'P0036',
  'Caller is not the employer of this assignment.',
  'Test 12: Unrelated user cannot request revision'
);

-- 13. Empty or whitespace note is rejected (P0034)
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.employer_id'), 'role', 'authenticated')::text, true);

select throws_ok(
  format('select public.request_submission_revision(''%s''::uuid, ''   '')', current_setting('test.sub_1_id')),
  'P0034',
  'Review note must be between 1 and 2000 characters.',
  'Test 13: Whitespace review note rejected'
);

-- 14. Employer requests revision
select lives_ok(
  format('select public.request_submission_revision(''%s''::uuid, ''Please bundle and label cables on Rack B.'')', current_setting('test.sub_1_id')),
  'Test 14: Employer requests revision successfully'
);

select results_eq(
  format('select status, review_note from public.submissions where id = ''%s''::uuid', current_setting('test.sub_1_id')),
  $$values ('revision_requested'::text, 'Please bundle and label cables on Rack B.'::text)$$,
  'Test 14b: Submission status updated to revision_requested'
);

-- 15. Assignment transitions to revision_requested
select results_eq(
  format('select status from public.assignments where id = ''%s''::uuid', current_setting('test.assignment_id')),
  $$values ('revision_requested'::text)$$,
  'Test 15: Assignment transitions to revision_requested'
);

-- 16. Activity event revision_requested emitted for worker
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.worker_id'), 'role', 'authenticated')::text, true);

select results_eq(
  format('
    select recipient_id, event_type
    from public.activity_events
    where dedupe_key = ''revision_requested:'' || ''%s''
  ', current_setting('test.sub_1_id')),
  format('values (''%s''::uuid, ''revision_requested''::text)', current_setting('test.worker_id')),
  'Test 16: Activity event revision_requested emitted for worker'
);

-- 17. Worker submits revised work (v2)
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.worker_id'), 'role', 'authenticated')::text, true);

select lives_ok(
  format('
    select set_config(''test.sub_2_id'', (id)::text, false)
    from public.submit_assignment_work(
      ''%s''::uuid,
      ''All cables on Rack B have been bundled and labeled.'',
      null,
      ''e0000000-0000-4000-8000-000000000003''::uuid
    )
  ', current_setting('test.assignment_id')),
  'Test 17: Worker submits revised work'
);

select results_eq(
  format('select status, version from public.submissions where id = ''%s''::uuid', current_setting('test.sub_2_id')),
  $$values ('submitted'::text, 2::smallint)$$,
  'Test 17b: Revised submission version is 2'
);

-- 18. Assignment transitions back to submitted
select results_eq(
  format('select status from public.assignments where id = ''%s''::uuid', current_setting('test.assignment_id')),
  $$values ('submitted'::text)$$,
  'Test 18: Assignment transitions back to submitted'
);

-- 19. Activity event work_submitted version 2 emitted
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.employer_id'), 'role', 'authenticated')::text, true);

select results_eq(
  format('
    select recipient_id, (payload->>''version'')::int
    from public.activity_events
    where dedupe_key = ''work_submitted:'' || ''%s'' || '':2''
  ', current_setting('test.assignment_id')),
  format('values (''%s''::uuid, 2)', current_setting('test.employer_id')),
  'Test 19: Activity event work_submitted version 2 recorded'
);

select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.worker_id'), 'role', 'authenticated')::text, true);

-- 20. Worker cannot approve completion (P0036)
select throws_ok(
  format('select public.approve_assignment_completion(''%s''::uuid, ''Self approve'')', current_setting('test.sub_2_id')),
  'P0036',
  'Caller is not the employer of this assignment.',
  'Test 20: Worker cannot approve completion'
);

-- 21. Unrelated user cannot approve completion (P0036)
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.other_id'), 'role', 'authenticated')::text, true);

select throws_ok(
  format('select public.approve_assignment_completion(''%s''::uuid, ''Approve attempt'')', current_setting('test.sub_2_id')),
  'P0036',
  'Caller is not the employer of this assignment.',
  'Test 21: Unrelated user cannot approve completion'
);

-- 22. Employer approves completion
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.employer_id'), 'role', 'authenticated')::text, true);

select lives_ok(
  format('select public.approve_assignment_completion(''%s''::uuid, ''Excellent work on the setup.'')', current_setting('test.sub_2_id')),
  'Test 22: Employer approves completion successfully'
);

select results_eq(
  format('select status, review_note from public.submissions where id = ''%s''::uuid', current_setting('test.sub_2_id')),
  $$values ('approved'::text, 'Excellent work on the setup.'::text)$$,
  'Test 22b: Submission status updated to approved'
);

-- 23. Assignment transitions to completed with completed_at set
select results_eq(
  format('select status, (completed_at is not null) from public.assignments where id = ''%s''::uuid', current_setting('test.assignment_id')),
  $$values ('completed'::text, true)$$,
  'Test 23: Assignment transitions to completed'
);

-- 24. Milestones transition to approved
select results_eq(
  format('select status, (approved_at is not null) from public.milestones where id = ''%s''::uuid', current_setting('test.milestone_id')),
  $$values ('approved'::text, true)$$,
  'Test 24: Milestone transitions to approved'
);

-- 25. Activity event assignment_completed emitted for worker
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.worker_id'), 'role', 'authenticated')::text, true);

select results_eq(
  format('
    select recipient_id, event_type, (payload->>''amount'')::numeric::int
    from public.activity_events
    where dedupe_key = ''assignment_completed:'' || ''%s''
  ', current_setting('test.sub_2_id')),
  format('values (''%s''::uuid, ''assignment_completed''::text, 3500)', current_setting('test.worker_id')),
  'Test 25: Activity event assignment_completed recorded for worker'
);

-- 26. list_assignment_submissions returns both versions in descending order
select results_eq(
  format('select version from public.list_assignment_submissions(''%s''::uuid)', current_setting('test.assignment_id')),
  $$values (2::smallint), (1::smallint)$$,
  'Test 26: Submissions listed in descending version order'
);

-- 27. get_latest_assignment_submission returns version 2
select results_eq(
  format('select version, status from public.get_latest_assignment_submission(''%s''::uuid)', current_setting('test.assignment_id')),
  $$values (2::smallint, 'approved'::text)$$,
  'Test 27: get_latest_assignment_submission returns version 2'
);

-- 28. Unrelated user cannot list submissions (P0003)
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.other_id'), 'role', 'authenticated')::text, true);

select throws_ok(
  format('select public.list_assignment_submissions(''%s''::uuid)', current_setting('test.assignment_id')),
  'P0003',
  'Assignment not found or caller is not a participant.',
  'Test 28: Unrelated user cannot list submissions'
);

-- 29. Unrelated user cannot get latest submission (P0003)
select throws_ok(
  format('select public.get_latest_assignment_submission(''%s''::uuid)', current_setting('test.assignment_id')),
  'P0003',
  'Assignment not found or caller is not a participant.',
  'Test 29: Unrelated user cannot get latest submission'
);

select * from finish();
rollback;

