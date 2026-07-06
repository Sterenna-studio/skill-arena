import { getUpgradeCost, statLabels, upgradeDefinitions } from "../systems/car.js";

const qs = (selector) => document.querySelector(selector);

function signed(value) {
  return `${value > 0 ? "+" : ""}${value}`;
}

function renderStats(stats) {
  qs("#stats").innerHTML = Object.entries(statLabels)
    .map(([key, label]) => {
      const value = stats[key] ?? 0;
      return `<div class="stat-row">
        <span>${label}</span>
        <strong>${value}</strong>
        <div class="bar"><i style="--value:${Math.min(100, value)}%"></i></div>
      </div>`;
    })
    .join("");
}

function renderUpgrades(state, actions) {
  qs("#upgrades").innerHTML = Object.entries(upgradeDefinitions)
    .map(([id, upgrade]) => {
      const level = state.upgrades[id] ?? 0;
      const maxed = level >= 5;
      const cost = getUpgradeCost(state, id);
      const disabled = maxed || state.credits < cost;

      return `<article class="item">
        <div>
          <p class="meta">${upgrade.label}</p>
          <h3>Niveau ${level}/5</h3>
          <p>${upgrade.description}</p>
        </div>
        <button class="btn" data-upgrade="${id}" ${disabled ? "disabled" : ""}>
          ${maxed ? "Max" : `${cost} cr`}
        </button>
      </article>`;
    })
    .join("");

  qs("#upgrades")
    .querySelectorAll("[data-upgrade]")
    .forEach((button) => button.addEventListener("click", () => actions.upgrade(button.dataset.upgrade)));
}

function renderRaces(state, races, uiState, actions) {
  qs("#races").innerHTML = races
    .map((race) => {
      const locked = state.reputation < race.requiredReputation;
      const active = uiState.raceRunning === race.id;
      const canStart = !locked && state.credits >= race.entryCost && !uiState.raceRunning;
      const focus = race.focus.map((stat) => statLabels[stat] ?? stat).join(" + ");

      return `<article class="race ${active ? "running" : ""}">
        <div>
          <p class="meta">${race.distance} · difficulté ${race.difficulty}</p>
          <h3>${race.name}</h3>
          <p>Stats clés : ${focus}</p>
          ${locked ? `<p class="warning">Requiert ${race.requiredReputation} réputation.</p>` : ""}
        </div>
        <div class="race-side">
          <span>${race.entryCost} cr</span>
          <button class="btn" data-race="${race.id}" ${canStart ? "" : "disabled"}>
            ${active ? "Simulation..." : "Simuler"}
          </button>
        </div>
      </article>`;
    })
    .join("");

  qs("#races")
    .querySelectorAll("[data-race]")
    .forEach((button) => button.addEventListener("click", () => actions.race(button.dataset.race)));
}

function renderResult(result) {
  const box = qs("#result");

  if (!result) {
    box.className = "result hidden";
    box.innerHTML = "";
    return;
  }

  box.className = `result ${result.won ? "good" : ""}`;
  box.innerHTML = `<div>
    <p class="meta">Dernière course</p>
    <h2>${result.raceName}</h2>
  </div>
  <div class="result-grid">
    <div><span>Place</span><strong>${result.placementLabel}</strong></div>
    <div><span>Score</span><strong>${result.score}/${result.difficulty}</strong></div>
    <div><span>Crédits</span><strong>+${result.reward.credits}</strong></div>
    <div><span>Réputation</span><strong>+${result.reward.reputation}</strong></div>
  </div>
  <p>Course basée sur ${result.focusLabels}. Facteur course : ${signed(result.random)}.</p>`;
}

function renderLog(state) {
  qs("#log").innerHTML = state.log
    .map((entry) => `<div class="log ${entry.type ?? "info"}">${entry.text}</div>`)
    .join("");
}

export function renderApp({ state, races, stats, uiState, actions }) {
  qs("#carName").textContent = state.carName;
  qs("#credits").textContent = state.credits;
  qs("#reputation").textContent = state.reputation;
  qs("#runs").textContent = state.racesRun;

  renderStats(stats);
  renderUpgrades(state, actions);
  renderRaces(state, races, uiState, actions);
  renderResult(state.lastResult);
  renderLog(state);
}
