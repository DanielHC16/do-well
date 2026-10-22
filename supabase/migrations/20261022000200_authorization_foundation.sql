revoke all on all tables in schema public from anon, authenticated;

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
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
  end loop;
end;
$$;

create function private.is_gig_employer(target_gig_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.gigs as g
    where g.id = target_gig_id
      and g.employer_id = (select auth.uid())
  );
$$;

create function private.has_gig_relationship(target_gig_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1
      from public.applications as a
      where a.gig_id = target_gig_id
        and a.worker_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.assignments as a
      where a.gig_id = target_gig_id
        and (
          a.worker_id = (select auth.uid())
          or a.employer_id = (select auth.uid())
        )
    );
$$;

create function private.can_read_gig_private_location(target_gig_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1
      from public.gigs as g
      where g.id = target_gig_id
        and g.employer_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.assignments as a
      where a.gig_id = target_gig_id
        and a.worker_id = (select auth.uid())
        and a.worker_confirmed_at is not null
        and a.status in ('active', 'submitted', 'revision_requested')
    );
$$;

create function private.is_assignment_participant(target_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.assignments as a
    where a.id = target_assignment_id
      and (
        a.worker_id = (select auth.uid())
        or a.employer_id = (select auth.uid())
      )
  );
$$;

create function private.is_submission_participant(target_submission_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.submissions as s
    join public.assignments as a on a.id = s.assignment_id
    where s.id = target_submission_id
      and (
        a.worker_id = (select auth.uid())
        or a.employer_id = (select auth.uid())
      )
  );
$$;

revoke all on function private.is_gig_employer(uuid) from public, anon;
revoke all on function private.has_gig_relationship(uuid) from public, anon;
revoke all on function private.can_read_gig_private_location(uuid) from public, anon;
revoke all on function private.is_assignment_participant(uuid) from public, anon;
revoke all on function private.is_submission_participant(uuid) from public, anon;

grant usage on schema private to authenticated;
grant execute on function private.is_gig_employer(uuid) to authenticated;
grant execute on function private.has_gig_relationship(uuid) to authenticated;
grant execute on function private.can_read_gig_private_location(uuid) to authenticated;
grant execute on function private.is_assignment_participant(uuid) to authenticated;
grant execute on function private.is_submission_participant(uuid) to authenticated;

grant select on table public.profiles to authenticated;
grant update (
  display_name, avatar_path, bio, preferred_mode, home_area
) on table public.profiles to authenticated;

grant select on table public.worker_preferences to authenticated;
grant insert (
  profile_id, accepts_onsite, accepts_remote, preferred_categories,
  max_distance_km, location_label, latitude, longitude
) on table public.worker_preferences to authenticated;
grant update (
  accepts_onsite, accepts_remote, preferred_categories,
  max_distance_km, location_label, latitude, longitude
) on table public.worker_preferences to authenticated;
grant delete on table public.worker_preferences to authenticated;

grant select on table public.gigs to authenticated;
grant insert (
  employer_id, title, description, category, work_mode, public_area,
  public_latitude, public_longitude, budget_amount, currency,
  application_deadline, due_at
) on table public.gigs to authenticated;
grant update (
  title, description, category, work_mode, public_area, public_latitude,
  public_longitude, budget_amount, currency, application_deadline, due_at
) on table public.gigs to authenticated;
grant delete on table public.gigs to authenticated;

grant select on table public.gig_private_locations to authenticated;
grant insert (
  gig_id, address_text, instructions, latitude, longitude
) on table public.gig_private_locations to authenticated;
grant update (
  address_text, instructions, latitude, longitude
) on table public.gig_private_locations to authenticated;
grant delete on table public.gig_private_locations to authenticated;

grant select on table public.applications to authenticated;
grant select on table public.assignments to authenticated;
grant select on table public.milestones to authenticated;
grant select on table public.submissions to authenticated;
grant select on table public.submission_files to authenticated;
grant select on table public.activity_events to authenticated;
grant select on table public.reports to authenticated;

