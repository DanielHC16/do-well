-- Deterministic, synthetic local-only fixtures. These identities have no password
-- and are not suitable for authentication outside database policy tests.
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
select
  '00000000-0000-0000-0000-000000000000'::uuid,
  user_id,
  'authenticated',
  'authenticated',
  email,
  '',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', display_name),
  now(),
  now(),
  '',
  '',
  '',
  ''
from (
  values
    ('a0000000-0000-4000-8000-000000000001'::uuid, 'employer-a@do-well.test', 'Employer A'),
    ('a0000000-0000-4000-8000-000000000002'::uuid, 'employer-b@do-well.test', 'Employer B'),
    ('b0000000-0000-4000-8000-000000000001'::uuid, 'worker-a@do-well.test', 'Worker A'),
    ('b0000000-0000-4000-8000-000000000002'::uuid, 'worker-b@do-well.test', 'Worker B')
) as fixture_users(user_id, email, display_name)
on conflict (id) do nothing;

update public.profiles
set onboarding_completed_at = now()
where id in (
  'a0000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000002',
  'b0000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000002'
);

insert into public.worker_preferences (
  id,
  profile_id,
  preferred_categories,
  max_distance_km,
  location_label,
  latitude,
  longitude
)
values
  (
    'b1000000-0000-4000-8000-000000000001',
    'b0000000-0000-4000-8000-000000000001',
    array['errands', 'delivery'],
    15,
    'Manila',
    14.599500,
    120.984200
  ),
  (
    'b1000000-0000-4000-8000-000000000002',
    'b0000000-0000-4000-8000-000000000002',
    array['admin', 'digital'],
    25,
    'Quezon City',
    14.676000,
    121.043700
  );

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
  status,
  published_at
)
values
  (
    'c0000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    'Pick up event supplies',
    'Pick up sealed event supplies and deliver them to the venue.',
    'delivery',
    'onsite',
    'Manila',
    14.60,
    120.98,
    750,
    'published',
    now()
  ),
  (
    'c0000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000002',
    'Prepare event spreadsheet',
    'Clean and organize the provided event attendance spreadsheet.',
    'admin',
    'remote',
    null,
    null,
    null,
    1200,
    'assigned',
    now()
  );

insert into public.gig_private_locations (
  id,
  gig_id,
  address_text,
  instructions,
  latitude,
  longitude
)
values (
  'c1000000-0000-4000-8000-000000000001',
  'c0000000-0000-4000-8000-000000000001',
  'Synthetic local fixture address',
  'Ask for the sealed fixture package.',
  14.599500,
  120.984200
);

insert into public.applications (
  id,
  gig_id,
  worker_id,
  message,
  status,
  client_request_id,
  decided_at
)
values
  (
    'd0000000-0000-4000-8000-000000000001',
    'c0000000-0000-4000-8000-000000000001',
    'b0000000-0000-4000-8000-000000000002',
    'I can complete this delivery during the requested window.',
    'pending',
    'd1000000-0000-4000-8000-000000000001',
    null
  ),
  (
    'd0000000-0000-4000-8000-000000000002',
    'c0000000-0000-4000-8000-000000000002',
    'b0000000-0000-4000-8000-000000000001',
    'I can prepare and verify the spreadsheet.',
    'accepted',
    'd1000000-0000-4000-8000-000000000002',
    now()
  );

insert into public.assignments (
  id,
  gig_id,
  application_id,
  employer_id,
  worker_id,
  agreed_title,
  agreed_description,
  agreed_amount,
  status,
  employer_confirmed_at,
  client_request_id
)
values (
  'e0000000-0000-4000-8000-000000000001',
  'c0000000-0000-4000-8000-000000000002',
  'd0000000-0000-4000-8000-000000000002',
  'a0000000-0000-4000-8000-000000000002',
  'b0000000-0000-4000-8000-000000000001',
  'Prepare event spreadsheet',
  'Clean and organize the provided event attendance spreadsheet.',
  1200,
  'proposed',
  now(),
  'e1000000-0000-4000-8000-000000000001'
);

insert into public.milestones (
  id,
  assignment_id,
  position,
  title,
  description
)
values (
  'e2000000-0000-4000-8000-000000000001',
  'e0000000-0000-4000-8000-000000000001',
  1,
  'Deliver cleaned workbook',
  'Provide the cleaned synthetic workbook for review.'
);

insert into public.activity_events (
  id,
  recipient_id,
  actor_id,
  gig_id,
  assignment_id,
  event_type,
  payload,
  dedupe_key
)
values (
  'f0000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000002',
  'c0000000-0000-4000-8000-000000000002',
  'e0000000-0000-4000-8000-000000000001',
  'assignment_proposed',
  '{"fixture":true}'::jsonb,
  'assignment-proposed:e0000000-0000-4000-8000-000000000001'
);
