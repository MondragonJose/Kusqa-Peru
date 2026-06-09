#!/usr/bin/env bash
# KUSQA backup script — Database (public schema) + Storage buckets
# Requires: supabase CLI, psql, curl, jq
# Usage:
#   ./scripts/backup.sh                  # full backup (db + both buckets)
#   ./scripts/backup.sh --db-only        # database only
#   ./scripts/backup.sh --storage-only   # storage buckets only
#   ./scripts/backup.sh --restore <dir>  # restore from backup directory

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="${PROJECT_DIR}/.backups/${TIMESTAMP}"
LOG_FILE="${BACKUP_DIR}/backup.log"

# ── Config (override via env vars) ──────────────────────────────────────────
SUPABASE_PROJECT_REF="${SUPABASE_PROJECT_REF:-}"
SUPABASE_DB_PASSWORD="${SUPABASE_DB_PASSWORD:-}"
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"
SUPABASE_URL="${SUPABASE_URL:-}"

# Storage bucket names (from migrations)
BUCKET_MISSION_EVIDENCE="mission-evidence"
BUCKET_PROPOSAL_IMAGES="proposal-images"

# ── Helpers ─────────────────────────────────────────────────────────────────
log()  { echo "[$(date '+%H:%M:%S')] $*" | tee -a "$LOG_FILE"; }
error() { log "ERROR: $*"; exit 1; }

require_var() {
  local var_name="$1"
  local var_value="$2"
  if [[ -z "$var_value" ]]; then
    error "Missing required env var: ${var_name}. Set it or create a .env.backup file."
  fi
}

# ── Phase 1: Database backup via supabase CLI ───────────────────────────────
backup_database() {
  log "=== Database backup ==="

  local db_url="postgresql://postgres.${SUPABASE_PROJECT_REF}:${SUPABASE_DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
  local dump_dir="${BACKUP_DIR}/db"
  mkdir -p "$dump_dir"

  log "Dumping roles..."
  supabase db dump --db-url "$db_url" -f "${dump_dir}/roles.sql" --role-only 2>>"$LOG_FILE"

  log "Dumping schema..."
  supabase db dump --db-url "$db_url" -f "${dump_dir}/schema.sql" 2>>"$LOG_FILE"

  log "Dumping data..."
  supabase db dump --db-url "$db_url" -f "${dump_dir}/data.sql" --use-copy --data-only \
    -x "storage.buckets" -x "storage.objects" -x "storage.migrations" \
    -x "supabase_realtime.subscription" \
    2>>"$LOG_FILE"

  log "Dumping storage metadata (buckets + objects RLS schema)..."
  pg_dump --no-owner --no-acl -n storage \
    -d "$db_url" -f "${dump_dir}/storage_metadata.sql" 2>>"$LOG_FILE" || true

  log "Database backup complete — ${dump_dir}"
  echo "  roles.sql:      $(wc -c < "${dump_dir}/roles.sql") bytes"
  echo "  schema.sql:     $(wc -c < "${dump_dir}/schema.sql") bytes"
  echo "  data.sql:       $(wc -c < "${dump_dir}/data.sql") bytes"
}

# ── Phase 2: Storage backup via Supabase REST API ────────────────────────────
backup_storage_bucket() {
  local bucket_name="$1"
  local dest_dir="${BACKUP_DIR}/storage/${bucket_name}"

  log "Backing up storage bucket: ${bucket_name}"
  mkdir -p "$dest_dir"

  local api_url="${SUPABASE_URL}/storage/v1/object/list/${bucket_name}"

  # List all objects (paginated)
  local offset=0
  local limit=200
  local total=0

  while true; do
    local response
    response=$(curl -s -X POST "$api_url" \
      -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
      -H "Content-Type: application/json" \
      -d "{\"limit\":${limit},\"offset\":${offset},\"sortBy\":{\"column\":\"name\",\"order\":\"asc\"}}" \
      --max-time 30)

    # Count objects in response
    local count
    count=$(echo "$response" | jq 'length' 2>/dev/null || echo 0)
    if [[ "$count" -eq 0 ]]; then
      break
    fi

    # Download each object
    for name in $(echo "$response" | jq -r '.[].name'); do
      local file_dir
      file_dir="$(dirname "${dest_dir}/${name}")"
      mkdir -p "$file_dir"

      curl -s -o "${dest_dir}/${name}" \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
        "${SUPABASE_URL}/storage/v1/object/${bucket_name}/${name}" \
        --max-time 60 &

      total=$((total + 1))
    done

    # Wait for batch to finish before next page
    wait

    offset=$((offset + limit))
    log "  Downloaded ${total} objects so far from ${bucket_name}..."
  done

  log "Bucket '${bucket_name}' backup complete — ${total} objects"
}

backup_storage() {
  log "=== Storage backup ==="

  mkdir -p "${BACKUP_DIR}/storage"

  if [[ -z "$SUPABASE_SERVICE_ROLE_KEY" ]]; then
    log "WARNING: No SUPABASE_SERVICE_ROLE_KEY set — skipping storage backup"
    log "Storage backup requires service_role key for admin access to private buckets."
    return
  fi

  backup_storage_bucket "$BUCKET_MISSION_EVIDENCE"
  backup_storage_bucket "$BUCKET_PROPOSAL_IMAGES"

  log "Storage backup complete — ${BACKUP_DIR}/storage/"
}

