#!/usr/bin/env python3
"""Generate games/manifest.json by scanning games/*/game.json."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GAMES = ROOT / "games"
out = GAMES / "manifest.json"

games = []
for d in sorted(GAMES.iterdir()):
    if not d.is_dir(): 
        continue
    gj = d / "game.json"
    if gj.exists():
        data = json.loads(gj.read_text(encoding="utf-8"))
        data.setdefault("id", d.name)
        games.append(data)

out.write_text(json.dumps({"games": games}, indent=2), encoding="utf-8")
print(f"Wrote {out} with {len(games)} game(s)")
