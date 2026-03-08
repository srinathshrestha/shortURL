#!/usr/bin/env bash
# migrate.sh — Apply pending PostgreSQL migrations
# Reads DATABASE_URL from environment. Skips already-applied migrations.

set -e

# Use DATABASE_URL or POSTGRES_DSN (project uses POSTGRES_DSN)
DB_URL="${DATABASE_URL:-$POSTGRES_DSN}"
if [ -z "$DB_URL" ]; then
    echo "Error: DATABASE_URL or POSTGRES_DSN must be set"
    exit 1
fi

# Dir of this script — migrations live alongside it
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR/migrations"

if [ ! -d "$MIGRATIONS_DIR" ]; then
    echo "Error: migrations directory not found: $MIGRATIONS_DIR"
    exit 1
fi

# Ensure schema_migrations exists (create if first run)
psql "$DB_URL" -v ON_ERROR_STOP=1 -c "
    CREATE TABLE IF NOT EXISTS schema_migrations (
        version     TEXT PRIMARY KEY,
        applied_at  TIMESTAMPTZ DEFAULT NOW()
    );
" 2>/dev/null || true

# Loop migrations in sorted order
for f in "$MIGRATIONS_DIR"/*.sql; do
    [ -f "$f" ] || continue
    VERSION=$(basename "$f" .sql)

    # Skip if already applied
    if psql "$DB_URL" -tAc "SELECT 1 FROM schema_migrations WHERE version = '$VERSION';" 2>/dev/null | grep -q 1; then
        echo "Skip $VERSION (already applied)"
        continue
    fi

    # Extract up block (between -- migrate:up and -- migrate:down)
    echo "Applying $VERSION..."
    UP_SQL=$(sed -n '/^-- migrate:up$/,/^-- migrate:down$/p' "$f" | sed '1d;$d')
    echo "$UP_SQL" | psql "$DB_URL" -v ON_ERROR_STOP=1
    psql "$DB_URL" -v ON_ERROR_STOP=1 -c "INSERT INTO schema_migrations (version) VALUES ('$VERSION');"
    echo "Done $VERSION"
done

echo "Migrations complete."
