export const upgradeDefinitions = {
  engine: {
    label: "Moteur",
    description: "Augmente surtout la vitesse de pointe.",
    baseCost: 140,
    stat: "speed",
  },
  tires: {
    label: "Pneus",
    description: "Améliore la tenue de route.",
    baseCost: 110,
    stat: "handling",
  },
  turbo: {
    label: "Turbo",
    description: "Améliore les départs, mais fatigue un peu la voiture.",
    baseCost: 160,
    stat: "acceleration",
  },
  chassis: {
    label: "Châssis",
    description: "Rend la voiture plus stable et fiable.",
    baseCost: 130,
    stat: "reliability",
  },
};

export const statLabels = {
  speed: "Vitesse",
  acceleration: "Accélération",
  handling: "Tenue de route",
  reliability: "Fiabilité",
};

export function getCarStats(state) {
  const { engine, tires, turbo, chassis } = state.upgrades;

  return {
    speed: 40 + engine * 12 + turbo * 6,
    acceleration: 38 + engine * 4 + turbo * 14,
    handling: 40 + tires * 13 + chassis * 4,
    reliability: Math.max(35, 70 + chassis * 7 - turbo * 5),
  };
}

export function getUpgradeCost(state, upgradeId) {
  const definition = upgradeDefinitions[upgradeId];
  if (!definition) return 0;

  const level = state.upgrades[upgradeId] ?? 0;
  return definition.baseCost + level * 90;
}

export function upgradeCar(state, upgradeId) {
  const definition = upgradeDefinitions[upgradeId];

  if (!definition) {
    return { ok: false, message: { type: "bad", text: "Amélioration inconnue." } };
  }

  const level = state.upgrades[upgradeId] ?? 0;
  if (level >= 5) {
    return { ok: false, message: { type: "info", text: `${definition.label} est déjà au maximum.` } };
  }

  const cost = getUpgradeCost(state, upgradeId);
  if (state.credits < cost) {
    return { ok: false, message: { type: "bad", text: `Il faut ${cost} crédits.` } };
  }

  state.credits -= cost;
  state.upgrades[upgradeId] = level + 1;

  return {
    ok: true,
    message: { type: "good", text: `${definition.label} amélioré niveau ${level + 1}.` },
  };
}
