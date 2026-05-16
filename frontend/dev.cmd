@echo off
cd /d "%~dp0"
if not exist "node_modules\next\dist\bin\next" (
  echo Install dependencies first: npm.cmd install
  exit /b 1
)
node "node_modules\next\dist\bin\next" dev --webpack
