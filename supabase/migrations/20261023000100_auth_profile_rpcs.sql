create function public.ensure_profile()
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  result public.profiles;
begin
  if caller_id is null or not exists (
    select 1
    from auth.users as u
    where u.id = caller_id
  ) then
    raise exception using
      errcode = '42501',
      message = 'authentication required';
  end if;

  insert into public.profiles (id, display_name)
  values (caller_id, 'New user')
  on conflict (id) do nothing;

  select p.*
  into strict result
  from public.profiles as p
  where p.id = caller_id;

  return result;
end;
$$;

revoke all on function public.ensure_profile() from public, anon;
grant execute on function public.ensure_profile() to authenticated;

create function public.complete_onboarding(
  p_display_name text,
  p_home_area text
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  normalized_display_name text := btrim(coalesce(p_display_name, ''));
  normalized_home_area text := btrim(coalesce(p_home_area, ''));
  result public.profiles;
begin
  if caller_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication required';
  end if;

  if char_length(normalized_display_name) not between 2 and 80 then
    raise exception using
      errcode = '22023',
      message = 'display name is invalid';
  end if;

  if char_length(normalized_home_area) not between 1 and 120 then
    raise exception using
      errcode = '22023',
      message = 'home area is invalid';
  end if;

  perform public.ensure_profile();

  update public.profiles as p
  set
    display_name = normalized_display_name,
    home_area = normalized_home_area,
    onboarding_completed_at = coalesce(p.onboarding_completed_at, now())
  where p.id = caller_id
  returning p.* into strict result;

  return result;
end;
$$;

revoke all on function public.complete_onboarding(text, text) from public, anon;
grant execute on function public.complete_onboarding(text, text) to authenticated;

drop policy profiles_update_own on public.profiles;

create policy profiles_update_own
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (
  id = (select auth.uid())
  and (
    onboarding_completed_at is null
    or (
      home_area is not null
      and home_area = btrim(home_area)
      and char_length(home_area) between 1 and 120
    )
  )
);
