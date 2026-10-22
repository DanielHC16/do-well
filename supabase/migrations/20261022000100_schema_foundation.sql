create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public;

create function private.text_array_is_unique(values_to_check text[])
returns boolean
language sql
immutable
strict
set search_path = ''
as $$
  select cardinality(values_to_check) = (
    select count(distinct value)
    from unnest(values_to_check) as value
  );
$$;

revoke all on function private.text_array_is_unique(text[]) from public;

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = statement_timestamp();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_path text,
  bio text,
  preferred_mode text not null default 'worker',
  home_area text,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_check check (
    display_name = btrim(display_name)
    and char_length(display_name) between 2 and 80
  ),
  constraint profiles_avatar_path_check check (
    avatar_path is null
    or (
      char_length(avatar_path) between 1 and 300
      and avatar_path !~ '(^/|(^|/)\.\.(/|$)|[?&#])'
    )
  ),
  constraint profiles_bio_check check (bio is null or char_length(bio) <= 500),
  constraint profiles_preferred_mode_check check (preferred_mode in ('worker', 'employer')),
  constraint profiles_home_area_check check (home_area is null or char_length(home_area) between 1 and 120)
);

create table public.worker_preferences (
  id uuid primary key default extensions.gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  accepts_onsite boolean not null default true,
  accepts_remote boolean not null default true,
  preferred_categories text[] not null default '{}'::text[],
  max_distance_km smallint not null default 10,
  location_label text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint worker_preferences_work_mode_check check (accepts_onsite or accepts_remote),
  constraint worker_preferences_categories_check check (
    cardinality(preferred_categories) <= 12
    and preferred_categories <@ array[
      'errands', 'delivery', 'cleaning', 'events',
      'admin', 'tutoring', 'digital', 'other'
    ]::text[]
    and private.text_array_is_unique(preferred_categories)
  ),
  constraint worker_preferences_distance_check check (max_distance_km between 1 and 100),
  constraint worker_preferences_location_label_check check (
    location_label is null or char_length(location_label) between 1 and 120
  ),
  constraint worker_preferences_coordinates_check check (
    (latitude is null and longitude is null)
    or (
      latitude is not null
      and longitude is not null
      and
      latitude between -90 and 90
      and longitude between -180 and 180
    )
  )
);

create table public.gigs (
  id uuid primary key default extensions.gen_random_uuid(),
  employer_id uuid not null references public.profiles (id) on delete restrict,
  title text not null,
  description text not null,
  category text not null,
  work_mode text not null,
  public_area text,
  public_latitude numeric(4, 2),
  public_longitude numeric(5, 2),
  budget_amount numeric(12, 2) not null,
  currency char(3) not null default 'PHP',
  status text not null default 'draft',
  application_deadline timestamptz,
  due_at timestamptz,
  published_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gigs_title_check check (title = btrim(title) and char_length(title) between 5 and 100),
  constraint gigs_description_check check (
    description = btrim(description) and char_length(description) between 20 and 4000
  ),
  constraint gigs_category_check check (
    category in ('errands', 'delivery', 'cleaning', 'events', 'admin', 'tutoring', 'digital', 'other')
  ),
  constraint gigs_work_mode_check check (work_mode in ('onsite', 'remote', 'hybrid')),
  constraint gigs_location_check check (
    (
      work_mode = 'remote'
      and public_latitude is null
      and public_longitude is null
      and (public_area is null or char_length(public_area) between 1 and 120)
    )
    or (
      work_mode in ('onsite', 'hybrid')
      and public_area is not null
      and public_latitude is not null
      and public_longitude is not null
      and char_length(public_area) between 1 and 120
      and public_latitude between -90 and 90
      and public_longitude between -180 and 180
    )
  ),
  constraint gigs_budget_check check (budget_amount > 0 and budget_amount <= 1000000),
  constraint gigs_currency_check check (currency = 'PHP'),
  constraint gigs_status_check check (
    status in (
      'draft', 'published', 'assigned', 'in_progress', 'submitted',
      'revision_requested', 'completed', 'closed', 'cancelled'
    )
  ),
  constraint gigs_deadline_order_check check (
    application_deadline is null or due_at is null or application_deadline < due_at
  ),
  constraint gigs_published_at_check check (
    (status = 'draft' and published_at is null)
    or status <> 'draft'
  ),
  constraint gigs_closed_at_check check (
    (status in ('completed', 'closed', 'cancelled') and closed_at is not null)
    or (status not in ('completed', 'closed', 'cancelled') and closed_at is null)
  ),
  constraint gigs_id_employer_unique unique (id, employer_id)
);

