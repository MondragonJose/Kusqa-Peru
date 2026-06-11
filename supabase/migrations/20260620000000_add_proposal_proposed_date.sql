-- KUSQA: Add proposed_date to proposals
--
-- Adds a tentative action date for proposals (fecha tentativa de acción).
-- Used by computeProposalAnchor to produce richer temporal labels.
-- When NULL, falls back to created_at (existing behaviour).

alter table public.proposals
  add column if not exists proposed_date timestamptz;

comment on column public.proposals.proposed_date is 'Tentative action date set by the author. Used as the primary temporal anchor for the proposal card.';
