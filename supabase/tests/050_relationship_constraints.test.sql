begin;

create extension if not exists pgtap with schema extensions;
select extensions.no_plan();

select extensions.throws_ok(
  $$
    insert into public.assignments (
      id, gig_id, application_id, employer_id, worker_id,
      agreed_title, agreed_description, agreed_amount, status,
      employer_confirmed_at, client_request_id
    )
    values (
      'e0000000-0000-4000-8000-000000000099',
      'c0000000-0000-4000-8000-000000000001',
      'd0000000-0000-4000-8000-000000000001',
      'a0000000-0000-4000-8000-000000000001',
      'b0000000-0000-4000-8000-000000000001',
      'Mismatched worker assignment',
      'This assignment intentionally names the wrong application worker.',
      750, 'proposed', now(),
      'e1000000-0000-4000-8000-000000000099'
    )
  $$,
  '23503',
  null,
  'an assignment must preserve the selected application gig and worker'
);

select extensions.throws_ok(
  $$
    insert into public.submissions (
      assignment_id, submitted_by, version, client_request_id
    )
    values (
      'e0000000-0000-4000-8000-000000000001',
      'b0000000-0000-4000-8000-000000000002',
      1,
      'e3000000-0000-4000-8000-000000000099'
    )
  $$,
  '23503',
  null,
  'only the assignment worker can own a submission row'
);

select extensions.throws_ok(
  $$
    insert into public.applications (
      gig_id, worker_id, client_request_id
    )
    values (
      'c0000000-0000-4000-8000-000000000001',
      'b0000000-0000-4000-8000-000000000002',
      'd1000000-0000-4000-8000-000000000099'
    )
  $$,
  '23505',
  null,
  'a worker cannot hold two live applications for one gig'
);

select extensions.throws_ok(
  $$
    insert into public.worker_preferences (profile_id, latitude)
    values ('a0000000-0000-4000-8000-000000000001', 14.599500)
  $$,
  '23514',
  null,
  'worker coordinates must be both present or both absent'
);

select extensions.throws_ok(
  $$
    insert into public.gigs (
      employer_id, title, description, category, work_mode, budget_amount
    )
    values (
      'a0000000-0000-4000-8000-000000000001',
      'Missing onsite coordinates',
      'This onsite gig intentionally omits its public location.',
      'errands', 'onsite', 500
    )
  $$,
  '23514',
  null,
  'onsite gigs require a public area and coarse coordinates'
);

select * from extensions.finish();
rollback;