# ── Phase 3: Generate backup manifest ────────────────────────────────────────
generate_manifest() {
  cat > "${BACKUP_DIR}/manifest.txt" <<EOF
KUSQA Backup
Date:        $(date -u '+%Y-%m-%d %H:%M:%S UTC')
Project Ref: ${SUPABASE_PROJECT_REF}
Contents:
EOF
  echo "  - Database: schema + roles + public data" >> "${BACKUP_DIR}/manifest.txt"
  echo "  - Storage: ${BUCKET_MISSION_EVIDENCE}, ${BUCKET_PROPOSAL_IMAGES}" >> "${BACKUP_DIR}/manifest.txt"
  echo "  - Not included: auth.users (managed by Supabase Auth)," >> "${BACKUP_DIR}/manifest.txt"
  echo "    supabase_realtime subscriptions, storage.objects metadata" >> "${BACKUP_DIR}/manifest.txt"
  echo "" >> "${BACKUP_DIR}/manifest.txt"
  du -sh "${BACKUP_DIR}"/* >> "${BACKUP_DIR}/manifest.txt" 2>/dev/null || true
}

# ── Restore from backup ──────────────────────────────────────────────────────
restore_backup() {
  local restore_dir="$1"
  if [[ ! -d "$restore_dir" ]]; then
    error "Backup directory not found: $restore_dir"
  fi

  log "=== Restoring from ${restore_dir} ==="
  require_var "SUPABASE_PROJECT_REF" "$SUPABASE_PROJECT_REF"
  require_var "SUPABASE_DB_PASSWORD" "$SUPABASE_DB_PASSWORD"

  local db_url="postgresql://postgres.${SUPABASE_PROJECT_REF}:${SUPABASE_DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

  # Restore database
  if [[ -f "${restore_dir}/db/roles.sql" ]]; then
    log "Restoring roles..."
    psql --single-transaction --variable ON_ERROR_STOP=1 \
      -f "${restore_dir}/db/roles.sql" "$db_url" 2>>"$LOG_FILE"
  fi

  if [[ -f "${restore_dir}/db/schema.sql" ]]; then
    log "Restoring schema..."
    psql --single-transaction --variable ON_ERROR_STOP=1 \
      -f "${restore_dir}/db/schema.sql" "$db_url" 2>>"$LOG_FILE"
  fi

  if [[ -f "${restore_dir}/db/data.sql" ]]; then
    log "Restoring data (disabling triggers)..."
    psql --single-transaction --variable ON_ERROR_STOP=1 \
      -c "SET session_replication_role = replica;" \
      -f "${restore_dir}/db/data.sql" "$db_url" 2>>"$LOG_FILE"
  fi

  # Restore storage objects (requires service role key)
  if [[ -d "${restore_dir}/storage" && -n "$SUPABASE_SERVICE_ROLE_KEY" ]]; then
    log "Restoring storage objects..."
    for bucket_dir in "${restore_dir}/storage"/*/; do
      local bucket_name
      bucket_name="$(basename "$bucket_dir")"
      log "  Uploading to bucket: ${bucket_name}"

      find "$bucket_dir" -type f | while read -r file; do
        local object_path
        object_path="${file#"${bucket_dir}"}"
        curl -s -X POST \
          "${SUPABASE_URL}/storage/v1/object/${bucket_name}/${object_path}" \
          -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
          -H "Content-Type: application/octet-stream" \
          --data-binary "@${file}" \
          --max-time 120
      done
    done
  fi

  log "Restore complete."
}

# ── Main ─────────────────────────────────────────────────────────────────────
main() {
  local mode="${1:-full}"

  mkdir -p "$BACKUP_DIR"

  case "$mode" in
    --db-only|-d)
      require_var "SUPABASE_PROJECT_REF" "$SUPABASE_PROJECT_REF"
      require_var "SUPABASE_DB_PASSWORD" "$SUPABASE_DB_PASSWORD"
      backup_database
      generate_manifest
      ;;
    --storage-only|-s)
      require_var "SUPABASE_URL" "$SUPABASE_URL"
      backup_storage
      generate_manifest
      ;;
    --restore|-r)
      shift
      restore_backup "${1:-}"
      ;;
    full|--full|-f|"")
      require_var "SUPABASE_PROJECT_REF" "$SUPABASE_PROJECT_REF"
      require_var "SUPABASE_DB_PASSWORD" "$SUPABASE_DB_PASSWORD"
      require_var "SUPABASE_URL" "$SUPABASE_URL"
      backup_database
      backup_storage
      generate_manifest
      log "Full backup complete — ${BACKUP_DIR}"
      ;;
    *)
      echo "Usage: $0 [--db-only | --storage-only | --full | --restore <dir>]"
      echo ""
      echo "Requires env vars: SUPABASE_PROJECT_REF, SUPABASE_DB_PASSWORD"
      echo "For storage: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
      exit 1
      ;;
  esac
}

main "$@"
