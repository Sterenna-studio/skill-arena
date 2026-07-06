// Méta-progression : persistance entre les runs via localStorage

const SAVE_KEY = 'bzh_breach_storm_save';

export function loadMeta() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return _defaultMeta();
    return { ..._defaultMeta(), ...JSON.parse(raw) };
  } catch(e) { return _defaultMeta(); }
}

export function saveMeta(meta) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(meta)); } catch(e) {}
}

export function saveRunEnd(state, meta) {
  meta.runs = (meta.runs || 0) + 1;
  meta.totalKills = (meta.totalKills || 0) + (state._killCount || 0);
  meta.highScore = Math.max(meta.highScore || 0, state.run.score);
  if (meta.totalKills >= 10  && !meta.unlockedPassives.includes('drone'))     meta.unlockedPassives.push('drone');
  if (meta.totalKills >= 30  && !meta.unlockedPassives.includes('armor'))     meta.unlockedPassives.push('armor');
  if (meta.runs        >= 3  && !meta.unlockedPassives.includes('cooldown'))  meta.unlockedPassives.push('cooldown');
  if (meta.highScore   >= 200 && !meta.unlockedPassives.includes('overdrive')) meta.unlockedPassives.push('overdrive');
  saveMeta(meta);
  return meta;
}

export function applyPassives(state, meta) {
  const p = state.player;
  if (!p) return;
  const passives = meta.unlockedPassives || [];
  if (passives.includes('armor'))    { p.maxHp = 150; p.hp = Math.min(p.hp + 30, p.maxHp); }
  if (passives.includes('cooldown')) { p.fireRate = Math.max(0.14, (p.fireRate || 0.2) - 0.04); }
  if (passives.includes('overdrive')){ p.speed = Math.min(240, (p.speed || 180) + 30); }
}

function _defaultMeta() {
  return { runs: 0, highScore: 0, totalKills: 0, unlockedPassives: [] };
}
