import { getCarStats, statLabels } from "./car.js";

function roll(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function cloneState(state) {
  return typeof structuredClone === "function"
    ? structuredClone(state)
    : JSON.parse(JSON.stringify(state));
}

function getPlacement(score, difficulty) {
  if (score >= difficulty + 15) return "first";
  if (score >= difficulty) return "second";
  if (score >= difficulty - 12) return "third";
  return "fourth";
}

function getPlacementLabel(placement) {
  return {
    first: "1er",
    second: "2e",
    third: "3e",
    fourth: "4e",
  }[placement];
}

function getReward(race, placement) {
  return race.rewards[placement] ?? { credits: 0, reputation: 0 };
}

export function runRace(state, races, raceId) {
  const race = races.find((item) => item.id === raceId);

  if (!race) {
    return { state, logs: [{ type: "bad", text: "Course introuvable." }] };
  }

  if (state.reputation < race.requiredReputation) {
    return {
      state,
      logs: [{ type: "bad", text: `${race.name} demande ${race.requiredReputation} réputation.` }],
    };
  }

  if (state.credits < race.entryCost) {
    return {
      state,
      logs: [{ type: "bad", text: `Il faut ${race.entryCost} crédits pour participer.` }],
    };
  }

  const next = cloneState(state);
  const stats = getCarStats(next);
  const focusedScore = average(race.focus.map((stat) => stats[stat] ?? 0));
  const reliabilityBonus = Math.round((stats.reliability - 70) / 5);
  const random = roll(-10, 12);
  const score = Math.max(0, Math.round(focusedScore + reliabilityBonus + random));
  const placement = getPlacement(score, race.difficulty);
  const reward = getReward(race, placement);
  const placementLabel = getPlacementLabel(placement);

  next.credits = next.credits - race.entryCost + reward.credits;
  next.reputation += reward.reputation;
  next.racesRun += 1;

  const focusLabels = race.focus.map((stat) => statLabels[stat] ?? stat).join(" + ");
  const won = placement === "first";

  next.lastResult = {
    raceName: race.name,
    placement,
    placementLabel,
    score,
    difficulty: race.difficulty,
    reward,
    focusLabels,
    random,
    won,
  };

  return {
    state: next,
    logs: [
      {
        type: won ? "good" : "info",
        text: `${race.name} : ${placementLabel}. Score ${score}/${race.difficulty}. +${reward.credits} crédits, +${reward.reputation} réputation.`,
      },
    ],
  };
}
