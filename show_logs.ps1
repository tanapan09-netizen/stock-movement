Write-Host "Fetching latest application logs..."
docker-compose -f docker-compose.prod.yml logs --tail=100 app

Write-Host "`nFetching latest database logs..."
docker-compose -f docker-compose.prod.yml logs --tail=50 db

Write-Host "`nDone."
