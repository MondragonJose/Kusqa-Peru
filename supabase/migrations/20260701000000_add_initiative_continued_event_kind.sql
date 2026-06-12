-- KUSQA Phase 4D.1: Add initiative.continued civic_event_kind
--
-- Additive enum value for the continue_initiative RPC.
-- TOP-LEVEL ALTER TYPE (NOT inside a DO block) so it is transaction-safe.
--
-- IDEMPOTENT:  Yes (IF NOT EXISTS).
-- REVERSIBLE:  No — enum values cannot be removed; flag-off neutralizes the path.

ALTER TYPE public.civic_event_kind ADD VALUE IF NOT EXISTS 'initiative.continued';
