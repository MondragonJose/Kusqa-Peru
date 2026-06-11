-- Unify proposal_comments into a generic initiative wall.
--
-- Evolves the existing table so both missions and proposals can use it.
-- No new table; pure schema evolution.

-- 1. Add initiative_type discriminator
ALTER TABLE proposal_comments
  ADD COLUMN initiative_type TEXT NOT NULL DEFAULT 'proposal'
  CHECK (initiative_type IN ('proposal', 'mission'));

-- 2. Drop the FK constraint so mission IDs are accepted
ALTER TABLE proposal_comments
  DROP CONSTRAINT proposal_comments_proposal_id_fkey;

-- 3. Rename proposal_id to initiative_id (semantic widening)
ALTER TABLE proposal_comments
  RENAME COLUMN proposal_id TO initiative_id;

-- 4. Rebuild indexes for the new column name
DROP INDEX IF EXISTS idx_proposal_comments_proposal_created;
CREATE INDEX idx_initiative_comments_initiative_created
  ON proposal_comments (initiative_id, created_at ASC);

-- 5. Update the RLS policies to use initiative_id
DROP POLICY IF EXISTS "Anyone can read non-deleted comments" ON proposal_comments;
DROP POLICY IF EXISTS "Authenticated users can insert own comments" ON proposal_comments;
DROP POLICY IF EXISTS "Users can update own non-deleted comments" ON proposal_comments;
DROP POLICY IF EXISTS "Users can soft-delete own comments" ON proposal_comments;

CREATE POLICY "Anyone can read non-deleted comments"
  ON proposal_comments FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can insert own comments"
  ON proposal_comments FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());

CREATE POLICY "Users can update own non-deleted comments"
  ON proposal_comments FOR UPDATE
  USING (user_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Users can soft-delete own comments"
  ON proposal_comments FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 6. Update the civic event trigger to include initiative_type
CREATE OR REPLACE FUNCTION trg_fanout_proposal_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM append_civic_event(
    NEW.user_id,
    'proposal.comment_added',
    jsonb_build_object(
      'comment_id', NEW.id,
      'initiative_id', NEW.initiative_id,
      'initiative_type', NEW.initiative_type,
      'is_reply', NEW.parent_comment_id IS NOT NULL
    )
  );
  RETURN NEW;
END;
$$;
