export const races = [
  {
    id: "parking",
    name: "Course du parking",
    distance: "1 tour",
    entryCost: 0,
    requiredReputation: 0,
    difficulty: 55,
    rewards: {
      first: { credits: 160, reputation: 8 },
      second: { credits: 90, reputation: 4 },
      third: { credits: 40, reputation: 1 },
    },
    focus: ["acceleration", "handling"],
  },
  {
    id: "rocade",
    name: "Run de la rocade",
    distance: "3 km",
    entryCost: 70,
    requiredReputation: 10,
    difficulty: 75,
    rewards: {
      first: { credits: 320, reputation: 16 },
      second: { credits: 180, reputation: 8 },
      third: { credits: 80, reputation: 3 },
    },
    focus: ["speed", "acceleration"],
  },
  {
    id: "night",
    name: "Finale de nuit",
    distance: "5 km",
    entryCost: 140,
    requiredReputation: 28,
    difficulty: 95,
    rewards: {
      first: { credits: 620, reputation: 32 },
      second: { credits: 340, reputation: 16 },
      third: { credits: 150, reputation: 6 },
    },
    focus: ["speed", "handling", "reliability"],
  },
];
