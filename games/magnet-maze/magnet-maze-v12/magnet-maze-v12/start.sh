#!/usr/bin/env bash
cd "$(dirname "$0")"
echo "[Magnet Maze] Starting local server on http://localhost:8000 ..."
python3 -m http.server 8000
