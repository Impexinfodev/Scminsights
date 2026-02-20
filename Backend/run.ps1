# SCM-INSIGHTS Backend - run script
# Usage: .\run.ps1
# Ensure .env is set with correct POSTGRES_* and WHITELISTED_ADMINS.

Set-Location $PSScriptRoot

Write-Host "Creating database (if not exists)..." -ForegroundColor Cyan
python -m tools.create_db
if ($LASTEXITCODE -ne 0) {
    Write-Host "Database create failed. Check POSTGRES_DB_* in .env and that the server allows your connection." -ForegroundColor Yellow
    exit 1
}

Write-Host "Initializing tables..." -ForegroundColor Cyan
python -m tools.init_db
if ($LASTEXITCODE -ne 0) {
    Write-Host "Init DB failed." -ForegroundColor Red
    exit 1
}

Write-Host "Starting SCM-INSIGHTS backend..." -ForegroundColor Green
python app.py