create table public.gig_private_locations (
  id uuid primary key default extensions.gen_random_uuid(),
  gig_id uuid not null unique references public.gigs (id) on delete cascade,
  address_text text,
  instructions text,
  latitude numeric(9, 6) not null,
  longitude numeric(9, 6) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gig_private_locations_address_check check (
    address_text is null or char_length(address_text) between 1 and 300
  ),
  constraint gig_private_locations_instructions_check check (
    instructions is null or char_length(instructions) <= 500
  ),
  constraint gig_private_locations_coordinates_check check (
    latitude between -90 and 90 and longitude between -180 and 180
  )
);

create table public.applications (
  id uuid primary key default extensions.gen_random_uuid(),
  gig_id uuid not null references public.gigs (id) on delete cascade,
  worker_id uuid not null references public.profiles (id) on delete restrict,
  message text,
  status text not null default 'pending',
  client_request_id uuid not null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint applications_message_check check (message is null or char_length(message) <= 1000),
  constraint applications_status_check check (
    status in ('pending', 'withdrawn', 'accepted', 'rejected', 'declined')
  ),
  constraint applications_decided_at_check check (
    (status = 'pending' and decided_at is null)
    or (status <> 'pending' and decided_at is not null)
  ),
  constraint applications_idempotency_unique unique (worker_id, client_request_id),
  constraint applications_id_gig_worker_unique unique (id, gig_id, worker_id)
);

create table public.assignments (
  id uuid primary key default extensions.gen_random_uuid(),
  gig_id uuid not null references public.gigs (id) on delete restrict,
  application_id uuid not null unique references public.applications (id) on delete restrict,
  employer_id uuid not null references public.profiles (id) on delete restrict,
  worker_id uuid not null references public.profiles (id) on delete restrict,
  agreement_version integer not null default 1,
  agreed_title text not null,
  agreed_description text not null,
  agreed_amount numeric(12, 2) not null,
  currency char(3) not null default 'PHP',
  due_at timestamptz,
  status text not null default 'proposed',
  employer_confirmed_at timestamptz not null,
  worker_confirmed_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  client_request_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assignments_gig_employer_fk
    foreign key (gig_id, employer_id)
    references public.gigs (id, employer_id)
    on delete restrict,
  constraint assignments_application_gig_worker_fk
    foreign key (application_id, gig_id, worker_id)
    references public.applications (id, gig_id, worker_id)
    on delete restrict,
  constraint assignments_participants_check check (employer_id <> worker_id),
  constraint assignments_agreement_version_check check (agreement_version > 0),
  constraint assignments_title_check check (
    agreed_title = btrim(agreed_title) and char_length(agreed_title) between 5 and 100
  ),
  constraint assignments_description_check check (
    agreed_description = btrim(agreed_description)
    and char_length(agreed_description) between 20 and 4000
  ),
  constraint assignments_amount_check check (agreed_amount > 0 and agreed_amount <= 1000000),
  constraint assignments_currency_check check (currency = 'PHP'),
  constraint assignments_status_check check (
    status in ('proposed', 'active', 'submitted', 'revision_requested', 'completed', 'declined', 'cancelled')
  ),
  constraint assignments_confirmation_check check (
    (status = 'proposed' and worker_confirmed_at is null and started_at is null)
    or status <> 'proposed'
  ),
  constraint assignments_completed_at_check check (
    (status = 'completed' and completed_at is not null)
    or (status <> 'completed' and completed_at is null)
  ),
  constraint assignments_cancelled_at_check check (
    (status in ('declined', 'cancelled') and cancelled_at is not null)
    or (status not in ('declined', 'cancelled') and cancelled_at is null)
  ),
  constraint assignments_idempotency_unique unique (employer_id, client_request_id),
  constraint assignments_id_worker_unique unique (id, worker_id)
);

create table public.milestones (
  id uuid primary key default extensions.gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  position smallint not null,
  title text not null,
  description text,
  due_at timestamptz,
  status text not null default 'pending',
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint milestones_position_check check (position between 1 and 20),
  constraint milestones_title_check check (title = btrim(title) and char_length(title) between 2 and 100),
  constraint milestones_description_check check (description is null or char_length(description) <= 1000),
  constraint milestones_status_check check (
    status in ('pending', 'in_progress', 'submitted', 'revision_requested', 'approved', 'cancelled')
  ),
  constraint milestones_approved_at_check check (
    (status = 'approved' and approved_at is not null)
    or (status <> 'approved' and approved_at is null)
  ),
  constraint milestones_assignment_position_unique unique (assignment_id, position),
  constraint milestones_id_assignment_unique unique (id, assignment_id)
);

