@echo off
echo Starting MicroStore Services...
echo.

echo Starting Gateway Service...
start "Gateway" cmd /k "cd gateway && npm run dev"

timeout /t 3 /nobreak > nul

echo Starting User Service...
start "User Service" cmd /k "cd user-service && npm run dev"

timeout /t 3 /nobreak > nul

echo Starting Product Service...
start "Product Service" cmd /k "cd product-service && npm run dev"

timeout /t 3 /nobreak > nul

echo Starting Order Service...
start "Order Service" cmd /k "cd order-service && npm run dev"

timeout /t 3 /nobreak > nul

echo Starting Frontend...
start "Frontend" cmd /k "cd frontend && npm start"

echo.
echo All services are starting...
echo Please wait for all services to fully load before testing.
echo.
echo Services will be available at:
echo - Frontend: http://localhost:3000
echo - Gateway: http://localhost:8080
echo - User Service: http://localhost:3001
echo - Product Service: http://localhost:3002
echo - Order Service: http://localhost:3003
echo.
pause
