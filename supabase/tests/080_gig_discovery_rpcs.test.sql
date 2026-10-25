begin;

create extension if not exists pgtap;

select plan(12);

-- 1. Function existence
select has_function('public', 'calculate_distance_km', array['numeric', 'numeric', 'numeric', 'numeric'], 'calculate_distance_km exists');
select has_function('public', 'discover_gigs', array['numeric', 'numeric', 'integer', 'text', 'text', 'text', 'integer', 'integer'], 'discover_gigs exists');

-- 2. Distance calculation unit tests
select is(
  public.calculate_distance_km(null, 121.0, 14.5, 121.0),
  null,
  'calculate_distance_km returns null when lat1 is null'
);

select is(
  public.calculate_distance_km(14.5547, 121.0244, 14.5547, 121.0244),
  0.0,
  'calculate_distance_km returns 0.0 for identical coordinates'
);

-- Distance between Ayala Ave Makati (14.5547, 121.0244) and Bonifacio High Street BGC (14.5507, 121.0514) is approx 2.9-3.0 km
select ok(
  public.calculate_distance_km(14.5547, 121.0244, 14.5507, 121.0514) between 2.5 and 3.5,
  'calculate_distance_km accurately computes Makati to BGC distance (~3 km)'
);

-- 3. Set up test fixtures
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '80000000-0000-0000-0000-000000000001',
    'authenticated', 'authenticated', 'employer-m06@example.test', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Discovery Employer"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '80000000-0000-0000-0000-000000000002',
    'authenticated', 'authenticated', 'worker-m06@example.test', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Discovery Worker"}'::jsonb,
    now(), now(), '', '', '', ''
  )
on conflict (id) do nothing;

insert into public.profiles (id, display_name, home_area, onboarding_completed_at)
values
  ('80000000-0000-0000-0000-000000000001', 'Discovery Employer', 'Makati', now()),
  ('80000000-0000-0000-0000-000000000002', 'Discovery Worker', 'Makati', now())
on conflict (id) do nothing;

-- Insert Published Onsite Near Gig (Makati, 14.5547, 121.0244)
insert into public.gigs (
  id, employer_id, title, description, category, work_mode,
  public_area, public_latitude, public_longitude, budget_amount, currency, status, published_at
) values (
  '81000000-0000-0000-0000-000000000001',
  '80000000-0000-0000-0000-000000000001',
  'Makati House Deep Cleaning',
  'Deep clean master bedroom, kitchen counters, and mop living room tile floor.',
  'cleaning',
  'onsite',
  'Poblacion, Makati',
  14.5547,
  121.0244,
  1200,
  'PHP',
  'published',
  now()
);

-- Insert Published Remote Gig
insert into public.gigs (
  id, employer_id, title, description, category, work_mode,
  public_area, public_latitude, public_longitude, budget_amount, currency, status, published_at
) values (
  '81000000-0000-0000-0000-000000000002',
  '80000000-0000-0000-0000-000000000001',
  'Canva Graphics Design',
  'Design 5 social media cards for community announcement board.',
  'digital',
  'remote',
  null,
  null,
  null,
  800,
  'PHP',
  'published',
  now()
);

-- Insert Published Far Gig (Cebu City: 10.3157, 123.8854)
insert into public.gigs (
  id, employer_id, title, description, category, work_mode,
  public_area, public_latitude, public_longitude, budget_amount, currency, status, published_at
) values (
  '81000000-0000-0000-0000-000000000003',
  '80000000-0000-0000-0000-000000000001',
  'Cebu City Handyman Task',
  'Fix wooden door frame in downtown Cebu apartment building.',
  'errands',
  'onsite',
  'Cebu City',
  10.3157,
  123.8854,
  1500,
  'PHP',
  'published',
  now()
);

