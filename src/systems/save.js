const SAVE_KEY = "spirit-overdrive.simple-racer.v1";

export function createDefaultState() {
  return {
    carName: "Spirit GT",
    credits: 300,
    reputation: 0,
    upgrades: {
      engine: 1,
      tires: 1,
      turbo: 0,
      chassis: 1,
    },
    racesRun: 0,
    lastResult: null,
    log: [{ type: "info", text: "Garage ouvert. Choisis une course et simule le run." }],
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;

    const fresh = createDefaultState();
    const loaded = JSON.parse(raw);

    return {
      ...fresh,
      ...loaded,
      upgrades: { ...fresh.upgrades, ...(loaded.upgrades ?? {}) },
      log: loaded.log ?? fresh.log,
    };
  } catch (error) {
    console.warn("Sauvegarde illisible.", error);
    return null;
  }
}

export function saveState(state) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function resetState() {
  const fresh = createDefaultState();
  saveState(fresh);
  return fresh;
}
