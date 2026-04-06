#!/bin/bash
# ============================================================
# Cross-Platform Docker Setup Script (Bash)
# ============================================================
# Use this script when syncing code between Windows, macOS, or Linux
# to avoid node_modules, permissions, and database issues.
#
# IMPORTANT SAFETY:
#   - Data volumes (postgres_data, public_recipes, ingest_logs) are NEVER deleted
#   - Recipe images are backed up before any operation
#   - Only node_modules volumes are removed (safe to recreate)
#
# Usage: ./setup.sh
# ============================================================

set -e

# ============================================================
# Configuration - PROTECTED VOLUMES (NEVER DELETE)
# ============================================================
PROTECTED_VOLUMES=("recipes_postgres_data" "recipes_public_recipes" "recipes_ingest_logs" "recipes_redis_data")

echo "=========================================="
echo " Docker Cross-Platform Setup"
echo "=========================================="

# Step 1: Backup PostgreSQL database
echo ""
echo "Step 1: Backing up PostgreSQL database..."
mkdir -p backend/ingest_logs
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backend/ingest_logs/postgres_backup_${TIMESTAMP}.sql"
docker compose exec -T postgres pg_dumpall -U "${POSTGRES_USER:-wati_user}" > "$BACKUP_FILE"
echo "  Database backup: $BACKUP_FILE"

# Step 2: Backup recipe images
echo ""
echo "Step 2: Backing up recipe images..."
IMAGES_BACKUP="backend/ingest_logs/recipes_images_${TIMESTAMP}.tar.gz"
docker run --rm \
  -v recipes_public_recipes:/source:ro \
  -v "$(pwd)/backend/ingest_logs:/backup" \
  alpine tar czf "/backup/recipes_images_${TIMESTAMP}.tar.gz" -C /source . 2>/dev/null || true

if [ -f "$IMAGES_BACKUP" ] && [ "$(stat -c%s "$IMAGES_BACKUP" 2>/dev/null || stat -f%z "$IMAGES_BACKUP" 2>/dev/null)" -gt 100 ]; then
  echo "  Recipe images backup: $IMAGES_BACKUP"
else
  echo "  Recipe images volume is empty or unavailable, skipping."
  rm -f "$IMAGES_BACKUP"
fi

# Step 3: Stop all containers
echo ""
echo "Step 3: Stopping all containers..."
docker compose down

# Step 4: Remove ONLY node_modules volumes (safe to recreate)
echo ""
echo "Step 4: Removing node_modules volumes..."
docker volume rm recipes_frontend_node_modules 2>/dev/null || true
docker volume rm recipes_backend_node_modules 2>/dev/null || true
echo "  NOTE: Data volumes are PRESERVED:"
for vol in "${PROTECTED_VOLUMES[@]}"; do
  echo "    [PROTECTED] $vol"
done

# Step 5: Rebuild images without cache
echo ""
echo "Step 5: Rebuilding Docker images..."
docker compose build --no-cache

# Step 6: Start all containers
echo ""
echo "Step 6: Starting all containers..."
docker compose up -d

# Step 7: Wait for PostgreSQL to be ready
echo ""
echo "Step 7: Waiting for PostgreSQL to be ready..."
sleep 10

# Step 8: Restore PostgreSQL backup (only if database was recreated)
echo ""
echo "Step 8: Checking if database restore is needed..."
LATEST_BACKUP=$(ls -t backend/ingest_logs/postgres_backup_*.sql 2>/dev/null | head -1)
if [ -n "$LATEST_BACKUP" ]; then
  DB_EXISTS=$(docker compose exec -T postgres psql -U "${POSTGRES_USER:-wati_user}" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='wati_db'" 2>/dev/null || echo "0")
  if [ "$DB_EXISTS" != "1" ]; then
    echo "  Database 'wati_db' not found, restoring from backup..."
    docker compose exec -T postgres psql -U "${POSTGRES_USER:-wati_user}" -d postgres < "$LATEST_BACKUP"
    echo "  Database restored successfully."
  else
    echo "  Database exists, no restore needed."
  fi
fi

# Step 9: Restart Umami (needs the database to exist)
echo ""
echo "Step 9: Restarting Umami container..."
docker compose restart umami

# Step 10: Show status
echo ""
echo "Step 10: Container status..."
docker compose ps

echo ""
echo "=========================================="
echo " Setup complete!"
echo "=========================================="
echo ""
echo "Common endpoints:"
echo "  Frontend:  http://localhost:5173"
echo "  Backend:   http://localhost:5001"
echo "  Dozzle:    http://localhost:8080"
echo "  Umami:     http://localhost:3000"
echo ""
echo "Backups saved in backend/ingest_logs/"
