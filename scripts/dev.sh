#!/usr/bin/env bash
# Run Django (8000) + Next.js (3000) from the repo root.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -d node_modules/concurrently ]]; then
  echo "Installing root dev dependencies..."
  npm install
fi

echo "Starting Scale Labs (API http://localhost:8000, UI http://localhost:3000)"
npm run dev
