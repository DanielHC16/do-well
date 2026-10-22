begin;

create extension if not exists pgtap with schema extensions;
select extensions.no_plan();

select extensions.ok(
  (
    select p.prosecdef
      and p.proconfig @> array['search_path=""']::text[]
    from pg_catalog.pg_proc as p
    join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'handle_new_auth_user'
  ),
  'profile provisioning is a hardened security-definer function'
);

select extensions.ok(
  not has_function_privilege('public', 'public.handle_new_auth_user()', 'execute')
  and not has_function_privilege('anon', 'public.handle_new_auth_user()', 'execute')
  and not has_function_privilege('authenticated', 'public.handle_new_auth_user()', 'execute'),
  'profile provisioning cannot be invoked by API roles'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-0000-0000-000000000001',
    'authenticated', 'authenticated', 'google@example.test', '', now(),
    '{"provider":"google","providers":["google"]}'::jsonb,
    '{"full_name":"  Google Person  ","provider_token":"must-not-copy"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-0000-0000-000000000002',
    'authenticated', 'authenticated', 'email@example.test', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Email Person"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-0000-0000-000000000003',
    'authenticated', 'authenticated', 'missing@example.test', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(), now(), '', '', '', ''
  );

select extensions.results_eq(
  $$
    select id, display_name
    from public.profiles
    where id in (
      '10000000-0000-0000-0000-000000000001'::uuid,
      '10000000-0000-0000-0000-000000000002'::uuid,
      '10000000-0000-0000-0000-000000000003'::uuid
    )
    order by id
  $$,
  $$ values
    ('10000000-0000-0000-0000-000000000001'::uuid, 'Google Person'::text),
    ('10000000-0000-0000-0000-000000000002'::uuid, 'Email Person'::text),
    ('10000000-0000-0000-0000-000000000003'::uuid, 'New user'::text)
  $$,
  'auth identities provision safe profile names'
);

select extensions.is(
  (
    select count(*)::integer
    from public.profiles
    where id = '10000000-0000-0000-0000-000000000001'
      and to_jsonb(profiles)::text like '%must-not-copy%'
  ),
  0,
  'provider credentials are never copied into profiles'
);

delete from auth.users where id = '10000000-0000-0000-0000-000000000003';

select extensions.is(
  (
    select count(*)::integer
    from public.profiles
    where id = '10000000-0000-0000-0000-000000000003'
  ),
  0,
  'deleting an unused auth identity cascades its profile'
);

select * from extensions.finish();
rollback;
