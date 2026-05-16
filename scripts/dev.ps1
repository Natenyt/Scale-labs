# Run Django (8000) + Next.js (3000).
# From repo root:  .\dev.ps1   or   .\scripts\dev.ps1
# From this folder: .\dev.ps1   (do not use .\scripts\dev.ps1 while cd'd into scripts)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

if (-not (Test-Path "node_modules\concurrently")) {
  Write-Host "Installing root dev dependencies..."
  npm install
}

Write-Host "Starting Scale Labs (API http://localhost:8000, UI http://localhost:3000)"
npm run dev
