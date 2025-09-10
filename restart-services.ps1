Write-Host "Starting MicroStore Services..." -ForegroundColor Green
Write-Host ""

Write-Host "Starting Gateway Service..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd gateway; npm run dev"

Start-Sleep -Seconds 3

Write-Host "Starting User Service..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd user-service; npm run dev"

Start-Sleep -Seconds 3

Write-Host "Starting Product Service..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd product-service; npm run dev"

Start-Sleep -Seconds 3

Write-Host "Starting Order Service..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd order-service; npm run dev"

Start-Sleep -Seconds 3

Write-Host "Starting Frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm start"

Write-Host ""
Write-Host "All services are starting..." -ForegroundColor Green
Write-Host "Please wait for all services to fully load before testing." -ForegroundColor Cyan
Write-Host ""
Write-Host "Services will be available at:" -ForegroundColor White
Write-Host "- Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "- Gateway: http://localhost:8080" -ForegroundColor Cyan
Write-Host "- User Service: http://localhost:3001" -ForegroundColor Cyan
Write-Host "- Product Service: http://localhost:3002" -ForegroundColor Cyan
Write-Host "- Order Service: http://localhost:3003" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
