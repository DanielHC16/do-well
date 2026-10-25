begin;

create extension if not exists pgtap with schema extensions;
select extensions.no_plan();

-- 1. Existence and signature
select extensions.has_function(
  'public',
  'publish_gig',
  array['uuid'],
  'publish_gig exists with gig_id argument'
);

select extensions.has_function(
  'public',
  'close_gig',
  array['uuid'],
  'close_gig exists with gig_id argument'
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
      and p.proname in ('publish_gig', 'close_gig')
  ),
  'gig lifecycle RPCs are hardened security-definer functions with empty search path'
);

-- 3. Privilege enforcement
select extensions.ok(
  not has_function_privilege('public', 'public.publish_gig(uuid)', 'execute')
  and not has_function_privilege('anon', 'public.publish_gig(uuid)', 'execute')
  and has_function_privilege('authenticated', 'public.publish_gig(uuid)', 'execute')
  and not has_function_privilege('public', 'public.close_gig(uuid)', 'execute')
  and not has_function_privilege('anon', 'public.close_gig(uuid)', 'execute')
  and has_function_privilege('authenticated', 'public.close_gig(uuid)', 'execute'),
  'only authenticated role can execute gig lifecycle RPCs'
);

-- 4. Test fixtures: 2 completed employers
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '70000000-0000-0000-0000-000000000001',
    'authenticated', 'authenticated', 'employer-m05-a@example.test', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Employer A"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '70000000-0000-0000-0000-000000000002',
    'authenticated', 'authenticated', 'employer-m05-b@example.test', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Employer B"}'::jsonb,
    now(), now(), '', '', '', ''
  )
on conflict (id) do nothing;

insert into public.profiles (id, display_name, home_area, onboarding_completed_at)
values
  ('70000000-0000-0000-0000-000000000001', 'Employer A', 'Makati', now()),
  ('70000000-0000-0000-0000-000000000002', 'Employer B', 'Pasig', now())
on conflict (id) do update set
  onboarding_completed_at = now();

-- Pre-seed test gig with known UUID before impersonation
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
  status
) values (
  '71000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001',
  'Neighborhood Garden Care',
  'Need assistance pruning trees and clearing backyard garden debris.',
  'errands',
  'onsite',
  'Poblacion, Makati',
  14.56,
  121.03,
  750.00,
  'draft'
)
on conflict (id) do nothing;

-- 5. Anonymous caller cannot invoke RPCs
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select extensions.throws_ok(
  'select public.publish_gig(''71000000-0000-0000-0000-000000000001''::uuid)',
  '42501',
  null,
  'anonymous callers cannot publish gigs'
);

-- 6. Employer A can insert a draft gig under column-level grants
reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"70000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select extensions.lives_ok(
  'insert into public.gigs (
    employer_id, title, description, category, work_mode, public_area,
    public_latitude, public_longitude, budget_amount
  ) values (
    ''70000000-0000-0000-0000-000000000001'',
    ''Painting Fence'',
    ''Need help painting perimeter wooden fence with two coats.'',
    ''errands'',
    ''onsite'',
    ''Poblacion, Makati'',
    14.56,
    121.03,
    500.00
  )',
  'authenticated employer can insert a draft gig using granted columns'
);

-- 7. Employer B cannot publish Employer A draft gig
select set_config(
  'request.jwt.claims',
  '{"sub":"70000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

select extensions.throws_ok(
  'select public.publish_gig(''71000000-0000-0000-0000-000000000001''::uuid)',
  '42501',
  null,
  'non-owner cannot publish another user draft gig'
);

-- 8. Employer A publishes their own draft gig
select set_config(
  'request.jwt.claims',
  '{"sub":"70000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select extensions.lives_ok(
  'select public.publish_gig(''71000000-0000-0000-0000-000000000001''::uuid)',
  'owning employer can publish their own draft gig'
);

select extensions.is(
  (
    select status
    from public.gigs
    where id = '71000000-0000-0000-0000-000000000001'
  ),
  'published',
  'published gig status is updated to published'
);

select extensions.ok(
  (
    select published_at is not null
    from public.gigs
    where id = '71000000-0000-0000-0000-000000000001'
  ),
  'published_at timestamp is set upon publishing'
);

-- 9. Re-publishing a published gig fails
select extensions.throws_ok(
  'select public.publish_gig(''71000000-0000-0000-0000-000000000001''::uuid)',
  '22000',
  null,
  'cannot publish a gig that is not in draft status'
);

-- 10. Audit event was emitted
select extensions.is(
  (
    select count(*)::integer
    from public.activity_events
    where gig_id = '71000000-0000-0000-0000-000000000001'
      and event_type = 'gig_published'
      and recipient_id = '70000000-0000-0000-0000-000000000001'
  ),
  1,
  'publish_gig records a gig_published activity event'
);

-- 11. Non-owner cannot close Employer A gig
select set_config(
  'request.jwt.claims',
  '{"sub":"70000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

select extensions.throws_ok(
  'select public.close_gig(''71000000-0000-0000-0000-000000000001''::uuid)',
  '42501',
  null,
  'non-owner cannot close another user gig'
);

-- 12. Employer A closes the gig
select set_config(
  'request.jwt.claims',
  '{"sub":"70000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select extensions.lives_ok(
  'select public.close_gig(''71000000-0000-0000-0000-000000000001''::uuid)',
  'owning employer can close their published gig'
);

select extensions.is(
  (
    select status
    from public.gigs
    where id = '71000000-0000-0000-0000-000000000001'
  ),
  'closed',
  'closed gig status is updated to closed'
);

select extensions.ok(
  (
    select closed_at is not null
    from public.gigs
    where id = '71000000-0000-0000-0000-000000000001'
  ),
  'closed_at timestamp is set upon closing'
);

select extensions.is(
  (
    select count(*)::integer
    from public.activity_events
    where gig_id = '71000000-0000-0000-0000-000000000001'
      and event_type = 'gig_closed'
  ),
  1,
  'close_gig records a gig_closed activity event'
);

select * from extensions.finish();
rollback;
