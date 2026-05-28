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

Write-Host "Starting Scale Labs (API http://0.0.0.0:8000, UI http://0.0.0.0:3000)"
Write-Host "  ngrok backend:  ngrok http 8000  -> VAPI_WEBHOOK_BASE in backend/.env"
Write-Host "  ngrok frontend: ngrok http 3000  -> DEV_PUBLIC_ORIGIN / NEXT_PUBLIC_DEV_ORIGIN"
Write-Host "  LAN access: use http://<your-lan-ip>:3000 and http://<your-lan-ip>:8000"
npm run dev