create table public.submissions (
  id uuid primary key default extensions.gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete restrict,
  milestone_id uuid,
  submitted_by uuid not null references public.profiles (id) on delete restrict,
  version smallint not null,
  note text,
  status text not null default 'pending_upload',
  review_note text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  client_request_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint submissions_assignment_worker_fk
    foreign key (assignment_id, submitted_by)
    references public.assignments (id, worker_id)
    on delete restrict,
  constraint submissions_milestone_assignment_fk
    foreign key (milestone_id, assignment_id)
    references public.milestones (id, assignment_id)
    on delete restrict,
  constraint submissions_version_check check (version > 0),
  constraint submissions_note_check check (note is null or char_length(note) <= 2000),
  constraint submissions_status_check check (
    status in ('pending_upload', 'submitted', 'revision_requested', 'approved', 'abandoned')
  ),
  constraint submissions_review_note_check check (
    review_note is null or char_length(review_note) <= 2000
  ),
  constraint submissions_revision_note_check check (
    status <> 'revision_requested'
    or (review_note is not null and char_length(btrim(review_note)) > 0)
  ),
  constraint submissions_submitted_at_check check (
    (status in ('submitted', 'revision_requested', 'approved') and submitted_at is not null)
    or (status in ('pending_upload', 'abandoned') and submitted_at is null)
  ),
  constraint submissions_reviewed_at_check check (
    (status in ('revision_requested', 'approved') and reviewed_at is not null)
    or (status not in ('revision_requested', 'approved') and reviewed_at is null)
  ),
  constraint submissions_idempotency_unique unique (submitted_by, client_request_id),
  constraint submissions_id_submitter_unique unique (id, submitted_by)
);

create table public.submission_files (
  id uuid primary key default extensions.gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  uploader_id uuid not null references public.profiles (id) on delete restrict,
  object_path text not null unique,
  media_type text not null,
  size_bytes integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint submission_files_submission_uploader_fk
    foreign key (submission_id, uploader_id)
    references public.submissions (id, submitted_by)
    on delete cascade,
  constraint submission_files_object_path_check check (
    char_length(object_path) between 1 and 500
    and object_path !~ '(^/|(^|/)\.\.(/|$)|[?&#\\])'
  ),
  constraint submission_files_media_type_check check (
    media_type in ('image/jpeg', 'image/png', 'image/webp')
  ),
  constraint submission_files_size_check check (size_bytes between 1 and 5242880)
);

