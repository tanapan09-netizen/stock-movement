$ErrorActionPreference = "Continue"

Write-Host "1. Validating config..."
docker-compose -f docker-compose.prod.yml config
if ($LASTEXITCODE -ne 0) { Write-Error "Config Invalid!"; exit 1 }

Write-Host "`n2. Cleaning up..."
docker-compose -f docker-compose.prod.yml down --remove-orphans

Write-Host "`n3. Building images (Verbose)..."
docker-compose -f docker-compose.prod.yml build --no-cache

Write-Host "`n4. Starting containers..."
docker-compose -f docker-compose.prod.yml up -d

Write-Host "`n5. Waiting 15s for initialization..."
Start-Sleep -Seconds 15

Write-Host "`n6. Container Status (All):"
docker-compose -f docker-compose.prod.yml ps -a

Write-Host "`n7. App Logs (Last 100 lines):"
docker-compose -f docker-compose.prod.yml logs --tail=100 app

Write-Host "`n8. DB Logs (Last 50 lines):"
docker-compose -f docker-compose.prod.yml logs --tail=50 db

Write-Host "`nDone."
