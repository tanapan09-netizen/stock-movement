# setup-cloud-sql-proxy.ps1

$ProxyUrl = "https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.14.2/cloud-sql-proxy.x64.exe"
$ProxyExe = "cloud-sql-proxy.exe"
$InstanceConnectionName = "swift-rite-487105-j7:us-central1:stock-db"
$LocalPort = 3307 # Using 3307 to avoid conflict with local MySQL on 3306

Write-Host "--- Cloud SQL Proxy Setup & Migration ---" -ForegroundColor Cyan

# 1. Check/Download Proxy
if (-not (Test-Path $ProxyExe)) {
    Write-Host "Downloading Cloud SQL Proxy..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $ProxyUrl -OutFile $ProxyExe
    Write-Host "Download complete." -ForegroundColor Green
}
else {
    Write-Host "Cloud SQL Proxy found." -ForegroundColor Green
}

# 2. Start Proxy in Background
Write-Host "Starting Cloud SQL Proxy on port $LocalPort..." -ForegroundColor Yellow
$ProxyProcess = Start-Process -FilePath .\$ProxyExe -ArgumentList "$InstanceConnectionName --port $LocalPort" -PassThru -NoNewWindow
Start-Sleep -Seconds 5 # Wait for proxy to start

if ($ProxyProcess.HasExited) {
    Write-Error "Cloud SQL Proxy failed to start!"
    exit 1
}

Write-Host "Proxy is running (PID: $($ProxyProcess.Id))." -ForegroundColor Green

# 3. Set Environment Variable
$env:DATABASE_URL = "mysql://appuser:AppPass2024@127.0.0.1:$LocalPort/stock_db"
Write-Host "DATABASE_URL set to: $env:DATABASE_URL" -ForegroundColor Gray

try {
    # 4. Run Migration
    Write-Host "Running: npx prisma migrate deploy" -ForegroundColor Cyan
    npx prisma migrate deploy

    if ($LASTEXITCODE -eq 0) {
        # 5. Run Seed
        Write-Host "Running: node prisma/reset-smart.js" -ForegroundColor Cyan
        node prisma/reset-smart.js
    }
    else {
        Write-Error "Migration failed!"
    }

}
finally {
    # 6. Cleanup
    Write-Host "Stopping Cloud SQL Proxy..." -ForegroundColor Yellow
    Stop-Process -Id $ProxyProcess.Id -Force
    Write-Host "Done." -ForegroundColor Green
}
