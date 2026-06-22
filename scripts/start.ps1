$ErrorActionPreference = "Stop"

Set-Location (Join-Path $PSScriptRoot "..")

if (-not (Test-Path .env)) {
    throw "Missing .env. Copy .env.example to .env and configure it first."
}

docker compose up -d --build
if ($LASTEXITCODE -ne 0) {
    throw "docker compose up failed."
}

$backendMapping = docker compose port backend 8000
$backendPort = ($backendMapping -split ":")[-1]
$backendUrl = "http://127.0.0.1:$backendPort"

Write-Host "Waiting for backend at $backendUrl/health..."
$backendReady = $false
for ($attempt = 1; $attempt -le 30; $attempt++) {
    try {
        Invoke-RestMethod -Uri "$backendUrl/health" -TimeoutSec 2 | Out-Null
        $backendReady = $true
        break
    } catch {
        Start-Sleep -Seconds 2
    }
}

if (-not $backendReady) {
    docker compose logs --tail=100 backend
    throw "Backend did not become healthy."
}

docker compose exec -T backend python -m app.seed
if ($LASTEXITCODE -ne 0) {
    throw "Seed command failed."
}

Write-Host "Waiting for frontend at http://127.0.0.1:5173..."
$frontendReady = $false
for ($attempt = 1; $attempt -le 30; $attempt++) {
    try {
        Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:5173" -TimeoutSec 2 | Out-Null
        $frontendReady = $true
        break
    } catch {
        Start-Sleep -Seconds 2
    }
}

if (-not $frontendReady) {
    docker compose logs --tail=100 frontend
    throw "Frontend did not become ready."
}

docker compose ps
Write-Host "Backend health: $backendUrl/health"
Write-Host "Frontend: http://127.0.0.1:5173"
Write-Host "Demo login: demo@student.edu / password123"
