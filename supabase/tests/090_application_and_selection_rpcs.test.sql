begin;

create extension if not exists pgtap with schema extensions;
select extensions.no_plan();

-- 1. Existence and signatures
select extensions.has_function(
  'public',
  'apply_to_gig',
  array['uuid', 'text', 'uuid'],
  'apply_to_gig exists with gig_id, message, and client_request_id arguments'
);

select extensions.has_function(
  'public',
  'withdraw_application',
  array['uuid'],
  'withdraw_application exists with application_id argument'
);

select extensions.has_function(
  'public',
  'select_worker_atomic',
  array['uuid', 'uuid'],
  'select_worker_atomic exists with application_id and client_request_id arguments'
);

select extensions.has_function(
  'public',
  'list_gig_applicants',
  array['uuid'],
  'list_gig_applicants exists with gig_id argument'
);

select extensions.has_function(
  'public',
  'get_worker_application_for_gig',
  array['uuid'],
  'get_worker_application_for_gig exists with gig_id argument'
);

-- 2. Security definer and search_path hardening
select extensions.ok(
  (
    select bool_and(
      p.prosecdef
      and p.proconfig @> array['search_path=""']::text[]
    )
    from pg_catalog.pg_proc as p
    join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'apply_to_gig',
        'withdraw_application',
        'select_worker_atomic',
        'list_gig_applicants',
        'get_worker_application_for_gig'
      )
  ),
  'all M07 application and selection RPCs are hardened security-definer functions with empty search path'
);

-- 3. Anonymous execution is denied
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select extensions.throws_ok(
  'select public.apply_to_gig(''91000000-0000-4000-8000-000000000001''::uuid, ''test'', ''92000000-0000-4000-8000-000000000001''::uuid)',
  '42501',
  null,
  'anonymous callers cannot apply to gigs'
);

select extensions.throws_ok(
  'select public.select_worker_atomic(''92000000-0000-4000-8000-000000000001''::uuid, ''93000000-0000-4000-8000-000000000001''::uuid)',
  '42501',
  null,
  'anonymous callers cannot select workers'
);

reset role;

-- 4. Test fixtures: 1 employer, 2 completed workers, 1 incomplete worker
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '90000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'employer-m07@example.test', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Elena Employer"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '90000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'worker-m07-a@example.test', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Warren Worker A"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '90000000-0000-4000-8000-000000000003',
    'authenticated', 'authenticated', 'worker-m07-b@example.test', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Wendy Worker B"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '90000000-0000-4000-8000-000000000004',
    'authenticated', 'authenticated', 'worker-m07-c@example.test', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Incomplete Worker C"}'::jsonb,
    now(), now(), '', '', '', ''
  )
on conflict (id) do nothing;

insert into public.profiles (id, display_name, home_area, onboarding_completed_at)
values
  ('90000000-0000-4000-8000-000000000001', 'Elena Employer', 'Makati', now()),
  ('90000000-0000-4000-8000-000000000002', 'Warren Worker A', 'Makati', now()),
  ('90000000-0000-4000-8000-000000000003', 'Wendy Worker B', 'Pasig', now()),
  ('90000000-0000-4000-8000-000000000004', 'Incomplete Worker C', 'Quezon City', null)
on conflict (id) do update set
  onboarding_completed_at = excluded.onboarding_completed_at;

-- Create 1 published gig and 1 draft gig
insert into public.gigs (
  id, employer_id, title, description, category, work_mode,
  public_area, public_latitude, public_longitude, budget_amount,
  status, published_at
) values
  (
    '91000000-0000-4000-8000-000000000001',
    '90000000-0000-4000-8000-000000000001',
    'Warehouse Inventory Sorting',
    'Help sort delivered boxes and label inventory shelves.',
    'errands',
    'onsite',
    'Makati',
    14.56,
    121.03,
    950.00,
    'published',
    now()
  ),
  (
    '91000000-0000-4000-8000-000000000002',
    '90000000-0000-4000-8000-000000000001',
    'Draft Gig Unpublished',
    'This gig is still draft and not ready for applications.',
    'errands',
    'onsite',
    'Makati',
    14.56,
    121.03,
    500.00,
    'draft',
    null
  )
on conflict (id) do nothing;

-- 5. Employer cannot apply to own gig (P0005)
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

select extensions.throws_ok(
  'select public.apply_to_gig(''91000000-0000-4000-8000-000000000001''::uuid, ''I will do it'', ''92000000-0000-4000-8000-000000000001''::uuid)',
  'P0005',
  'Employers cannot apply to their own gigs',
  'employer cannot apply to own gig'
);

-- 6. Worker with incomplete onboarding cannot apply (P0002)
select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-4000-8000-000000000004","role":"authenticated"}',
  true
);

select extensions.throws_ok(
  'select public.apply_to_gig(''91000000-0000-4000-8000-000000000001''::uuid, ''Hello'', ''92000000-0000-4000-8000-000000000002''::uuid)',
  'P0002',
  'Worker onboarding must be completed before applying',
  'worker without completed onboarding cannot apply'
);

-- 7. Cannot apply to draft gig (P0004)
select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);

select extensions.throws_ok(
  'select public.apply_to_gig(''91000000-0000-4000-8000-000000000002''::uuid, ''Hello'', ''92000000-0000-4000-8000-000000000003''::uuid)',
  'P0004',
  'Applications are only accepted for published gigs',
  'applications are rejected for unpublished draft gigs'
);

-- 8. Worker A successfully applies to published gig
select extensions.lives_ok(
  'select public.apply_to_gig(''91000000-0000-4000-8000-000000000001''::uuid, ''I have 3 years warehouse experience.'', ''92000000-0000-4000-8000-000000000010''::uuid)',
  'Worker A applies to published gig successfully'
);

