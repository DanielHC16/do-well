begin;

create extension if not exists pgtap;

select plan(33);

select has_table('public', 'account_roles', 'account roles table exists');
select has_table('public', 'admin_actions', 'admin actions audit table exists');
select has_column('public', 'reports', 'reviewed_by', 'reports identify the reviewing admin');
select has_column('public', 'reports', 'reviewed_at', 'reports record review time');
select has_function('public', 'get_my_capabilities', array[]::name[], 'users can retrieve server-owned capabilities');
select has_function('public', 'set_preferred_mode', array['text']::name[], 'users can persist a workspace preference');
select has_function('public', 'complete_onboarding', array['text', 'text', 'text']::name[], 'onboarding accepts an initial workspace preference');
select has_function('public', 'submit_report', array['text', 'text', 'uuid', 'uuid', 'uuid', 'uuid']::name[], 'users can submit reports');
select has_function('public', 'list_admin_reports', array['text', 'integer', 'integer']::name[], 'admins can list reports');
select has_function('public', 'get_admin_report', array['uuid']::name[], 'admins can retrieve report detail');
select has_function('public', 'resolve_report', array['uuid', 'text', 'text']::name[], 'admins can resolve reports');

insert into auth.users (id, email, raw_user_meta_data)
values
  ('f0000000-0000-4000-8000-000000000001', 'admin@example.com', '{"display_name":"Admin User"}'::jsonb),
  ('f0000000-0000-4000-8000-000000000002', 'reporter@example.com', '{"display_name":"Reporter User","preferred_mode":"employer"}'::jsonb),
  ('f0000000-0000-4000-8000-000000000003', 'subject@example.com', '{"display_name":"Subject User","preferred_mode":"invalid"}'::jsonb),
  ('f0000000-0000-4000-8000-000000000004', 'other@example.com', '{"display_name":"Other User"}'::jsonb)
on conflict (id) do nothing;

select is(
  (select preferred_mode from public.profiles where id = 'f0000000-0000-4000-8000-000000000002'),
  'employer',
  'profile provisioning records a valid signup workspace preference'
);
select is(
  (select preferred_mode from public.profiles where id = 'f0000000-0000-4000-8000-000000000003'),
  'worker',
  'profile provisioning safely defaults an invalid signup preference'
);

update public.profiles
set home_area = 'Metro Manila', onboarding_completed_at = now()
where id in (
  'f0000000-0000-4000-8000-000000000001',
  'f0000000-0000-4000-8000-000000000002',
  'f0000000-0000-4000-8000-000000000004'
);

insert into public.account_roles (user_id, role, granted_by)
values ('f0000000-0000-4000-8000-000000000001', 'admin', 'f0000000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f0000000-0000-4000-8000-000000000003', true);
select is(
  (public.complete_onboarding('Subject User', 'Taguig', 'employer')).preferred_mode,
  'employer',
  'Google-first onboarding persists the selected initial workspace'
);

select set_config('request.jwt.claim.sub', 'f0000000-0000-4000-8000-000000000002', true);

select results_eq(
  $$ select role, preferred_mode, is_admin from public.get_my_capabilities() $$,
  $$ values ('user'::text, 'employer'::text, false) $$,
  'regular users receive user capability and workspace preference'
);
select is((public.set_preferred_mode('worker')).preferred_mode, 'worker', 'user can persist worker workspace preference');
select throws_ok(
  $$ select public.set_preferred_mode('admin') $$,
  'P0061',
  'Preferred workspace must be worker or employer.',
  'admin cannot be selected as a workspace preference'
);
select throws_ok(
  $$ insert into public.account_roles (user_id, role) values ('f0000000-0000-4000-8000-000000000002', 'admin') $$,
  '42501',
  null,
  'clients cannot grant administrator capability'
);

select is(
  (public.submit_report(
    'unsafe',
    'The user requested unsafe work and ignored clear safety boundaries.',
    'f0000000-0000-4000-8000-000000000003',
    null,
    null,
    'f1000000-0000-4000-8000-000000000001'
  )).status,
  'open',
  'an onboarded user can submit a report'
);
select is(
  (public.submit_report(
    'unsafe',
    'The user requested unsafe work and ignored clear safety boundaries.',
    'f0000000-0000-4000-8000-000000000003',
    null,
    null,
    'f1000000-0000-4000-8000-000000000001'
  )).id,
  (select id from public.reports where reporter_id = 'f0000000-0000-4000-8000-000000000002' and client_request_id = 'f1000000-0000-4000-8000-000000000001'),
  'submitting the same report request is idempotent'
);
select throws_ok(
  $$ select public.submit_report(
    'scam',
    'This changed payload must not reuse an existing report request identifier.',
    'f0000000-0000-4000-8000-000000000003',
    null,
    null,
    'f1000000-0000-4000-8000-000000000001'
  ) $$,
  'P0063',
  'Report request identifier was already used for different report data.',
  'report idempotency keys cannot be reused for another payload'
);
select throws_ok(
  $$ select * from public.list_admin_reports(null, 50, 0) $$,
  '42501',
  'Administrator capability required.',
  'regular users cannot list admin report queue'
);
select is((select count(*)::integer from public.reports), 1, 'reporter can read their own report through RLS');

select set_config('request.jwt.claim.sub', 'f0000000-0000-4000-8000-000000000004', true);
select is((select count(*)::integer from public.reports), 0, 'unrelated user cannot read another report');

select set_config('request.jwt.claim.sub', 'f0000000-0000-4000-8000-000000000001', true);
select results_eq(
  $$ select role, preferred_mode, is_admin from public.get_my_capabilities() $$,
  $$ values ('admin'::text, 'worker'::text, true) $$,
  'provisioned administrator receives server-authoritative capability'
);
select is((select count(*)::integer from public.list_admin_reports('open', 50, 0)), 1, 'administrator can list open reports');
select is(
  (public.get_admin_report(
    (select id from public.reports where client_request_id = 'f1000000-0000-4000-8000-000000000001')
  )).category,
  'unsafe',
  'administrator can retrieve one report detail'
);
select is((select (public.get_admin_overview() ->> 'open_reports')::integer), 1, 'overview returns live open report count');
select is(
  (public.resolve_report(
    (select id from public.reports where client_request_id = 'f1000000-0000-4000-8000-000000000001'),
    'resolved',
    'Reviewed the concern and documented the completed moderation decision.'
  )).status,
  'resolved',
  'administrator can resolve a report with a review note'
);
select results_eq(
  $$ select reviewed_by, reviewed_at is not null from public.reports where client_request_id = 'f1000000-0000-4000-8000-000000000001' $$,
  $$ values ('f0000000-0000-4000-8000-000000000001'::uuid, true) $$,
  'resolution records reviewing administrator and time'
);
select is(
  (select count(*)::integer from public.admin_actions where admin_id = 'f0000000-0000-4000-8000-000000000001' and action_type = 'report_resolved'),
  1,
  'resolution writes one immutable admin audit event'
);
select throws_ok(
  $$ update public.admin_actions set action_type = 'tampered' $$,
  '42501',
  null,
  'clients cannot mutate administrator audit history'
);
select throws_ok(
  $$ select public.resolve_report(
    (select id from public.reports where client_request_id = 'f1000000-0000-4000-8000-000000000001'),
    'reviewing',
    'Invalid terminal decision should never be accepted by the server boundary.'
  ) $$,
  'P0066',
  'Report decision must be resolved or dismissed.',
  'resolution accepts only terminal decisions'
);

select * from finish();
rollback;
