import { races } from "./data/races.js";
import { getCarStats, upgradeCar } from "./systems/car.js";
import { runRace } from "./systems/raceEngine.js";
import { createDefaultState, loadState, resetState, saveState } from "./systems/save.js";
import { renderApp } from "./ui/render.js";

let state = loadState() ?? createDefaultState();
const uiState = { raceRunning: null };

function addLog(entry) {
  state.log.unshift(entry);
  state.log = state.log.slice(0, 12);
}

function commit() {
  saveState(state);
  render();
}

function finishRace(raceId) {
  const result = runRace(state, races, raceId);
  state = result.state;
  state.log = [...result.logs, ...state.log].slice(0, 12);
  uiState.raceRunning = null;
  commit();
}

function startRace(raceId) {
  if (uiState.raceRunning) return;
  uiState.raceRunning = raceId;
  render();
  window.setTimeout(() => finishRace(raceId), 650);
}

function render() {
  renderApp({
    state,
    races,
    stats: getCarStats(state),
    uiState,
    actions: {
      upgrade: (id) => {
        const result = upgradeCar(state, id);
        addLog(result.message);
        commit();
      },
      race: startRace,
    },
  });
}

document.querySelector("#saveBtn").addEventListener("click", () => {
  addLog({ type: "info", text: "Sauvegarde locale effectuée." });
  commit();
});

document.querySelector("#resetBtn").addEventListener("click", () => {
  if (!confirm("Réinitialiser la partie ?")) return;
  state = resetState();
  uiState.raceRunning = null;
  render();
});

render();
