Write-Host "🛠️ Building containers..."
docker-compose -f docker/docker-compose.yml build

Write-Host "🚀 Starting services..."
docker-compose -f docker/docker-compose.yml up