create policy profiles_read_authenticated
on public.profiles
for select
to authenticated
using (true);

create policy profiles_update_own
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy worker_preferences_read_own
on public.worker_preferences
for select
to authenticated
using (profile_id = (select auth.uid()));

create policy worker_preferences_insert_own
on public.worker_preferences
for insert
to authenticated
with check (profile_id = (select auth.uid()));

create policy worker_preferences_update_own
on public.worker_preferences
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

create policy worker_preferences_delete_own_without_active_assignment
on public.worker_preferences
for delete
to authenticated
using (
  profile_id = (select auth.uid())
  and not exists (
    select 1
    from public.assignments as a
    where a.worker_id = (select auth.uid())
      and a.status in ('proposed', 'active', 'submitted', 'revision_requested')
  )
);

create policy gigs_read_related
on public.gigs
for select
to authenticated
using (
  status = 'published'
  or employer_id = (select auth.uid())
  or private.has_gig_relationship(id)
);

create policy gigs_insert_own_draft
on public.gigs
for insert
to authenticated
with check (
  employer_id = (select auth.uid())
  and status = 'draft'
  and exists (
    select 1
    from public.profiles as p
    where p.id = (select auth.uid())
      and p.onboarding_completed_at is not null
  )
);

create policy gigs_update_own_draft
on public.gigs
for update
to authenticated
using (
  employer_id = (select auth.uid())
  and status = 'draft'
)
with check (
  employer_id = (select auth.uid())
  and status = 'draft'
);

create policy gigs_delete_own_unused_draft
on public.gigs
for delete
to authenticated
using (
  employer_id = (select auth.uid())
  and status = 'draft'
  and not exists (select 1 from public.applications as a where a.gig_id = gigs.id)
  and not exists (select 1 from public.assignments as a where a.gig_id = gigs.id)
);

create policy gig_private_locations_read_authorized
on public.gig_private_locations
for select
to authenticated
using (private.can_read_gig_private_location(gig_id));

create policy gig_private_locations_insert_own_draft
on public.gig_private_locations
for insert
to authenticated
with check (
  exists (
    select 1
    from public.gigs as g
    where g.id = gig_id
      and g.employer_id = (select auth.uid())
      and g.status = 'draft'
  )
);

create policy gig_private_locations_update_own_draft
on public.gig_private_locations
for update
to authenticated
using (
  exists (
    select 1
    from public.gigs as g
    where g.id = gig_id
      and g.employer_id = (select auth.uid())
      and g.status = 'draft'
  )
)
with check (
  exists (
    select 1
    from public.gigs as g
    where g.id = gig_id
      and g.employer_id = (select auth.uid())
      and g.status = 'draft'
  )
);

create policy gig_private_locations_delete_own_draft
on public.gig_private_locations
for delete
to authenticated
using (
  exists (
    select 1
    from public.gigs as g
    where g.id = gig_id
      and g.employer_id = (select auth.uid())
      and g.status = 'draft'
  )
);

create policy applications_read_authorized
on public.applications
for select
to authenticated
using (
  worker_id = (select auth.uid())
  or private.is_gig_employer(gig_id)
);

create policy assignments_read_participants
on public.assignments
for select
to authenticated
using (
  employer_id = (select auth.uid())
  or worker_id = (select auth.uid())
);

create policy milestones_read_assignment_participants
on public.milestones
for select
to authenticated
using (private.is_assignment_participant(assignment_id));

create policy submissions_read_assignment_participants
on public.submissions
for select
to authenticated
using (private.is_assignment_participant(assignment_id));

create policy submission_files_read_assignment_participants
on public.submission_files
for select
to authenticated
using (private.is_submission_participant(submission_id));

create policy activity_events_read_recipient
on public.activity_events
for select
to authenticated
using (recipient_id = (select auth.uid()));

create policy reports_read_reporter
on public.reports
for select
to authenticated
using (reporter_id = (select auth.uid()));
