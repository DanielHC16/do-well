-- The normal db:test script lists the five functional files explicitly so this
-- workload runs only on demand:
--   npm run db:test:performance
--
-- The transaction creates 10,000 gigs, 50,000 applications, and representative
-- assignment/activity/AI rows. Every row is rolled back after the five real
-- EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) assertions finish.

begin;

create extension if not exists pgtap with schema extensions;
select extensions.no_plan();

create function pg_temp.explain_json(query_text text)
returns jsonb
language plpgsql
as $$
declare
  query_plan jsonb;
begin
  execute 'explain (analyze, buffers, format json) ' || query_text into query_plan;
  return query_plan;
end;
$$;

create function pg_temp.plan_uses_index(query_plan jsonb, expected_index text)
returns boolean
language sql
immutable
strict
as $$
  select exists (
    select 1
    from jsonb_path_query(query_plan, '$.** ? (@."Index Name" != null)') as node
    where node ->> 'Index Name' = expected_index
  );
$$;

create function pg_temp.plan_has_sequential_scan(query_plan jsonb, relation_name text)
returns boolean
language sql
immutable
strict
as $$
  select jsonb_path_exists(
    query_plan,
    '$.** ? (@."Node Type" == "Seq Scan" && @."Relation Name" == $relation)',
    jsonb_build_object('relation', relation_name)
  );
$$;

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
    ('b0000000-0000-4000-8000-000000000003'::uuid, 'perf-worker-3@do-well.test', 'Performance Worker 3'),
    ('b0000000-0000-4000-8000-000000000004'::uuid, 'perf-worker-4@do-well.test', 'Performance Worker 4'),
    ('b0000000-0000-4000-8000-000000000005'::uuid, 'perf-worker-5@do-well.test', 'Performance Worker 5')
) as fixture_users(user_id, email, display_name)
on conflict (id) do nothing;

create temporary table perf_workers (
  position integer primary key,
  id uuid not null unique
) on commit drop;

insert into perf_workers (position, id)
values
  (1, 'b0000000-0000-4000-8000-000000000001'),
  (2, 'b0000000-0000-4000-8000-000000000002'),
  (3, 'b0000000-0000-4000-8000-000000000003'),
  (4, 'b0000000-0000-4000-8000-000000000004'),
  (5, 'b0000000-0000-4000-8000-000000000005');

create temporary table perf_gigs (
  sequence_number integer primary key,
  id uuid not null unique
) on commit drop;

insert into perf_gigs (sequence_number, id)
select sequence_number, extensions.gen_random_uuid()
from generate_series(1, 10000) as sequence_number;

insert into public.gigs (
  id, employer_id, title, description, category, work_mode,
  public_area, public_latitude, public_longitude, budget_amount,
  status, published_at
)
select
  fixture.id,
  'a0000000-0000-4000-8000-000000000001',
  'Performance gig ' || fixture.sequence_number,
  'Synthetic performance fixture used only inside a rolled-back local transaction.',
  (array['errands', 'delivery', 'cleaning', 'events', 'admin', 'tutoring', 'digital', 'other'])[
    1 + (fixture.sequence_number % 8)
  ],
  (array['onsite', 'remote', 'hybrid'])[1 + (fixture.sequence_number % 3)],
  case when fixture.sequence_number % 3 = 1 then null else 'Performance Area' end,
  case when fixture.sequence_number % 3 = 1 then null else 14.60 end,
  case when fixture.sequence_number % 3 = 1 then null else 120.98 end,
  500 + (fixture.sequence_number % 1000),
  case when fixture.sequence_number <= 5000 then 'assigned' else 'published' end,
  clock_timestamp() - fixture.sequence_number * interval '1 second'
from perf_gigs as fixture;

insert into public.applications (
  id, gig_id, worker_id, message, status, client_request_id, decided_at, created_at
)
select
  extensions.gen_random_uuid(),
  gig.id,
  worker.id,
  'Synthetic performance application.',
  case
    when gig.sequence_number <= 5000
      and worker.position = 1 + (gig.sequence_number % 5)
    then 'accepted'
    else 'rejected'
  end,
  extensions.gen_random_uuid(),
  now(),
  clock_timestamp() - gig.sequence_number * interval '1 second'
from perf_gigs as gig
cross join perf_workers as worker;

