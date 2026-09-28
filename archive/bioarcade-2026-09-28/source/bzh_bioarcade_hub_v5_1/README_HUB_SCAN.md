# BioArcade Hub — Scan-based workflow

Browsers can't list directories, so the Hub reads:
- `games/manifest.json`

## Add a game
Create:
- `games/<id>/game.json`
- `games/<id>/<entry>` (default `index.html`)

Example `game.json`:
{
  "id": "tankgame",
  "title": "Tank Protocol",
  "version": "v0.1",
  "status": "alpha",
  "genre": ["arcade","shooter"],
  "entry": "index.html"
}

## Generate manifest
python tools/generate_manifest.py

Then open the hub and click **SCAN /games**.
