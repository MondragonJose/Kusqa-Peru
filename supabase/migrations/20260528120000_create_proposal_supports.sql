-- Proposal supports — lightweight "like" / support system for proposals.
-- Each row represents one user supporting one proposal.
-- Supports are idempotent: UNIQUE(user_id, proposal_id) prevents duplicates.
-- Counts are derived via GROUP BY / COUNT — no denormalized counter needed.

create table if not exists public.proposal_supports (
  id uuid not null primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  created_at timestamptz not null default now(),

  constraint proposal_supports_user_proposal_unique unique (user_id, proposal_id)
);

-- Index for "get all proposals a user supports"
create index if not exists idx_proposal_supports_user_id
  on public.proposal_supports (user_id);

-- Index for "get all users who support a proposal"
create index if not exists idx_proposal_supports_proposal_id
  on public.proposal_supports (proposal_id);

-- Enable RLS
alter table public.proposal_supports enable row level security;

-- RLS: authenticated users can read all proposal_supports
create policy "Authenticated users can read all proposal_supports"
  on public.proposal_supports
  for select
  to authenticated
  using (true);

-- RLS: users can insert their own proposal_supports
create policy "Users can support proposals"
  on public.proposal_supports
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- RLS: users can delete their own proposal_supports
create policy "Users can unsupport proposals"
  on public.proposal_supports
  for delete
  to authenticated
  using (auth.uid() = user_id);
