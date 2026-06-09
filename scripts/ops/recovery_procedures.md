# KUSQA Recovery Procedures

## Backup Basics

| What | How | Frequency |
|------|-----|-----------|
| Database (public schema) | `./scripts/backup.sh --db-only` | Before any migration, weekly minimum |
| Storage buckets | `./scripts/backup.sh --storage-only` | Weekly |
| Full backup | `./scripts/backup.sh` | Before schema changes |

Backups go to `.backups/<timestamp>/` (gitignored).

---

## Scenario 1: Failed Migration

### Symptoms
- `supabase db push` or manual SQL fails mid-file
- Partial state: some tables created/altered, others not
- App errors referencing missing columns or tables

### Recovery

```bash
# 1. Identify the failed migration
ls -t .backups/ | head -1

# 2. Restore the last full backup
./scripts/backup.sh --restore .backups/<latest>

# 3. Re-apply all successful migrations up to the failed one
#    (via Supabase dashboard SQL editor or supabase db push)
```

### Prevention
- Wrap all new migrations in `BEGIN` / `COMMIT` (see 18B finding)
- Test migrations on a staging DB first
- Take a backup before each migration run

---

## Scenario 2: Accidental Data Deletion

### Symptoms
- Rows missing from `missions`, `proposals`, `profiles`, etc.
- User reports "my mission is gone"

### Recovery

```bash
# 1. Find the most recent backup before the deletion
ls -lt .backups/ | head -5

# 2. Extract only the affected table's data from backup
psql -d "$SUPABASE_DB_URL" -f .backups/<ts>/db/data.sql \
  --command "COPY public.missions TO '/tmp/missions_recovery.csv' CSV" \
  2>/dev/null

# 3. Selective restore — insert only the missing rows
#    (Use a script to diff current vs. backup and insert missing)
```

If full restore is acceptable:
```bash
./scripts/backup.sh --restore .backups/<timestamp>
```

### Prevention
- No destructive `DELETE` or `DROP` in application code
- Use `soft_delete` patterns where possible
- RLS prevents mass deletion by non-owners

---

## Scenario 3: Corrupted Uploads

### Symptoms
- Images in `mission-evidence` or `proposal-images` fail to load
- Signed URLs return 400/403
- Evidence rows have `storage_path` but no actual object

### Recovery

```bash
# 1. Identify orphaned evidence rows
psql -d "$SUPABASE_DB_URL" -c "
  SELECT id, storage_path, created_at
  FROM mission_evidence me
  WHERE NOT EXISTS (
    SELECT 1 FROM storage.objects o
    WHERE o.name = me.storage_path
  );
"

# 2. Re-upload files from backup
#    Each file under .backups/<ts>/storage/mission-evidence/<path>

# 3. Regenerate signed URLs
#    (Users will get fresh URLs on next evidence fetch)
```

### Prevention
- `upsert: false` prevents accidental overwrite
- 3-attempt retry with backoff in evidence upload
- Signed URLs are 1-hour TTL (auto-renews on fetch)

---

## Scenario 4: Broken RLS Policies

### Symptoms
- Authenticated users get 401/403 on valid queries
- Users see data they shouldn't
- Evidence uploads fail with "new row violates row-level security"

### Recovery

```bash
# 1. Disable RLS on the affected table only (temporary)
psql -d "$SUPABASE_DB_URL" -c "ALTER TABLE public.mission_evidence DISABLE ROW LEVEL SECURITY;"

# 2. Fix the broken policy SQL (apply via migration)
#    Supabase dashboard > SQL Editor > paste corrected policy

# 3. Re-enable RLS
psql -d "$SUPABASE_DB_URL" -c "ALTER TABLE public.mission_evidence ENABLE ROW LEVEL SECURITY;"
```

If full RLS audit needed:
```bash
psql -d "$SUPABASE_DB_URL" -f scripts/ops/verify_rls.sql
```

### Prevention
- Always test new policies on a staging DB
- Use `DROP POLICY IF EXISTS` before `CREATE POLICY` for idempotency
- Verify policy coverage after any migration affecting RLS

---

## Scenario 5: Realtime Outage

### Symptoms
- `kusqa-sync` channel errors
- Live mission updates not appearing
- "Realtime channel error" in console

### Recovery

1. **Check Supabase status**: https://status.supabase.com
2. **Reconnect client**: Users should refresh or re-connect automatically (client has reconnect logic)
3. **Verify realtime publication**:
```sql
SELECT * FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
```
If tables missing from publication:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE missions;
ALTER PUBLICATION supabase_realtime ADD TABLE civic_events;
ALTER PUBLICATION supabase_realtime ADD TABLE user_notifications;
```

4. **Verify channel subscriptions** in app:
   - Each user gets exactly 1 channel: `kusqa-sync:${userId}`
   - With 3 subscriptions: `missions` (INSERT/UPDATE), `civic_events` (INSERT), `user_notifications` (INSERT)

### Prevention
- `VITE_USE_REALTIME_SYNC=false` is the kill-switch (feature flag)
- App falls back to polling when realtime is disabled
- 1 channel per user keeps resource usage bounded
- Use `do $$ ... exception when duplicate_object` guards in migration for publication changes

---

## Scenario 6: Complete Project Restore

### Full restore to new Supabase project

```bash
# 1. Create new Supabase project
# 2. Set env vars:
export SUPABASE_PROJECT_REF="new-ref"
export SUPABASE_DB_PASSWORD="new-password"
export SUPABASE_SERVICE_ROLE_KEY="new-key"

# 3. Run all migrations
#    (Manually apply each .sql file in supabase/migrations/ via SQL editor)

# 4. Restore data
./scripts/backup.sh --restore .backups/<latest>

# 5. Re-verify RLS
psql -d "$SUPABASE_DB_URL" -f scripts/ops/verify_rls.sql

# 6. Update .env with new project values
# 7. Re-deploy
npm run build && npm run deploy
```

> ⚠️ **Important:** Auth users are not included in `pg_dump` (managed by Supabase Auth). Users will need to re-authenticate or be re-created. After restore, verify that `auth.users` references in `profiles` table match existing auth users.

---

## Post-Recovery Verification

After any recovery operation, run:
```bash
psql -d "$SUPABASE_DB_URL" -f scripts/ops/verify_consistency.sql
```

This detects:
- Duplicate `user_missions` rows
- Completed missions missing XP
- Evidence rows without storage objects
- Rogue mission events
- Pending moderation queue
