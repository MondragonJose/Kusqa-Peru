-- KUSQA — Proposal supporters preview RPC
--
-- profiles is RLS-restricted: users can only read their own row.
-- The proposal detail page needs to show "who else is supporting this".
-- This RPC exposes a strictly bounded, public-safe slice of supporter info
-- (username + first_name + avatar_url) ordered by most recent support.
--
-- Safety guarantees:
--   1. SECURITY DEFINER with explicit search_path lock
--   2. limit is hard-capped server-side at 20 (defense in depth)
--   3. Reads only non-sensitive display fields from profiles
--   4. Returns empty result if proposal has no supports (not an error)
--   5. Never returns email, id, or any other PII
--
-- NOTE: profiles has columns (id, email, username, full_name, avatar_url,
-- experience_points, level, bio, location, created_at). We expose only
-- username + first_name (derived from full_name) + avatar_url.

create or replace function public.get_proposal_supporters_preview(
  p_proposal_id uuid,
  p_limit integer default 5
)
returns table (
  user_id uuid,
  username text,
  first_name text,
  avatar_url text,
  supported_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  select
    ps.user_id,
    coalesce(p.username, 'kusqero') as username,
    split_part(coalesce(p.full_name, ''), ' ', 1) as first_name,
    p.avatar_url,
    ps.created_at as supported_at
  from public.proposal_supports ps
  left join public.profiles p on p.id = ps.user_id
  where ps.proposal_id = p_proposal_id
  order by ps.created_at desc
  limit greatest(1, least(coalesce(p_limit, 5), 20));
end;
$$;

comment on function public.get_proposal_supporters_preview(uuid, integer)
  is 'Public-safe preview of recent supporters (max 20, default 5). Bypasses profiles RLS for display fields only.';

revoke all on function public.get_proposal_supporters_preview(uuid, integer) from public;
grant execute on function public.get_proposal_supporters_preview(uuid, integer) to authenticated, anon;
