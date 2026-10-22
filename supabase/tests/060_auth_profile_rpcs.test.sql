begin;

create extension if not exists pgtap with schema extensions;
select extensions.no_plan();

select extensions.has_function(
  'public',
  'ensure_profile',
  array[]::text[],
  'ensure_profile exists without a caller-supplied identity'
);

select extensions.has_function(
  'public',
  'complete_onboarding',
  array['text', 'text'],
  'complete_onboarding exposes only validated profile fields'
);

select extensions.ok(
  to_regprocedure('public.ensure_profile(uuid)') is null,
  'profile repair accepts no arbitrary identity argument'
);

select extensions.ok(
  (
    select bool_and(
      p.prosecdef
      and p.proconfig @> array['search_path=""']::text[]
    )
    from pg_catalog.pg_proc as p
    join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('ensure_profile', 'complete_onboarding')
  ),
  'profile RPCs are hardened security-definer functions'
);

select extensions.ok(
  not has_function_privilege('public', 'public.ensure_profile()', 'execute')
  and not has_function_privilege('anon', 'public.ensure_profile()', 'execute')
  and has_function_privilege('authenticated', 'public.ensure_profile()', 'execute')
  and not has_function_privilege(
    'public',
    'public.complete_onboarding(text,text)',
    'execute'
  )
  and not has_function_privilege(
    'anon',
    'public.complete_onboarding(text,text)',
    'execute'
  )
  and has_function_privilege(
    'authenticated',
    'public.complete_onboarding(text,text)',
    'execute'
  ),
  'only authenticated users may execute profile RPCs'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '60000000-0000-0000-0000-000000000001',
    'authenticated', 'authenticated', 'repair-a@example.test', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Repair A","provider_token":"must-not-copy"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '60000000-0000-0000-0000-000000000002',
    'authenticated', 'authenticated', 'repair-b@example.test', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Repair B"}'::jsonb,
    now(), now(), '', '', '', ''
  );

delete from public.profiles
where id = '60000000-0000-0000-0000-000000000001';

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select extensions.throws_ok(
  'select public.ensure_profile()',
  '42501',
  null,
  'anonymous callers cannot repair profiles'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"60000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select extensions.lives_ok(
  'select public.ensure_profile()',
  'an authenticated user can repair their missing profile'
);

select extensions.is(
  (
    select count(*)::integer
    from public.profiles
    where id = '60000000-0000-0000-0000-000000000001'
      and display_name = 'New user'
      and to_jsonb(profiles)::text not like '%must-not-copy%'
  ),
  1,
  'repair creates exactly one minimal profile without copying auth metadata'
);

select extensions.lives_ok(
  'select public.ensure_profile(); select public.ensure_profile()',
  'repeated profile repair is idempotent'
);

select extensions.is(
  (
    select count(*)::integer
    from public.profiles
    where id = '60000000-0000-0000-0000-000000000001'
  ),
  1,
  'repeated repair still leaves one caller profile'
);

select extensions.throws_ok(
  $$select public.complete_onboarding(' ', 'Manila')$$,
  '22023',
  null,
  'onboarding rejects a blank display name'
);

select extensions.throws_ok(
  $$select public.complete_onboarding('Valid User', ' ')$$,
  '22023',
  null,
  'onboarding rejects a blank home area'
);

select extensions.throws_ok(
  $$
    update public.profiles
    set onboarding_completed_at = now()
    where id = '60000000-0000-0000-0000-000000000001'
  $$,
  '42501',
  null,
  'clients cannot bypass server-controlled onboarding completion'
);

select extensions.lives_ok(
  $$select public.complete_onboarding('  Valid User  ', '  Manila  ')$$,
  'onboarding accepts and normalizes valid required fields'
);

select extensions.ok(
  (
    select display_name = 'Valid User'
      and home_area = 'Manila'
      and onboarding_completed_at is not null
    from public.profiles
    where id = '60000000-0000-0000-0000-000000000001'
  ),
  'onboarding updates only the caller and marks completion server-side'
);

reset role;
select onboarding_completed_at
from public.profiles
where id = '60000000-0000-0000-0000-000000000001'
\gset completed_

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"60000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select extensions.lives_ok(
  $$select public.complete_onboarding('Valid User', 'Manila')$$,
  'repeating valid onboarding completion is safe'
);

select extensions.is(
  (
    select onboarding_completed_at::text
    from public.profiles
    where id = '60000000-0000-0000-0000-000000000001'
  ),
  :'completed_onboarding_completed_at',
  'repeated onboarding preserves the original completion timestamp'
);

select extensions.throws_ok(
  $$
    update public.profiles
    set home_area = null
    where id = '60000000-0000-0000-0000-000000000001'
  $$,
  '42501',
  null,
  'completed profiles cannot clear required onboarding fields'
);

reset role;
select extensions.is(
  (
    select display_name
    from public.profiles
    where id = '60000000-0000-0000-0000-000000000002'
  ),
  'Repair B',
  'caller-bound RPCs do not mutate another profile'
);

select * from extensions.finish();
rollback;
