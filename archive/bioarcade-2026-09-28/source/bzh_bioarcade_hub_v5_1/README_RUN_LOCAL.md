# BioArcade Hub — Run locally (important)

This project uses ES Modules (`<script type="module">`). Modern browsers **block module imports over `file://`**
(CORS origin is `null`), so you must run it from a local web server.

## Option A — Python (recommended)
1. Open a terminal in this folder
2. Run:
   python -m http.server 8000
3. Open:
   http://localhost:8000/

## Option B — Node
npx http-server -p 8000
Then open http://localhost:8000/

## Windows quick start
- Double-click `start_server.bat`
- It will start a server on http://localhost:8000/