-- Insert Draft Gig (Should NOT appear in discovery)
insert into public.gigs (
  id, employer_id, title, description, category, work_mode,
  public_area, public_latitude, public_longitude, budget_amount, currency, status
) values (
  '81000000-0000-0000-0000-000000000004',
  '80000000-0000-0000-0000-000000000001',
  'Unpublished Draft Gig',
  'This is a private draft gig notice description for testing.',
  'errands',
  'remote',
  null,
  null,
  null,
  500,
  'PHP',
  'draft'
);

-- Insert Closed Gig (Should NOT appear in discovery)
insert into public.gigs (
  id, employer_id, title, description, category, work_mode,
  public_area, public_latitude, public_longitude, budget_amount, currency, status, published_at, closed_at
) values (
  '81000000-0000-0000-0000-000000000005',
  '80000000-0000-0000-0000-000000000001',
  'Closed Notice Gig',
  'This is a closed gig notice description that was already completed.',
  'errands',
  'remote',
  null,
  null,
  null,
  500,
  'PHP',
  'closed',
  now() - interval '10 days',
  now() - interval '5 days'
);

-- 4. Test discover_gigs omits draft and closed gigs
select is(
  (select count(*)::integer from public.discover_gigs() where id in (
    '81000000-0000-0000-0000-000000000001',
    '81000000-0000-0000-0000-000000000002',
    '81000000-0000-0000-0000-000000000003',
    '81000000-0000-0000-0000-000000000004',
    '81000000-0000-0000-0000-000000000005'
  )),
  3,
  'discover_gigs only returns the 3 published gigs, omitting draft and closed'
);

-- 5. Test remote filter
select is(
  (select count(*)::integer from public.discover_gigs(p_work_mode => 'remote') where id in (
    '81000000-0000-0000-0000-000000000001',
    '81000000-0000-0000-0000-000000000002',
    '81000000-0000-0000-0000-000000000003'
  )),
  1,
  'discover_gigs with work_mode=remote returns exactly 1 gig'
);

-- 6. Test category filter
select is(
  (select count(*)::integer from public.discover_gigs(p_category => 'cleaning') where id in (
    '81000000-0000-0000-0000-000000000001',
    '81000000-0000-0000-0000-000000000002',
    '81000000-0000-0000-0000-000000000003'
  )),
  1,
  'discover_gigs with category=cleaning returns exactly 1 gig'
);

-- 7. Test distance cutoff (from Makati, max 10 km should include near Makati gig and Remote gig, but exclude Cebu gig)
select is(
  (select count(*)::integer from public.discover_gigs(
    p_worker_lat => 14.5547,
    p_worker_lng => 121.0244,
    p_max_distance_km => 10
  ) where id in (
    '81000000-0000-0000-0000-000000000001',
    '81000000-0000-0000-0000-000000000002',
    '81000000-0000-0000-0000-000000000003'
  )),
  2,
  'discover_gigs with 10km cutoff from Makati returns nearby gig + remote gig, excludes Cebu gig'
);

-- 8. Test text search
select is(
  (select count(*)::integer from public.discover_gigs(p_search_query => 'Canva') where id in (
    '81000000-0000-0000-0000-000000000001',
    '81000000-0000-0000-0000-000000000002',
    '81000000-0000-0000-0000-000000000003'
  )),
  1,
  'discover_gigs with search_query=Canva returns 1 matching gig'
);

-- 9. Test explainable reasons output
select ok(
  (
    select 'Within 5 km of you' = any(reasons)
    from public.discover_gigs(
      p_worker_lat => 14.5547,
      p_worker_lng => 121.0244
    )
    where id = '81000000-0000-0000-0000-000000000001'
  ),
  'discover_gigs attaches Within 5 km explanation reason to close gig'
);

select ok(
  (
    select 'Remote - work from anywhere' = any(reasons)
    from public.discover_gigs()
    where id = '81000000-0000-0000-0000-000000000002'
  ),
  'discover_gigs attaches Remote explanation reason to remote gig'
);

rollback;
