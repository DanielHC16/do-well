begin;

create extension if not exists pgtap with schema extensions;

select extensions.no_plan();

select extensions.is(
  (
    select array_agg(c.relname order by c.relname)
    from pg_catalog.pg_class as c
    join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname = any (
        array[
          'activity_events',
          'ai_request_log',
          'applications',
          'assignments',
          'gig_private_locations',
          'gigs',
          'milestones',
          'profiles',
          'reports',
          'submission_files',
          'submissions',
          'worker_preferences'
        ]::text[]
      )
  ),
  array[
    'activity_events',
    'ai_request_log',
    'applications',
    'assignments',
    'gig_private_locations',
    'gigs',
    'milestones',
    'profiles',
    'reports',
    'submission_files',
    'submissions',
    'worker_preferences'
  ]::name[],
  'all documented public tables exist'
);

select extensions.is(
  (
    select count(*)::integer
    from information_schema.columns
    where table_schema = 'public'
      and column_name = 'created_at'
      and table_name = any (
        array[
          'activity_events', 'ai_request_log', 'applications', 'assignments',
          'gig_private_locations', 'gigs', 'milestones', 'profiles', 'reports',
          'submission_files', 'submissions', 'worker_preferences'
        ]
      )
  ),
  12,
  'every domain table records creation time'
);

select extensions.is(
  (
    select count(*)::integer
    from information_schema.columns
    where table_schema = 'public'
      and column_name = 'updated_at'
      and table_name = any (
        array[
          'activity_events', 'ai_request_log', 'applications', 'assignments',
          'gig_private_locations', 'gigs', 'milestones', 'profiles', 'reports',
          'submission_files', 'submissions', 'worker_preferences'
        ]
      )
  ),
  12,
  'every domain table records update time'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_constraint as con
    join pg_catalog.pg_namespace as n on n.oid = con.connamespace
    where n.nspname = 'public'
      and con.conname = any (
        array[
          'profiles_display_name_check',
          'worker_preferences_categories_check',
          'gigs_category_check',
          'gigs_location_check',
          'applications_status_check',
          'assignments_participants_check',
          'milestones_status_check',
          'submissions_status_check',
          'submission_files_media_type_check',
          'activity_events_event_type_check',
          'reports_subject_check',
          'ai_request_log_status_check'
        ]
      )
  ),
  12,
  'named domain constraints are installed'
);

select extensions.ok(
  exists (
    select 1
    from pg_catalog.pg_indexes
    where schemaname = 'public'
      and indexname = 'assignments_one_live_per_gig_idx'
      and indexdef ilike '%unique%where%'
  ),
  'one live assignment is enforced by a partial unique index'
);

select extensions.ok(
  exists (
    select 1
    from pg_catalog.pg_indexes
    where schemaname = 'public'
      and indexname = 'applications_one_live_worker_per_gig_idx'
      and indexdef ilike '%unique%where%'
  ),
  'one live application per worker and gig is enforced'
);

select extensions.ok(
  exists (
    select 1
    from pg_catalog.pg_indexes
    where schemaname = 'public'
      and indexname = 'submissions_assignment_milestone_version_idx'
      and indexdef ilike '%unique%coalesce%'
  ),
  'submission versions are unique with or without a milestone'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_trigger as t
    join pg_catalog.pg_class as c on c.oid = t.tgrelid
    join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = any (
        array[
          'activity_events', 'ai_request_log', 'applications', 'assignments',
          'gig_private_locations', 'gigs', 'milestones', 'profiles', 'reports',
          'submission_files', 'submissions', 'worker_preferences'
        ]
      )
      and not t.tgisinternal
      and t.tgname like 'set_%_updated_at'
  ),
  12,
  'all mutable domain tables maintain updated_at with triggers'
);

select * from extensions.finish();
rollback;
