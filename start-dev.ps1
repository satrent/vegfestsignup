# VegFest Signup - Development Startup Script
# This script starts both the API backend and UI frontend in separate windows

Write-Host "Starting VegFest Signup Development Environment..." -ForegroundColor Green
Write-Host ""

# Get the script directory (root of the project)
$rootDir = $PSScriptRoot

# Note: Make sure MongoDB is running before starting the services
Write-Host "Note: Make sure MongoDB is running (mongod)" -ForegroundColor Yellow
Write-Host ""

# Start API in a new window
Write-Host "Starting API Backend (http://localhost:3000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir\api'; Write-Host 'API Backend' -ForegroundColor Cyan; npm run dev"

# Wait a moment for API to start
Start-Sleep -Seconds 2

# Start UI in a new window
Write-Host "Starting UI Frontend (http://localhost:4200)..." -ForegroundColor Magenta
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir\ui'; Write-Host 'UI Frontend' -ForegroundColor Magenta; npm start"

Write-Host ""
Write-Host "Development environment starting!" -ForegroundColor Green
Write-Host ""
Write-Host "API Backend:  http://localhost:3000" -ForegroundColor Cyan
Write-Host "UI Frontend:  http://localhost:4200" -ForegroundColor Magenta
Write-Host ""
Write-Host "Tip: Close the terminal windows to stop the services" -ForegroundColor Yellow
Write-Host ""
