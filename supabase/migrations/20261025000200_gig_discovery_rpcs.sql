-- Migration: 20261025000200_gig_discovery_rpcs.sql
-- Description: Great-circle distance function and explainable gig discovery RPC for workers.

create or replace function public.calculate_distance_km(
  p_lat1 numeric,
  p_lon1 numeric,
  p_lat2 numeric,
  p_lon2 numeric
)
returns numeric
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  d_lat double precision;
  d_lon double precision;
  a double precision;
  c double precision;
  r constant double precision := 6371.0;
begin
  if p_lat1 is null or p_lon1 is null or p_lat2 is null or p_lon2 is null then
    return null;
  end if;

  d_lat := radians((p_lat2 - p_lat1)::double precision);
  d_lon := radians((p_lon2 - p_lon1)::double precision);
  a := (sin(d_lat / 2.0) * sin(d_lat / 2.0)) +
       cos(radians(p_lat1::double precision)) *
       cos(radians(p_lat2::double precision)) *
       (sin(d_lon / 2.0) * sin(d_lon / 2.0));
  c := 2.0 * atan2(sqrt(greatest(0.0, a)), sqrt(greatest(0.0, 1.0 - a)));
  return round((r * c)::numeric, 1);
end;
$$;

create or replace function public.discover_gigs(
  p_worker_lat numeric default null,
  p_worker_lng numeric default null,
  p_max_distance_km integer default null,
  p_category text default null,
  p_work_mode text default null,
  p_search_query text default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  employer_id uuid,
  title text,
  description text,
  category text,
  work_mode text,
  public_area text,
  public_latitude numeric,
  public_longitude numeric,
  budget_amount numeric,
  currency text,
  status text,
  distance_km numeric,
  published_at timestamptz,
  created_at timestamptz,
  reasons text[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return query
  with computed_gigs as (
    select
      g.id,
      g.employer_id,
      g.title,
      g.description,
      g.category::text as category,
      g.work_mode::text as work_mode,
      g.public_area,
      g.public_latitude,
      g.public_longitude,
      g.budget_amount,
      g.currency::text as currency,
      g.status::text as status,
      public.calculate_distance_km(
        p_worker_lat,
        p_worker_lng,
        g.public_latitude,
        g.public_longitude
      ) as computed_distance,
      g.published_at,
      g.created_at
    from public.gigs as g
    where g.status = 'published'
      and (
        p_category is null
        or p_category = 'all'
        or g.category = p_category
      )
      and (
        p_work_mode is null
        or p_work_mode = 'all'
        or g.work_mode = p_work_mode
      )
      and (
        p_search_query is null
        or trim(p_search_query) = ''
        or g.title ilike ('%' || trim(p_search_query) || '%')
        or g.description ilike ('%' || trim(p_search_query) || '%')
        or coalesce(g.public_area, '') ilike ('%' || trim(p_search_query) || '%')
      )
  )
  select
    cg.id,
    cg.employer_id,
    cg.title,
    cg.description,
    cg.category,
    cg.work_mode,
    cg.public_area,
    cg.public_latitude,
    cg.public_longitude,
    cg.budget_amount,
    cg.currency,
    cg.status,
    cg.computed_distance as distance_km,
    cg.published_at,
    cg.created_at,
    array_remove(array[
      case when cg.work_mode = 'remote' then 'Remote - work from anywhere' else null end,
      case when cg.computed_distance is not null and cg.computed_distance <= 5.0 then 'Within 5 km of you' else null end,
      case when cg.computed_distance is not null and cg.computed_distance > 5.0 and cg.computed_distance <= 15.0 then 'Within 15 km of you' else null end,
      case when cg.published_at >= (now() - interval '48 hours') then 'Recently posted' else null end
    ], null) as reasons
  from computed_gigs as cg
  where (
    p_max_distance_km is null
    or cg.work_mode = 'remote'
    or (cg.computed_distance is not null and cg.computed_distance <= p_max_distance_km)
  )
  order by
    case when cg.computed_distance is not null then 0 else 1 end,
    cg.computed_distance asc nulls last,
    cg.published_at desc nulls last
  limit greatest(1, least(coalesce(p_limit, 20), 100))
  offset greatest(0, coalesce(p_offset, 0));
end;
$$;

revoke all on function public.calculate_distance_km(numeric, numeric, numeric, numeric) from public;
grant execute on function public.calculate_distance_km(numeric, numeric, numeric, numeric) to authenticated;

revoke all on function public.discover_gigs(numeric, numeric, integer, text, text, text, integer, integer) from public;
grant execute on function public.discover_gigs(numeric, numeric, integer, text, text, text, integer, integer) to authenticated;
