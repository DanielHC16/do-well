begin;

create extension if not exists pgtap with schema extensions;
select extensions.no_plan();

select extensions.results_eq(
  $$
    select public, file_size_limit, allowed_mime_types
    from storage.buckets
    where id = 'submission-evidence'
  $$,
  $$ values (
    false,
    5242880::bigint,
    array['image/jpeg', 'image/png', 'image/webp']::text[]
  ) $$,
  'submission evidence bucket is private and bounded'
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
    ('30000000-0000-0000-0000-000000000001'::uuid, 'storage-employer@example.test', 'Storage Employer'),
    ('30000000-0000-0000-0000-000000000002'::uuid, 'storage-worker@example.test', 'Storage Worker'),
    ('30000000-0000-0000-0000-000000000003'::uuid, 'storage-stranger@example.test', 'Storage Stranger')
) as users(user_id, email, display_name);

insert into public.gigs (
  id, employer_id, title, description, category, work_mode,
  budget_amount, status, published_at
)
values (
  '31000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  'Storage test gig', 'A sufficiently descriptive storage test gig.',
  'digital', 'remote', 900, 'assigned', now()
);

insert into public.applications (
  id, gig_id, worker_id, status, client_request_id, decided_at
)
values (
  '32000000-0000-0000-0000-000000000001',
  '31000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000002',
  'accepted',
  '32000000-0000-0000-0000-000000000011',
  now()
);

insert into public.assignments (
  id, gig_id, application_id, employer_id, worker_id,
  agreed_title, agreed_description, agreed_amount, status,
  employer_confirmed_at, worker_confirmed_at, started_at, client_request_id
)
values (
  '33000000-0000-0000-0000-000000000001',
  '31000000-0000-0000-0000-000000000001',
  '32000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000002',
  'Storage test gig', 'A sufficiently descriptive storage test gig.', 900,
  'active', now(), now(), now(),
  '33000000-0000-0000-0000-000000000011'
);

insert into public.submissions (
  id, assignment_id, submitted_by, version, status, client_request_id
)
values (
  '34000000-0000-0000-0000-000000000001',
  '33000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000002',
  1, 'pending_upload',
  '34000000-0000-0000-0000-000000000011'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"30000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

select extensions.lives_ok(
  $$
    insert into storage.objects (bucket_id, name, owner_id, metadata)
    values (
      'submission-evidence',
      '30000000-0000-0000-0000-000000000002/33000000-0000-0000-0000-000000000001/34000000-0000-0000-0000-000000000001/35000000-0000-0000-0000-000000000001.jpg',
      '30000000-0000-0000-0000-000000000002',
      '{"mimetype":"image/jpeg","size":1024}'::jsonb
    )
  $$,
  'the assigned worker may reserve a valid evidence object path'
);

select extensions.throws_ok(
  $$
    insert into storage.objects (bucket_id, name, owner_id, metadata)
    values (
      'submission-evidence',
      '30000000-0000-0000-0000-000000000003/33000000-0000-0000-0000-000000000001/34000000-0000-0000-0000-000000000001/35000000-0000-0000-0000-000000000002.jpg',
      '30000000-0000-0000-0000-000000000002',
      '{"mimetype":"image/jpeg","size":1024}'::jsonb
    )
  $$,
  '42501',
  null,
  'a worker cannot write beneath another user path prefix'
);

select extensions.throws_ok(
  $$
    insert into storage.objects (bucket_id, name, owner_id, metadata)
    values (
      'submission-evidence',
      '30000000-0000-0000-0000-000000000002/33000000-0000-0000-0000-000000000001/34000000-0000-0000-0000-000000000001/35000000-0000-0000-0000-000000000003.svg',
      '30000000-0000-0000-0000-000000000002',
      '{"mimetype":"image/svg+xml","size":1024}'::jsonb
    )
  $$,
  '42501',
  null,
  'executable image formats are rejected'
);

reset role;

insert into public.submission_files (
  submission_id, uploader_id, object_path, media_type, size_bytes
)
values (
  '34000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000002',
  '30000000-0000-0000-0000-000000000002/33000000-0000-0000-0000-000000000001/34000000-0000-0000-0000-000000000001/35000000-0000-0000-0000-000000000001.jpg',
  'image/jpeg', 1024
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"30000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select extensions.is(
  (
    select count(*)::integer
    from storage.objects
    where bucket_id = 'submission-evidence'
  ),
  1,
  'the employer can read finalized evidence for their assignment'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"30000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);

select extensions.is(
  (
    select count(*)::integer
    from storage.objects
    where bucket_id = 'submission-evidence'
  ),
  0,
  'an unrelated user cannot read evidence objects'
);

select extensions.throws_ok(
  $$
    delete from storage.objects
    where bucket_id = 'submission-evidence'
  $$,
  '42501',
  null,
  'ordinary clients cannot delete evidence'
);

select * from extensions.finish();
rollback;
