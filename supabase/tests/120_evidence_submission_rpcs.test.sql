begin;

create extension if not exists pgtap;

select plan(21);

-- Setup test users
insert into auth.users (id, email, raw_user_meta_data)
values
  ('e0000000-0000-4000-8000-000000000001', 'm12-employer@example.com', '{"display_name":"M12 Employer"}'::jsonb),
  ('e0000000-0000-4000-8000-000000000002', 'm12-worker@example.com', '{"display_name":"M12 Worker"}'::jsonb),
  ('e0000000-0000-4000-8000-000000000003', 'm12-other@example.com', '{"display_name":"M12 Other"}'::jsonb)
on conflict (id) do nothing;

insert into public.profiles (id, display_name, home_area, onboarding_completed_at)
values
  ('e0000000-0000-4000-8000-000000000001', 'M12 Employer', 'Makati CBD', now()),
  ('e0000000-0000-4000-8000-000000000002', 'M12 Worker', 'Poblacion, Makati', now()),
  ('e0000000-0000-4000-8000-000000000003', 'M12 Other', 'BGC Taguig', now())
on conflict (id) do update set
  display_name = excluded.display_name,
  onboarding_completed_at = now();

-- Setup gig, assignment
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
  closed_at
) values (
  'e1000000-0000-4000-8000-000000000001',
  'e0000000-0000-4000-8000-000000000001',
  'Event Photography & Setup',
  'Photograph the community workshop and upload high-res photos.',
  'events',
  'onsite',
  'Makati CBD',
  14.5547,
  121.0244,
  4500,
  'PHP',
  'closed',
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
  'e1500000-0000-4000-8000-000000000001',
  'e1000000-0000-4000-8000-000000000001',
  'e0000000-0000-4000-8000-000000000002',
  'Ready to photograph the community workshop with professional gear.',
  'accepted',
  'e1600000-0000-4000-8000-000000000001',
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
  'e2000000-0000-4000-8000-000000000001',
  'e1000000-0000-4000-8000-000000000001',
  'e1500000-0000-4000-8000-000000000001',
  'e0000000-0000-4000-8000-000000000001',
  'e0000000-0000-4000-8000-000000000002',
  1,
  'Event Photography & Setup',
  'Photograph the community workshop and upload high-res photos.',
  4500,
  'PHP',
  'active',
  now(),
  now(),
  now(),
  'e2100000-0000-4000-8000-000000000001',
  now(),
  now()
) on conflict (id) do nothing;

-- 1. Unauthenticated begin_submission fails
set local role anon;
select throws_ok(
  $$ select public.begin_submission('e2000000-0000-4000-8000-000000000001', null, 'test note', 'e3000000-0000-4000-8000-000000000001') $$,
  '42501',
  null,
  'Anon cannot begin submission'
);

-- 2. Non-assigned worker fails
set local role authenticated;
select set_config('request.jwt.claim.sub', 'e0000000-0000-4000-8000-000000000003', true);
select throws_ok(
  $$ select public.begin_submission('e2000000-0000-4000-8000-000000000001', null, 'test note', 'e3000000-0000-4000-8000-000000000001') $$,
  'P0031',
  'Assignment not found or caller is not assigned worker.',
  'Unassigned worker cannot begin submission'
);

-- 3. Assigned worker successfully begins submission
select set_config('request.jwt.claim.sub', 'e0000000-0000-4000-8000-000000000002', true);

select lives_ok(
  $$ select public.begin_submission('e2000000-0000-4000-8000-000000000001', null, 'Initial photo shoot finished', 'e3000000-0000-4000-8000-000000000001') $$,
  'Assigned worker can begin submission'
);

-- 4. Check submission status is pending_upload and assignment remains active
select results_eq(
  $$ select status from public.submissions where client_request_id = 'e3000000-0000-4000-8000-000000000001' $$,
  $$ values ('pending_upload'::text) $$,
  'New submission is created with pending_upload status'
);

select results_eq(
  $$ select status from public.assignments where id = 'e2000000-0000-4000-8000-000000000001' $$,
  $$ values ('active'::text) $$,
  'Assignment remains active while submission is in pending_upload'
);

-- 5. Idempotent begin_submission with same client_request_id
select is(
  (select id from public.begin_submission('e2000000-0000-4000-8000-000000000001', null, 'Another note', 'e3000000-0000-4000-8000-000000000001')),
  (select id from public.submissions where client_request_id = 'e3000000-0000-4000-8000-000000000001'),
  'begin_submission is idempotent for same client_request_id'
);

-- 6. Finalize submission tests
-- Prepare variables
do $$
declare
  v_sub_id uuid;
begin
  select id into v_sub_id from public.submissions where client_request_id = 'e3000000-0000-4000-8000-000000000001';
  perform set_config('test.sub_id', v_sub_id::text, true);
end;
$$;

-- Unauthenticated finalize fails
set local role anon;
select throws_ok(
  $$ select public.finalize_submission(current_setting('test.sub_id')::uuid, '[]'::jsonb) $$,
  '42501',
  null,
  'Anon cannot finalize submission'
);

-- Non-worker finalize fails
set local role authenticated;
select set_config('request.jwt.claim.sub', 'e0000000-0000-4000-8000-000000000003', true);
select throws_ok(
  $$ select public.finalize_submission(current_setting('test.sub_id')::uuid, '[]'::jsonb) $$,
  'P0031',
  'Caller is not the submitter of this submission.',
  'Non-submitter cannot finalize submission'
);