-- Verify application status
select extensions.is(
  (
    select status from public.applications
    where worker_id = '90000000-0000-4000-8000-000000000002'
      and gig_id = '91000000-0000-4000-8000-000000000001'
  ),
  'pending',
  'new application has pending status'
);

-- Verify employer received activity event (switch to employer so RLS permits reading)
select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

select extensions.is(
  (
    select count(*)::integer from public.activity_events
    where recipient_id = '90000000-0000-4000-8000-000000000001'
      and event_type = 'gig_application_received'
  ),
  1,
  'employer received application_received activity event'
);

-- Switch back to Worker A
select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);

-- 9. Idempotent re-apply returns same application
select extensions.is(
  (
    select (public.apply_to_gig(
      '91000000-0000-4000-8000-000000000001'::uuid,
      'Duplicate attempt',
      '92000000-0000-4000-8000-000000000010'::uuid
    )).id
  ),
  (
    select id from public.applications
    where worker_id = '90000000-0000-4000-8000-000000000002'
      and client_request_id = '92000000-0000-4000-8000-000000000010'
  ),
  'idempotent re-apply returns existing application record'
);

-- 10. Worker A cannot apply again with different client_request_id (P0008)
select extensions.throws_ok(
  'select public.apply_to_gig(''91000000-0000-4000-8000-000000000001''::uuid, ''Second attempt'', ''92000000-0000-4000-8000-000000000011''::uuid)',
  'P0008',
  'You have already applied to this gig',
  'worker cannot submit duplicate active applications to same gig'
);

-- 11. Worker A withdraws application
select extensions.lives_ok(
  'select public.withdraw_application((select id from public.applications where worker_id = ''90000000-0000-4000-8000-000000000002''))',
  'Worker A withdraws pending application'
);

select extensions.is(
  (
    select status from public.applications
    where worker_id = '90000000-0000-4000-8000-000000000002'
  ),
  'withdrawn',
  'application status is now withdrawn'
);

-- 12. Worker A can re-apply after withdrawal
select extensions.lives_ok(
  'select public.apply_to_gig(''91000000-0000-4000-8000-000000000001''::uuid, ''Reapplying with updated availability.'', ''92000000-0000-4000-8000-000000000020''::uuid)',
  'Worker A reapplies after withdrawal'
);

-- 13. Worker B also applies to gig
select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-4000-8000-000000000003","role":"authenticated"}',
  true
);

select extensions.lives_ok(
  'select public.apply_to_gig(''91000000-0000-4000-8000-000000000001''::uuid, ''Available immediately.'', ''92000000-0000-4000-8000-000000000030''::uuid)',
  'Worker B applies to published gig'
);

-- 14. Employer lists applicants
select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

select extensions.is(
  (select count(*)::integer from public.list_gig_applicants('91000000-0000-4000-8000-000000000001'::uuid)),
  3,
  'employer lists all 3 application records for gig (including withdrawn historical)'
);

-- 15. Non-employer cannot select worker
select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);

select extensions.throws_ok(
  'select public.select_worker_atomic((select id from public.applications where worker_id = ''90000000-0000-4000-8000-000000000002'' and status = ''pending''), ''93000000-0000-4000-8000-000000000001''::uuid)',
  'P0013',
  'Only the gig employer can select an applicant',
  'worker cannot select an applicant'
);

-- 16. Employer selects Worker A atomically
select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

select extensions.lives_ok(
  'select public.select_worker_atomic((select id from public.applications where worker_id = ''90000000-0000-4000-8000-000000000002'' and status = ''pending''), ''93000000-0000-4000-8000-000000000001''::uuid)',
  'employer selects Worker A atomically'
);

-- Verify Winning Application status = 'accepted'
select extensions.is(
  (
    select status from public.applications
    where worker_id = '90000000-0000-4000-8000-000000000002'
      and status = 'accepted'
  ),
  'accepted',
  'winning application status is accepted'
);

-- Verify Competitor Worker B status = 'rejected'
select extensions.is(
  (
    select status from public.applications
    where worker_id = '90000000-0000-4000-8000-000000000003'
  ),
  'rejected',
  'competing pending application is rejected'
);

-- Verify Gig status = 'closed'
select extensions.is(
  (select status from public.gigs where id = '91000000-0000-4000-8000-000000000001'),
  'closed',
  'gig is now closed'
);

-- Verify Assignment created
select extensions.is(
  (
    select status from public.assignments
    where gig_id = '91000000-0000-4000-8000-000000000001'
      and worker_id = '90000000-0000-4000-8000-000000000002'
  ),
  'proposed',
  'atomic assignment created in proposed status'
);

-- Verify Activity event emitted to winning worker (switch to Worker A so RLS permits reading)
select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);

select extensions.is(
  (
    select count(*)::integer from public.activity_events
    where recipient_id = '90000000-0000-4000-8000-000000000002'
      and event_type = 'gig_applicant_selected'
  ),
  1,
  'winning worker received applicant_selected activity event'
);

-- Switch back to Employer
select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

-- 17. Idempotent re-selection returns same assignment
select extensions.is(
  (
    select (public.select_worker_atomic(
      (select id from public.applications where worker_id = '90000000-0000-4000-8000-000000000002' and status = 'accepted'),
      '93000000-0000-4000-8000-000000000001'::uuid
    )).id
  ),
  (
    select id from public.assignments
    where employer_id = '90000000-0000-4000-8000-000000000001'
      and client_request_id = '93000000-0000-4000-8000-000000000001'
  ),
  'idempotent re-selection returns existing assignment'
);

select * from extensions.finish();
rollback;
