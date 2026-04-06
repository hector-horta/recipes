# ============================================================
# Cross-Platform Docker Setup Script (PowerShell)
# ============================================================
# Use this script when syncing code between Windows, macOS, or Linux
# to avoid node_modules, permissions, and database issues.
#
# Usage: .\setup.ps1
# ============================================================

$ErrorActionPreference = "Stop"

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
Write-Host "Backup created successfully: $backupFile" -ForegroundColor Green

# Step 2: Stop all containers
Write-Host ""
Write-Host "Step 2: Stopping all containers..." -ForegroundColor Yellow
docker compose down

# Step 3: Remove problematic anonymous volumes and rebuild
Write-Host ""
Write-Host "Step 3: Removing old volumes (node_modules, etc.)..." -ForegroundColor Yellow
docker compose down -v

# Step 4: Rebuild images without cache
Write-Host ""
Write-Host "Step 4: Rebuilding Docker images..." -ForegroundColor Yellow
docker compose build --no-cache

# Step 5: Start all containers
Write-Host ""
Write-Host "Step 5: Starting all containers..." -ForegroundColor Yellow
docker compose up -d

# Step 6: Wait for PostgreSQL to be ready
Write-Host ""
Write-Host "Step 6: Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Step 7: Restore PostgreSQL backup
Write-Host ""
Write-Host "Step 7: Restoring PostgreSQL database from backup..." -ForegroundColor Yellow
$latestBackup = Get-ChildItem "backend/ingest_logs/postgres_backup_*.sql" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($latestBackup) {
    Get-Content $latestBackup.FullName | docker compose exec -T postgres psql -U $env:POSTGRES_USER -d postgres
    Write-Host "Database restored successfully." -ForegroundColor Green
} else {
    Write-Host "No backup file found. Skipping database restore." -ForegroundColor Red
}

# Step 8: Restart Umami (needs the database to exist)
Write-Host ""
Write-Host "Step 8: Restarting Umami container..." -ForegroundColor Yellow
docker compose restart umami

# Step 9: Show status
Write-Host ""
Write-Host "Step 9: Container status..." -ForegroundColor Yellow
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
