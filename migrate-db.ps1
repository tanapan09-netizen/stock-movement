# Set Database URL for local proxy connection
$env:DATABASE_URL="mysql://appuser:AppPass2024@127.0.0.1:3306/stock_db"

Write-Host "--- Starting Database Migration ---" -ForegroundColor Cyan
Write-Host "Target: Cloud SQL (via Proxy)" -ForegroundColor Yellow

# 1. Apply Migrations
Write-Host "1. Running: npx prisma migrate deploy" -ForegroundColor Green
npx prisma migrate deploy

if ($LASTEXITCODE -ne 0) {
    Write-Error "Migration failed!"
    exit 1
}

# 2. Seed Admin User
Write-Host "2. Running: node prisma/reset-smart.js" -ForegroundColor Green
node prisma/reset-smart.js

Write-Host "--- MIGRATION COMPLETE ---" -ForegroundColor Cyan
Write-Host "You can now login at the website." -ForegroundColor Green