insert into public.assignments (
  id, gig_id, application_id, employer_id, worker_id,
  agreed_title, agreed_description, agreed_amount, status,
  employer_confirmed_at, worker_confirmed_at, started_at,
  client_request_id, created_at
)
select
  extensions.gen_random_uuid(),
  application.gig_id,
  application.id,
  'a0000000-0000-4000-8000-000000000001',
  application.worker_id,
  gig.title,
  gig.description,
  gig.budget_amount,
  'active',
  now(), now(), now(),
  extensions.gen_random_uuid(),
  application.created_at
from public.applications as application
join public.gigs as gig on gig.id = application.gig_id
where application.status = 'accepted'
  and application.gig_id in (select id from perf_gigs);

insert into public.activity_events (
  recipient_id, event_type, payload, dedupe_key, read_at, created_at
)
select
  worker.id,
  'performance_event',
  '{}'::jsonb,
  'performance-event-' || event_number,
  case when event_number % 3 = 0 then now() else null end,
  clock_timestamp() - event_number * interval '1 second'
from generate_series(1, 10000) as event_number
join perf_workers as worker
  on worker.position = case
    when event_number % 100 = 0 then 1
    else 2 + (event_number % 4)
  end;

insert into public.ai_request_log (
  user_id, request_id, provider, status, input_chars, output_chars,
  duration_ms, created_at
)
select
  worker.id,
  extensions.gen_random_uuid(),
  'performance-provider',
  'succeeded',
  100,
  200,
  50,
  clock_timestamp() - request_number * interval '1 second'
from generate_series(1, 10000) as request_number
join perf_workers as worker on worker.position = 1 + (request_number % 5);

analyze public.gigs;
analyze public.applications;
analyze public.assignments;
analyze public.activity_events;
analyze public.ai_request_log;

select extensions.ok(
  (
    pg_temp.plan_uses_index(query_plan, 'gigs_discovery_mode_category_idx')
    or pg_temp.plan_uses_index(query_plan, 'gigs_published_created_idx')
  )
    and not pg_temp.plan_has_sequential_scan(query_plan, 'gigs'),
  'published discovery uses a partial recency index without a gig scan'
)
from (
  select pg_temp.explain_json(
    $$
      select id, title, published_at
      from public.gigs
      where status = 'published'
        and work_mode = 'remote'
        and category = 'delivery'
      order by published_at desc
      limit 20
    $$
  ) as query_plan
) as explained;

select extensions.ok(
  pg_temp.plan_uses_index(query_plan, 'applications_gig_status_created_idx')
    and not pg_temp.plan_has_sequential_scan(query_plan, 'applications'),
  'employer application review uses the gig/status/recency index'
)
from (
  select pg_temp.explain_json(
    format(
      'select id, worker_id, created_at from public.applications '
      || 'where gig_id = %L::uuid and status = ''rejected'' '
      || 'order by created_at desc limit 20',
      (select id from perf_gigs where sequence_number = 1)
    )
  ) as query_plan
) as explained;

select extensions.ok(
  pg_temp.plan_uses_index(query_plan, 'assignments_worker_status_updated_idx')
    and not pg_temp.plan_has_sequential_scan(query_plan, 'assignments'),
  'worker active assignments use the worker/status/recency index'
)
from (
  select pg_temp.explain_json(
    $$
      select id, gig_id, updated_at
      from public.assignments
      where worker_id = 'b0000000-0000-4000-8000-000000000001'::uuid
        and status = 'active'
      order by updated_at desc
      limit 20
    $$
  ) as query_plan
) as explained;

select extensions.ok(
  pg_temp.plan_uses_index(query_plan, 'activity_events_recipient_unread_created_idx')
    and not pg_temp.plan_has_sequential_scan(query_plan, 'activity_events'),
  'unread activity uses the recipient/read/recency index'
)
from (
  select pg_temp.explain_json(
    $$
      select id, event_type, created_at
      from public.activity_events
      where recipient_id = 'b0000000-0000-4000-8000-000000000001'::uuid
        and read_at is null
      order by created_at desc
      limit 50
    $$
  ) as query_plan
) as explained;

select extensions.ok(
  pg_temp.plan_uses_index(query_plan, 'ai_request_log_user_created_idx')
    and not pg_temp.plan_has_sequential_scan(query_plan, 'ai_request_log'),
  'AI quota-window counting uses the user/recency index'
)
from (
  select pg_temp.explain_json(
    $$
      select count(*)
      from public.ai_request_log
      where user_id = 'b0000000-0000-4000-8000-000000000001'::uuid
        and created_at >= now() - interval '1 hour'
    $$
  ) as query_plan
) as explained;

select * from extensions.finish();
rollback;
