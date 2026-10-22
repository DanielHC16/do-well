insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'submission-evidence',
  'submission-evidence',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create function private.can_upload_submission_evidence(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when object_name ~ (
      '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
      || '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
      || '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
      || '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
    )
    then exists (
      select 1
      from public.submissions as s
      join public.assignments as a on a.id = s.assignment_id
      where s.id = split_part(object_name, '/', 3)::uuid
        and s.assignment_id = split_part(object_name, '/', 2)::uuid
        and s.submitted_by = (select auth.uid())
        and s.status = 'pending_upload'
        and a.worker_id = (select auth.uid())
        and split_part(object_name, '/', 1) = (select auth.uid())::text
    )
    else false
  end;
$$;

create function private.can_read_submission_evidence(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.submission_files as f
    join public.submissions as s on s.id = f.submission_id
    join public.assignments as a on a.id = s.assignment_id
    where f.object_path = object_name
      and (
        a.worker_id = (select auth.uid())
        or a.employer_id = (select auth.uid())
      )
  );
$$;

revoke all on function private.can_upload_submission_evidence(text) from public, anon;
revoke all on function private.can_read_submission_evidence(text) from public, anon;
grant execute on function private.can_upload_submission_evidence(text) to authenticated;
grant execute on function private.can_read_submission_evidence(text) to authenticated;

create policy submission_evidence_insert_worker
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'submission-evidence'
  and private.can_upload_submission_evidence(name)
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  and lower(metadata ->> 'mimetype') in ('image/jpeg', 'image/png', 'image/webp')
  and (metadata ->> 'size') ~ '^[0-9]+$'
  and (metadata ->> 'size')::bigint between 1 and 5242880
);

create policy submission_evidence_select_participants
on storage.objects
for select
to authenticated
using (
  bucket_id = 'submission-evidence'
  and private.can_read_submission_evidence(name)
);
