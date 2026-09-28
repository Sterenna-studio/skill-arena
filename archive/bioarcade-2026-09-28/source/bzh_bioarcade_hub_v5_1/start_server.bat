\
@echo off
setlocal
cd /d "%~dp0"
echo.
echo [BioArcade] Starting local server on http://localhost:8000/
echo Close this window to stop the server.
echo.
python -m http.server 8000
