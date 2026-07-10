@echo off
setlocal
cd /d "%~dp0"
echo [Magnet Maze] Starting local server on http://localhost:8000 ...
python -m http.server 8000
if errorlevel 1 (
  py -m http.server 8000
)