-- Worker with tampered object path prefix fails
select set_config('request.jwt.claim.sub', 'e0000000-0000-4000-8000-000000000002', true);
select throws_ok(
  $$ select public.finalize_submission(
    current_setting('test.sub_id')::uuid,
    jsonb_build_array(
      jsonb_build_object(
        'object_path', 'other-user/wrong-path/photo1.jpg',
        'media_type', 'image/jpeg',
        'size_bytes', 1024
      )
    )
  ) $$,
  'P0041',
  'Invalid evidence object path.',
  'Tampered object path is rejected'
);

-- Worker with invalid media type fails
select throws_ok(
  $$ select public.finalize_submission(
    current_setting('test.sub_id')::uuid,
    jsonb_build_array(
      jsonb_build_object(
        'object_path', 'e0000000-0000-4000-8000-000000000002/e2000000-0000-4000-8000-000000000001/' || current_setting('test.sub_id') || '/file1.exe',
        'media_type', 'application/x-msdownload',
        'size_bytes', 1024
      )
    )
  ) $$,
  'P0042',
  'Invalid media type.',
  'Non-image media type is rejected'
);

-- Worker with oversized file (>5MB) fails
select throws_ok(
  $$ select public.finalize_submission(
    current_setting('test.sub_id')::uuid,
    jsonb_build_array(
      jsonb_build_object(
        'object_path', 'e0000000-0000-4000-8000-000000000002/e2000000-0000-4000-8000-000000000001/' || current_setting('test.sub_id') || '/huge.jpg',
        'media_type', 'image/jpeg',
        'size_bytes', 10000000
      )
    )
  ) $$,
  'P0043',
  'File size exceeds 5MB limit.',
  'Oversized file is rejected'
);

-- Valid finalize succeeds
select lives_ok(
  $$ select public.finalize_submission(
    current_setting('test.sub_id')::uuid,
    jsonb_build_array(
      jsonb_build_object(
        'object_path', 'e0000000-0000-4000-8000-000000000002/e2000000-0000-4000-8000-000000000001/' || current_setting('test.sub_id') || '/photo1.jpg',
        'media_type', 'image/jpeg',
        'size_bytes', 2048500
      ),
      jsonb_build_object(
        'object_path', 'e0000000-0000-4000-8000-000000000002/e2000000-0000-4000-8000-000000000001/' || current_setting('test.sub_id') || '/photo2.png',
        'media_type', 'image/png',
        'size_bytes', 1540200
      )
    )
  ) $$,
  'Valid finalize_submission with files succeeds'
);

-- Check submission updated to submitted
select results_eq(
  $$ select status from public.submissions where id = current_setting('test.sub_id')::uuid $$,
  $$ values ('submitted'::text) $$,
  'Submission status transitions to submitted'
);

-- Check assignment updated to submitted
select results_eq(
  $$ select status from public.assignments where id = 'e2000000-0000-4000-8000-000000000001' $$,
  $$ values ('submitted'::text) $$,
  'Assignment status transitions to submitted'
);

-- Check submission_files records created
select results_eq(
  $$ select count(*)::integer from public.submission_files where submission_id = current_setting('test.sub_id')::uuid $$,
  $$ values (2::integer) $$,
  'Two submission files attached'
);

-- Check activity event emitted with file count (switch to employer recipient for RLS)
select set_config('request.jwt.claim.sub', 'e0000000-0000-4000-8000-000000000001', true);
select results_eq(
  $$ select event_type, (payload ->> 'file_count')::integer
     from public.activity_events
     where recipient_id = 'e0000000-0000-4000-8000-000000000001'
       and event_type = 'work_submitted' $$,
  $$ values ('work_submitted'::text, 2::integer) $$,
  'Activity event emitted with file_count = 2'
);

-- Idempotent finalize call (switch back to worker submitter)
select set_config('request.jwt.claim.sub', 'e0000000-0000-4000-8000-000000000002', true);
select lives_ok(
  $$ select public.finalize_submission(current_setting('test.sub_id')::uuid, '[]'::jsonb) $$,
  'Repeated finalize on submitted submission is idempotent'
);

-- 7. list_submission_files tests
-- Unauthenticated fails
set local role anon;
select throws_ok(
  $$ select public.list_submission_files(current_setting('test.sub_id')::uuid) $$,
  '42501',
  null,
  'Anon cannot list submission files'
);

-- Non-participant fails
set local role authenticated;
select set_config('request.jwt.claim.sub', 'e0000000-0000-4000-8000-000000000003', true);
select throws_ok(
  $$ select public.list_submission_files(current_setting('test.sub_id')::uuid) $$,
  'P0003',
  'Assignment not found or caller is not a participant.',
  'Non-participant cannot list submission files'
);

-- Worker participant succeeds
select set_config('request.jwt.claim.sub', 'e0000000-0000-4000-8000-000000000002', true);
select is(
  (select count(*)::integer from public.list_submission_files(current_setting('test.sub_id')::uuid)),
  2::integer,
  'Worker can list 2 submission files'
);

-- Employer participant succeeds
select set_config('request.jwt.claim.sub', 'e0000000-0000-4000-8000-000000000001', true);
select is(
  (select count(*)::integer from public.list_submission_files(current_setting('test.sub_id')::uuid)),
  2::integer,
  'Employer can list 2 submission files'
);

rollback;

