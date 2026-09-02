@echo off
setlocal

echo Starting Hildr Scout backend...
start "Hildr Scout Backend" cmd /k "cd /d %~dp0backend && .venv\Scripts\python -m uvicorn app.main:app --port 8000"

echo Starting Hildr Scout frontend...
start "Hildr Scout Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 6 /nobreak >nul
start http://localhost:5173

echo Hildr Scout is starting at http://localhost:5173
echo Close the backend/frontend windows to stop.