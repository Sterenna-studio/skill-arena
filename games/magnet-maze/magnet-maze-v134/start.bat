@echo off
setlocal
cd /d "%~dp0"
echo [Magnet Maze] Installing deps (first run)...
call npm install
if errorlevel 1 (
  echo npm install failed. Check Node.js/NPM.
  pause
  exit /b 1
)
echo [Magnet Maze] Starting server on http://localhost:8000 ...
npm start
