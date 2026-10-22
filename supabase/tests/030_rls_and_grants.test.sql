begin;

create extension if not exists pgtap with schema extensions;
select extensions.no_plan();

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as c
    join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = any (
        array[
          'activity_events', 'ai_request_log', 'applications', 'assignments',
          'gig_private_locations', 'gigs', 'milestones', 'profiles', 'reports',
          'submission_files', 'submissions', 'worker_preferences'
        ]
      )
      and c.relrowsecurity
      and c.relforcerowsecurity
  ),
  12,
  'RLS is enabled and forced on every public domain table'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
select
  '00000000-0000-0000-0000-000000000000'::uuid,
  user_id,
  'authenticated', 'authenticated', email, '', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', display_name),
  now(), now(), '', '', '', ''
from (
  values
    ('20000000-0000-0000-0000-000000000001'::uuid, 'employer-a@example.test', 'Employer A'),
    ('20000000-0000-0000-0000-000000000002'::uuid, 'employer-b@example.test', 'Employer B'),
    ('20000000-0000-0000-0000-000000000003'::uuid, 'worker-a@example.test', 'Worker A'),
    ('20000000-0000-0000-0000-000000000004'::uuid, 'worker-b@example.test', 'Worker B')
) as users(user_id, email, display_name);

update public.profiles
set onboarding_completed_at = now()
where id <> '20000000-0000-0000-0000-000000000002';

insert into public.worker_preferences (profile_id, latitude, longitude)
values
  ('20000000-0000-0000-0000-000000000003', 14.599500, 120.984200),
  ('20000000-0000-0000-0000-000000000004', 14.600000, 120.990000);

insert into public.gigs (
  id, employer_id, title, description, category, work_mode, public_area,
  public_latitude, public_longitude, budget_amount, status, published_at
)
values
  (
    '21000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'Published errand', 'A sufficiently descriptive published gig.', 'errands',
    'onsite', 'Manila', 14.60, 120.98, 500, 'published', now()
  ),
  (
    '21000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    'Private draft gig', 'A sufficiently descriptive private draft.', 'admin',
    'remote', null, null, null, 750, 'draft', null
  );

insert into public.gig_private_locations (
  gig_id, address_text, latitude, longitude
)
values (
  '21000000-0000-0000-0000-000000000001', 'Private Manila address', 14.599500, 120.984200
);

insert into public.applications (
  id, gig_id, worker_id, message, client_request_id
)
values (
  '22000000-0000-0000-0000-000000000001',
  '21000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000003',
  'I can complete this errand.',
  '22000000-0000-0000-0000-000000000011'
);

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select extensions.throws_ok(
  'select * from public.profiles',
  '42501',
  null,
  'anonymous clients cannot read profiles'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);

select extensions.is(
  (
    select count(*)::integer
    from public.profiles
    where id::text like '20000000-%'
  ),
  4,
  'authenticated users can read public profile cards'
);

select extensions.is(
  (select count(*)::integer from public.worker_preferences),
  1,
  'workers read only their own private preferences'
);

select extensions.is(
  (
    select count(*)::integer
    from public.gigs
    where id in (
      '21000000-0000-0000-0000-000000000001',
      '21000000-0000-0000-0000-000000000002'
    )
  ),
  1,
  'workers see published gigs but not unrelated drafts'
);

select extensions.is(
  (select count(*)::integer from public.applications),
  1,
  'workers see their own applications'
);

select extensions.is(
  (select count(*)::integer from public.gig_private_locations),
  0,
  'an applicant cannot see an exact gig location before assignment confirmation'
);

select extensions.throws_ok(
  $$
    insert into public.applications (gig_id, worker_id, client_request_id)
    values (
      '21000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000003',
      '22000000-0000-0000-0000-000000000012'
    )
  $$,
  '42501',
  null,
  'direct application writes remain fail-closed until the workflow RPC exists'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select extensions.is(
  (select count(*)::integer from public.applications),
  1,
  'the owning employer sees applications for their gig'
);

select extensions.is(
  (select count(*)::integer from public.gig_private_locations),
  1,
  'the owning employer sees the private gig location'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

select extensions.is(
  (select count(*)::integer from public.applications),
  0,
  'another employer cannot inspect applications for a gig they do not own'
);

select extensions.is(
  (select count(*)::integer from public.gig_private_locations),
  0,
  'another employer cannot inspect a private location'
);

select extensions.ok(
  not has_column_privilege(
    'authenticated',
    'public.profiles',
    'onboarding_completed_at',
    'UPDATE'
  ),
  'clients cannot directly mark onboarding complete'
);

select extensions.throws_ok(
  $$
    update public.profiles
    set onboarding_completed_at = now()
    where id = '20000000-0000-0000-0000-000000000002'
  $$,
  '42501',
  null,
  'onboarding completion remains server-controlled'
);

select extensions.lives_ok(
  $$
    update public.profiles
    set display_name = 'Unauthorized profile update'
    where id = '20000000-0000-0000-0000-000000000001'
  $$,
  'cross-user profile updates affect no rows'
);

select extensions.is(
  (
    select display_name
    from public.profiles
    where id = '20000000-0000-0000-0000-000000000001'
  ),
  'Employer A',
  'cross-user profile updates are rejected by RLS'
);

select extensions.lives_ok(
  $$
    update public.worker_preferences
    set location_label = 'Unauthorized preference update'
    where profile_id = '20000000-0000-0000-0000-000000000003'
  $$,
  'cross-user worker-preference updates affect no rows'
);

reset role;
select extensions.is(
  (
    select count(*)::integer
    from public.worker_preferences
    where location_label = 'Unauthorized preference update'
  ),
  0,
  'cross-user worker-preference updates are rejected by RLS'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

select extensions.lives_ok(
  $$
    update public.gigs
    set title = 'Unauthorized gig update'
    where id = '21000000-0000-0000-0000-000000000001'
  $$,
  'cross-user gig updates affect no rows'
);

select extensions.is(
  (
    select count(*)::integer
    from public.gigs
    where title = 'Unauthorized gig update'
  ),
  0,
  'cross-user gig updates are rejected by RLS'
);

select extensions.lives_ok(
  $$
    update public.gig_private_locations
    set address_text = 'Unauthorized private location update'
    where gig_id = '21000000-0000-0000-0000-000000000001'
  $$,
  'cross-user private-location updates affect no rows'
);

reset role;
select extensions.is(
  (
    select count(*)::integer
    from public.gig_private_locations
    where address_text = 'Unauthorized private location update'
  ),
  0,
  'cross-user private-location updates are rejected by RLS'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

select extensions.throws_ok(
  $$
    insert into public.gigs (
      employer_id, title, description, category, work_mode, budget_amount
    ) values (
      '20000000-0000-0000-0000-000000000002',
      'Unonboarded draft',
      'An unonboarded employer must not be able to create this draft.',
      'admin',
      'remote',
      900
    )
  $$,
  '42501',
  null,
  'unonboarded employers cannot create draft gigs'
);

select extensions.lives_ok(
  $$
    update public.profiles
    set preferred_mode = 'worker'
    where id = '20000000-0000-0000-0000-000000000002'
  $$,
  'a user may switch their own UI preference'
);

select extensions.is(
  (select count(*)::integer from public.applications),
  0,
  'preferred UI mode does not grant marketplace authority'
);

select * from extensions.finish();
rollback;
