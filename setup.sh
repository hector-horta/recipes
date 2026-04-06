#!/bin/bash
# ============================================================
# Cross-Platform Docker Setup Script
# ============================================================
# Use this script when syncing code between Windows, macOS, or Linux
# to avoid node_modules, permissions, and database issues.
#
# Usage: ./setup.sh
# ============================================================

set -e

echo "=========================================="
echo " Docker Cross-Platform Setup"
echo "=========================================="

# Step 1: Backup PostgreSQL database
echo ""
echo "Step 1: Backing up PostgreSQL database..."
mkdir -p backend/ingest_logs
docker compose exec -T postgres pg_dumpall -U "${POSTGRES_USER:-wati_user}" > backend/ingest_logs/postgres_backup_$(date +%Y%m%d_%H%M%S).sql
echo "Backup created successfully."

# Step 2: Stop all containers
echo ""
echo "Step 2: Stopping all containers..."
docker compose down

# Step 3: Remove problematic anonymous volumes and rebuild
echo ""
echo "Step 3: Removing old volumes (node_modules, etc.)..."
docker compose down -v

# Step 4: Rebuild images without cache
echo ""
echo "Step 4: Rebuilding Docker images..."
docker compose build --no-cache

# Step 5: Start all containers
echo ""
echo "Step 5: Starting all containers..."
docker compose up -d

# Step 6: Wait for PostgreSQL to be ready
echo ""
echo "Step 6: Waiting for PostgreSQL to be ready..."
sleep 10

# Step 7: Restore PostgreSQL backup
echo ""
echo "Step 7: Restoring PostgreSQL database from backup..."
BACKUP_FILE=$(ls -t backend/ingest_logs/postgres_backup_*.sql 2>/dev/null | head -1)
if [ -n "$BACKUP_FILE" ]; then
    docker compose exec -T postgres psql -U "${POSTGRES_USER:-wati_user}" -d postgres < "$BACKUP_FILE"
    echo "Database restored successfully."
else
    echo "No backup file found. Skipping database restore."
fi

# Step 8: Restart Umami (needs the database to exist)
echo ""
echo "Step 8: Restarting Umami container..."
docker compose restart umami

# Step 9: Show status
echo ""
echo "Step 9: Container status..."
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
