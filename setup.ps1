# ============================================================
# Cross-Platform Docker Setup Script (PowerShell)
# ============================================================
# Use this script when syncing code between Windows, macOS, or Linux
# to avoid node_modules, permissions, and database issues.
#
# IMPORTANT SAFETY:
#   - Data volumes (postgres_data, public_recipes, ingest_logs) are NEVER deleted
#   - Recipe images are backed up before any operation
#   - Only node_modules volumes are removed (safe to recreate)
#
# Usage: .\setup.ps1
# ============================================================

$ErrorActionPreference = "Stop"

# ============================================================
# Configuration - PROTECTED VOLUMES (NEVER DELETE)
# ============================================================
$PROTECTED_VOLUMES = @("recipes_postgres_data", "recipes_public_recipes", "recipes_ingest_logs", "recipes_redis_data")

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Docker Cross-Platform Setup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Step 1: Backup PostgreSQL database
Write-Host ""
Write-Host "Step 1: Backing up PostgreSQL database..." -ForegroundColor Yellow
if (!(Test-Path "backend/ingest_logs")) {
    New-Item -ItemType Directory -Path "backend/ingest_logs" -Force | Out-Null
}
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "backend/ingest_logs/postgres_backup_$timestamp.sql"
docker compose exec -T postgres pg_dumpall -U $env:POSTGRES_USER > $backupFile
Write-Host "  Database backup: $backupFile" -ForegroundColor Green

# Step 2: Backup recipe images
Write-Host ""
Write-Host "Step 2: Backing up recipe images..." -ForegroundColor Yellow
$imagesBackup = "backend/ingest_logs/recipes_images_$timestamp.tar.gz"
docker run --rm -v recipes_public_recipes:/source:ro -v "${PWD}\backend\ingest_logs:/backup" alpine tar czf "/backup/recipes_images_$timestamp.tar.gz" -C /source . 2>$null
if ($LASTEXITCODE -eq 0 -and (Test-Path $imagesBackup)) {
    $fileSize = (Get-Item $imagesBackup).Length
    if ($fileSize -gt 100) {
        Write-Host "  Recipe images backup: $imagesBackup ($([math]::Round($fileSize/1KB, 1)) KB)" -ForegroundColor Green
    } else {
        Write-Host "  Recipe images volume is empty, skipping." -ForegroundColor Yellow
        Remove-Item $imagesBackup -ErrorAction SilentlyContinue
    }
} else {
    Write-Host "  Recipe images volume is empty or unavailable, skipping." -ForegroundColor Yellow
}

# Step 3: Stop all containers
Write-Host ""
Write-Host "Step 3: Stopping all containers..." -ForegroundColor Yellow
docker compose down

# Step 4: Remove ONLY node_modules volumes (safe to recreate)
Write-Host ""
Write-Host "Step 4: Removing node_modules volumes..." -ForegroundColor Yellow
docker volume rm recipes_frontend_node_modules 2>$null
docker volume rm recipes_backend_node_modules 2>$null
Write-Host "  NOTE: Data volumes are PRESERVED:" -ForegroundColor Cyan
foreach ($vol in $PROTECTED_VOLUMES) {
    Write-Host "    [PROTECTED] $vol" -ForegroundColor Green
}

# Step 5: Rebuild images without cache
Write-Host ""
Write-Host "Step 5: Rebuilding Docker images..." -ForegroundColor Yellow
docker compose build --no-cache

# Step 6: Start all containers
Write-Host ""
Write-Host "Step 6: Starting all containers..." -ForegroundColor Yellow
docker compose up -d

# Step 7: Wait for PostgreSQL to be ready
Write-Host ""
Write-Host "Step 7: Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Step 8: Restore PostgreSQL backup (only if database was recreated)
Write-Host ""
Write-Host "Step 8: Checking if database restore is needed..." -ForegroundColor Yellow
$latestBackup = Get-ChildItem "backend/ingest_logs/postgres_backup_*.sql" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($latestBackup) {
    $dbExists = docker compose exec -T postgres psql -U $env:POSTGRES_USER -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='wati_db'" 2>$null
    if ($dbExists -ne "1") {
        Write-Host "  Database 'wati_db' not found, restoring from backup..." -ForegroundColor Yellow
        Get-Content $latestBackup.FullName | docker compose exec -T postgres psql -U $env:POSTGRES_USER -d postgres
        Write-Host "  Database restored successfully." -ForegroundColor Green
    } else {
        Write-Host "  Database exists, no restore needed." -ForegroundColor Green
    }
}

# Step 9: Restart Umami (needs the database to exist)
Write-Host ""
Write-Host "Step 9: Restarting Umami container..." -ForegroundColor Yellow
docker compose restart umami

# Step 10: Show status
Write-Host ""
Write-Host "Step 10: Container status..." -ForegroundColor Yellow
docker compose ps

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Setup complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Common endpoints:" -ForegroundColor White
Write-Host "  Frontend:  http://localhost:5173"
Write-Host "  Backend:   http://localhost:5001"
Write-Host "  Dozzle:    http://localhost:8080"
Write-Host "  Umami:     http://localhost:3000"
Write-Host ""
Write-Host "Backups saved in backend/ingest_logs/" -ForegroundColor Cyan
