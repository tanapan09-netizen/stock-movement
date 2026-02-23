$projectName = "StockMovement_Install"
$exclude = @(
    ".next",
    "node_modules",
    "logs",
    ".git",
    "*.log",
    "backup_*.sql",
    "*.zip",
    "dist",
    "tmp"
)

$destPath = Join-Path $PWD "$projectName"
$zipPath = Join-Path $PWD "$projectName.zip"

# Clean up previous runs
if (Test-Path $destPath) { Remove-Item -Path $destPath -Recurse -Force }
if (Test-Path $zipPath) { Remove-Item -Path $zipPath -Force }

# Create destination folder
New-Item -Path $destPath -ItemType Directory | Out-Null

# Get relevant files
$files = Get-ChildItem -Path $PWD -Exclude $exclude

foreach ($file in $files) {
    # Custom exclusion logic because -Exclude on Get-ChildItem is shallow
    if ($file.Name -in $exclude) { continue }
    if ($file.Name -like "backup_*.sql") { continue }
    if ($file.Name -like "*.zip") { continue }
    if ($file.Name -eq "dist") { continue }
    if ($file.Name -eq "logs") { continue }
    if ($file.Name -eq ".next") { continue }
    if ($file.Name -eq "node_modules") { continue }

    Copy-Item -Path $file.FullName -Destination $destPath -Recurse -Force
}

# Zip the folder
Write-Host "Compressing files to $zipPath ..."
Compress-Archive -Path $destPath -DestinationPath $zipPath

# Cleanup temp folder
Remove-Item -Path $destPath -Recurse -Force

Write-Host "Package created successfully: $zipPath"
Write-Host "You can copy this zip file to another machine."