create table public.activity_events (
  id uuid primary key default extensions.gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  gig_id uuid references public.gigs (id) on delete cascade,
  assignment_id uuid references public.assignments (id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  dedupe_key text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activity_events_event_type_check check (
    char_length(event_type) between 2 and 60
    and event_type ~ '^[a-z][a-z0-9_]*$'
  ),
  constraint activity_events_payload_check check (
    jsonb_typeof(payload) = 'object' and pg_column_size(payload) <= 4096
  ),
  constraint activity_events_dedupe_key_check check (char_length(dedupe_key) between 1 and 160),
  constraint activity_events_dedupe_unique unique (recipient_id, dedupe_key)
);

create table public.reports (
  id uuid primary key default extensions.gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete restrict,
  subject_profile_id uuid references public.profiles (id) on delete restrict,
  gig_id uuid references public.gigs (id) on delete set null,
  assignment_id uuid references public.assignments (id) on delete set null,
  category text not null,
  details text not null,
  status text not null default 'open',
  resolution_note text,
  client_request_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reports_subject_check check (
    subject_profile_id is not null or gig_id is not null or assignment_id is not null
  ),
  constraint reports_self_check check (
    subject_profile_id is null or subject_profile_id <> reporter_id
  ),
  constraint reports_category_check check (category in ('scam', 'unsafe', 'harassment', 'prohibited', 'other')),
  constraint reports_details_check check (
    details = btrim(details) and char_length(details) between 20 and 2000
  ),
  constraint reports_status_check check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  constraint reports_resolution_note_check check (
    resolution_note is null or char_length(resolution_note) <= 2000
  ),
  constraint reports_idempotency_unique unique (reporter_id, client_request_id)
);

create table public.ai_request_log (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  request_id uuid not null,
  provider text not null,
  status text not null,
  input_chars integer not null,
  output_chars integer,
  duration_ms integer,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_request_log_provider_check check (char_length(provider) between 1 and 40),
  constraint ai_request_log_status_check check (
    status in ('reserved', 'succeeded', 'failed', 'timed_out', 'invalid_output')
  ),
  constraint ai_request_log_input_chars_check check (input_chars between 0 and 8000),
  constraint ai_request_log_output_chars_check check (output_chars is null or output_chars between 0 and 12000),
  constraint ai_request_log_duration_check check (duration_ms is null or duration_ms >= 0),
  constraint ai_request_log_error_code_check check (error_code is null or char_length(error_code) between 1 and 60),
  constraint ai_request_log_idempotency_unique unique (user_id, request_id)
);

create unique index applications_one_live_worker_per_gig_idx
  on public.applications (gig_id, worker_id)
  where status in ('pending', 'accepted');
create unique index applications_one_accepted_per_gig_idx
  on public.applications (gig_id)
  where status = 'accepted';
create index applications_gig_status_created_idx on public.applications (gig_id, status, created_at desc);
create index applications_worker_created_idx on public.applications (worker_id, created_at desc);

create index gigs_employer_created_idx on public.gigs (employer_id, created_at desc);
create index gigs_published_created_idx on public.gigs (published_at desc) where status = 'published';
create index gigs_discovery_mode_category_idx
  on public.gigs (work_mode, category, published_at desc)
  where status = 'published';
create index gigs_discovery_coordinates_idx
  on public.gigs (public_latitude, public_longitude)
  where status = 'published' and work_mode <> 'remote';

create unique index assignments_one_live_per_gig_idx
  on public.assignments (gig_id)
  where status not in ('declined', 'cancelled');
create index assignments_worker_status_updated_idx on public.assignments (worker_id, status, updated_at desc);
create index assignments_employer_status_updated_idx on public.assignments (employer_id, status, updated_at desc);

create index milestones_assignment_status_position_idx on public.milestones (assignment_id, status, position);

create unique index submissions_assignment_milestone_version_idx
  on public.submissions (
    assignment_id,
    coalesce(milestone_id, '00000000-0000-0000-0000-000000000000'::uuid),
    version
  );
create index submissions_assignment_created_idx on public.submissions (assignment_id, created_at desc);
create index submissions_milestone_idx on public.submissions (milestone_id) where milestone_id is not null;

create index submission_files_submission_created_idx on public.submission_files (submission_id, created_at);
create index submission_files_uploader_idx on public.submission_files (uploader_id);

create index activity_events_recipient_unread_created_idx
  on public.activity_events (recipient_id, read_at, created_at desc);
create index activity_events_actor_idx on public.activity_events (actor_id) where actor_id is not null;
create index activity_events_gig_idx on public.activity_events (gig_id) where gig_id is not null;
create index activity_events_assignment_idx on public.activity_events (assignment_id) where assignment_id is not null;

create index reports_reporter_created_idx on public.reports (reporter_id, created_at desc);
create index reports_status_created_idx on public.reports (status, created_at);
create index reports_subject_profile_idx on public.reports (subject_profile_id) where subject_profile_id is not null;
create index reports_gig_idx on public.reports (gig_id) where gig_id is not null;
create index reports_assignment_idx on public.reports (assignment_id) where assignment_id is not null;

create index ai_request_log_user_created_idx on public.ai_request_log (user_id, created_at desc);
create index ai_request_log_stale_status_idx on public.ai_request_log (status, created_at)
  where status = 'reserved';

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'worker_preferences', 'gigs', 'gig_private_locations',
    'applications', 'assignments', 'milestones', 'submissions',
    'submission_files', 'activity_events', 'reports', 'ai_request_log'
  ]
  loop
    execute format(
      'create trigger set_%1$s_updated_at before update on public.%1$I '
      'for each row execute function private.set_updated_at()',
      table_name
    );
  end loop;
end;
$$;

create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate text;
begin
  candidate := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');

  if candidate is null or char_length(candidate) < 2 then
    candidate := 'New user';
  end if;

  insert into public.profiles (id, display_name)
  values (new.id, left(candidate, 80))
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
