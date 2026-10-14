const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const gameShell = document.querySelector(".game-shell");

if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    const radius = typeof r === "number" ? r : 8;
    this.beginPath();
    this.moveTo(x + radius, y);
    this.lineTo(x + w - radius, y);
    this.quadraticCurveTo(x + w, y, x + w, y + radius);
    this.lineTo(x + w, y + h - radius);
    this.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    this.lineTo(x + radius, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - radius);
    this.lineTo(x, y + radius);
    this.quadraticCurveTo(x, y, x + radius, y);
    this.closePath();
    return this;
  };
}

const hpText = document.querySelector("#hpText");
const levelText = document.querySelector("#levelText");
const staminaText = document.querySelector("#staminaText");
const scoreText = document.querySelector("#scoreText");
const zoneText = document.querySelector("#zoneText");
const objectiveText = document.querySelector("#objectiveText");
const crystalFill = document.querySelector("#crystalFill");
const inventoryCrystals = document.querySelector("#inventoryCrystals");
const tonicText = document.querySelector("#tonicText");
const xpText = document.querySelector("#xpText");
const spellPointText = document.querySelector("#spellPointText");
const statusText = document.querySelector("#statusText");
const questStepEls = Array.from(document.querySelectorAll("[data-step]"));
const spellButtons = Array.from(document.querySelectorAll("[data-spell]"));

const overlay = document.querySelector("#overlay");
let startBtn = document.querySelector("#startBtn");
let continueBtn = document.querySelector("#continueBtn");
let settingsBtn = document.querySelector("#settingsBtn");
const sidebarSettingsBtn = document.querySelector("#sidebarSettingsBtn");

const dialogueEl = document.querySelector("#dialogue");
const dialoguePortrait = document.querySelector("#dialoguePortrait");
const dialogueText = document.querySelector("#dialogueText");
const dialogueName = document.querySelector("#dialogueName");
const messageEl = document.querySelector("#message");

const ASSETS = {
  walk: [
    "assets/walk/ardamir_walk_01.png",
    "assets/walk/ardamir_walk_02.png",
    "assets/walk/ardamir_walk_03.png",
    "assets/walk/ardamir_walk_04.png",
    "assets/walk/ardamir_walk_05.png",
    "assets/walk/ardamir_walk_06.png",
    "assets/walk/ardamir_walk_07.png",
    "assets/walk/ardamir_walk_08.png",
  ],
  portraits: {
    surprise: "assets/portraits/surprise.png",
    joie: "assets/portraits/joie.png",
    rire: "assets/portraits/rire.png",
    amoureuse: "assets/portraits/amoureuse.png",
    pensive: "assets/portraits/pensive.png",
    perplexe: "assets/portraits/perplexe.png",
    colere: "assets/portraits/colere.png",
    triste: "assets/portraits/triste.png",
    panique: "assets/portraits/panique.png",
    degoutee: "assets/portraits/degoutee.png",
  }
};

const images = { walk: [], portraits: {} };

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image manquante : " + src));
    img.src = src;
  });
}

async function loadAssets() {
  images.walk = await Promise.all(ASSETS.walk.map(loadImage));
  const portraits = await Promise.all(
    Object.entries(ASSETS.portraits).map(async ([key, src]) => [key, await loadImage(src)])
  );
  images.portraits = Object.fromEntries(portraits);
}

const keys = {};
const heldControls = { up: false, down: false, left: false, right: false };
const SAVE_KEY = "ardamir_crystal_quest_save_v4";
const CONTROL_KEY = "ardamir_crystal_quest_controls_v1";
const DEFAULT_CONTROLS = {
  up: "z",
  down: "s",
  left: "q",
  right: "d",
  cast: " ",
  interact: "e",
  dash: "shift",
  tonic: "r",
  pause: "escape"
};
const CONTROL_PRESETS = {
  zqsd: { up: "z", down: "s", left: "q", right: "d" },
  wasd: { up: "w", down: "s", left: "a", right: "d" }
};
const CONTROL_LABELS = {
  up: "Monter",
  down: "Descendre",
  left: "Gauche",
  right: "Droite",
  cast: "Sort / rythme",
  interact: "Interagir",
  dash: "Dash",
  tonic: "Tonic",
  pause: "Pause"
};
let controls = { ...DEFAULT_CONTROLS };
let rebindingAction = null;
const movementKeys = new Set(["arrowup", "arrowdown", "arrowleft", "arrowright", "z", "q", "s", "d", "w", "a"]);
const mouse = { x: 0, y: 0 };

const SPELLS = {
  bolt: {
    name: "Trait d'ombre",
    level: 1,
    cost: 0,
    damage: 1,
    desc: "Projectile fiable du bâton de pacte."
  },
  hex: {
    name: "Flamme hex",
    level: 2,
    cost: 1,
    damage: 2,
    desc: "Sort plus lourd, idéal contre les gardiens."
  },
  ward: {
    name: "Voile d'os",
    level: 2,
    cost: 1,
    damage: 1,
    shield: 1,
    desc: "Inflige peu, mais bloque la prochaine erreur."
  },
  drain: {
    name: "Drain d'âme",
    level: 3,
    cost: 1,
    damage: 1,
    heal: 1,
    desc: "Rend 1 vie si le sort touche."
  },
  runebolt: {
    name: "Foudre runique",
    level: 3,
    cost: 2,
    damage: 3,
    desc: "Frappe runique dévastatrice, lourde en points de sort."
  }
};

const game = {
  started: false,
  ended: false,
  paused: false,
  scene: "tavern",
  quest: "intro",
  crystalsTarget: 5,
  time: 0
};

const camera = { x: 0, y: 0 };

const player = {
  x: 450,
  y: 400,
  w: 72,
  h: 98,
  speed: 250,
  hp: 5,
  maxHp: 5,
  stamina: 100,
  maxStamina: 100,
  level: 1,
  xp: 0,
  spellPoints: 0,
  selectedSpell: "bolt",
  unlockedSpells: new Set(["bolt"]),
  shield: 0,
  tonics: 0,
  crystals: 0,
  frame: 0,
  anim: 0,
  moving: false,
  invuln: 0,
  dashTimer: 0,
  dashCooldown: 0,
  attackTimer: 0,
  attackCooldown: 0,
  attackHitIds: new Set(),
  lastDir: { x: 0, y: 1 }
};

const PLAYER_COLLISION = {
  insetX: 20,
  offsetY: 68,
  height: 24
};

const tavern = {
  width: 960,
  height: 540,
  playerStart: { x: 460, y: 430 },
  door: { x: 425, y: 496, w: 110, h: 38, label: "Sortir" },
  jean: { x: 480, y: 240, r: 24 },
  obstacles: [
    { x: 0, y: 0, w: 960, h: 32 },
    { x: 0, y: 0, w: 32, h: 540 },
    { x: 928, y: 0, w: 32, h: 540 },
    { x: 0, y: 518, w: 420, h: 22 },
    { x: 540, y: 518, w: 420, h: 22 },
    { x: 70, y: 70, w: 250, h: 66 },
    { x: 108, y: 232, w: 126, h: 76 },
    { x: 708, y: 236, w: 126, h: 76 },
    { x: 350, y: 350, w: 260, h: 62 },
    { x: 780, y: 62, w: 90, h: 110 },
  ]
};

const forest = {
  width: 1900,
  height: 1200,
  playerStart: { x: 225, y: 835 },
  tavernBuilding: { x: 70, y: 760, w: 300, h: 215 },
  door: { x: 202, y: 880, w: 68, h: 78, label: "Entrer" },
  obstacles: [
    { x: 70, y: 760, w: 300, h: 215 },
    { x: 480, y: 120, w: 210, h: 150 },
    { x: 740, y: 770, w: 300, h: 110 },
    { x: 1100, y: 210, w: 240, h: 150 },
    { x: 1220, y: 470, w: 130, h: 230 },
    { x: 1370, y: 780, w: 230, h: 140 },
    { x: 1580, y: 180, w: 180, h: 180 },
    { x: 430, y: 960, w: 180, h: 120 },
  ],
};

const crystals = [
  { id: "c1", x: 548, y: 515, collected: false },
  { id: "c2", x: 830, y: 940, collected: false },
  { id: "c3", x: 1030, y: 320, collected: false },
  { id: "c4", x: 1290, y: 850, collected: false },
  { id: "c5", x: 1590, y: 520, collected: false },
];

const slimes = [
  { id: "s1", kind: "slime", x: 635, y: 420, r: 24, hp: 3, maxHp: 3, vx: 40, vy: 25, stun: 0 },
  { id: "s2", kind: "slime", x: 940, y: 750, r: 24, hp: 3, maxHp: 3, vx: -35, vy: 45, stun: 0 },
  { id: "s3", kind: "slime", x: 1340, y: 360, r: 24, hp: 4, maxHp: 4, vx: 48, vy: -30, stun: 0 },
  { id: "s4", kind: "slime", x: 1520, y: 820, r: 24, hp: 4, maxHp: 4, vx: -42, vy: 38, stun: 0 },
  { id: "s5", kind: "slime", x: 760, y: 250, r: 22, hp: 2, maxHp: 2, vx: 45, vy: 35, stun: 0 },
  { id: "w1", kind: "wraith", x: 980, y: 500, r: 22, hp: 5, maxHp: 5, vx: -60, vy: 30, stun: 0 },
  { id: "w2", kind: "wraith", x: 1500, y: 650, r: 22, hp: 6, maxHp: 6, vx: 55, vy: -40, stun: 0 },
];

const SLIME_STARTS = [
  [635, 420, 40, 25],
  [940, 750, -35, 45],
  [1340, 360, 48, -30],
  [1520, 820, -42, 38],
  [760, 250, 45, 35],
  [980, 500, -60, 30],
  [1500, 650, 55, -40],
];

const tonics = [
  { id: "t1", x: 700, y: 620, collected: false },
  { id: "t2", x: 1180, y: 735, collected: false },
  { id: "t3", x: 1515, y: 350, collected: false },
];

const boss = {
  x: 1130,
  y: 560,
  r: 42,
  hp: 9,
  maxHp: 9,
  vx: 0,
  vy: 0,
  stun: 0,
  active: false,
  defeated: false,
  hurtCooldown: 0
};

const rhythmCombat = {
  active: false,
  target: null,
  targetType: "",
  noteKey: "z",
  noteX: 0,
  hitX: 265,
  speed: 285,
  window: 42,
  enemyDistance: 360,
  enemyRange: 78,
  combo: 0,
  misses: 0,
  resultTimer: 0,
  resultText: "",
  castFlash: 0,
  enemyFlash: 0
};

const particles = [];
const floaters = [];
let dialogueOpen = false;
let dialogueQueue = [];
let pendingDialogueClose = null;
let messageTimer = 0;
let screenShake = 0;
let saveTimer = 0;

function sceneDef() {
  return game.scene === "tavern" ? tavern : forest;
}

function getStorage() {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

function normalizeKey(key) {
  if (key === "Spacebar") return " ";
  return String(key || "").toLowerCase();
}

function formatKey(key) {
  if (key === " ") return "Espace";
  if (key === "escape") return "Échap";
  if (key === "arrowup") return "↑";
  if (key === "arrowdown") return "↓";
  if (key === "arrowleft") return "←";
  if (key === "arrowright") return "→";
  if (key === "shift") return "Shift";
  return String(key || "").toUpperCase();
}

function loadControls() {
  const storage = getStorage();
  if (!storage) return;
  try {
    const saved = JSON.parse(storage.getItem(CONTROL_KEY));
    if (saved && typeof saved === "object") {
      controls = { ...DEFAULT_CONTROLS, ...saved };
    }
  } catch {
    controls = { ...DEFAULT_CONTROLS };
  }
}

function saveControls() {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(CONTROL_KEY, JSON.stringify(controls));
  } catch {
    showMessage("Configuration non sauvegardée", 1);
  }
}

function matchesAction(key, action) {
  return normalizeKey(key) === controls[action];
}

function isMoveActive(action) {
  if (heldControls[action]) return true;
  if (keys[controls[action]]) return true;
  if (action === "up" && keys.arrowup) return true;
  if (action === "down" && keys.arrowdown) return true;
  if (action === "left" && keys.arrowleft) return true;
  if (action === "right" && keys.arrowright) return true;
  return false;
}

function isMoveKey(key) {
  return movementKeys.has(key) || ["up", "down", "left", "right"].some((action) => matchesAction(key, action));
}

function rhythmKeys() {
  return [controls.up, controls.left, controls.down, controls.right];
}

function xpToNextLevel() {
  return 6 + (player.level - 1) * 5;
}

function objectiveForState() {
  if (game.quest === "intro") return "Parle à Jean-Dolmac dans la taverne.";
  if (game.quest === "collect") return "Récupère 5 cristaux dans les landes d'Aphalone.";
  if (game.quest === "boss") return "Vaincs le gardien cristallin en duel magique.";
  if (game.quest === "return") return "Retourne à la taverne et parle à Jean-Dolmac.";
  return "Quête terminée.";
}

function setObjective(text) {
  objectiveText.textContent = text;
  syncQuestPanel();
}

function updateHud() {
  hpText.textContent = `${player.hp} / ${player.maxHp}`;
  levelText.textContent = String(player.level);
  staminaText.textContent = `${Math.round(player.stamina)}%`;
  scoreText.textContent = `${player.crystals} / ${game.crystalsTarget}`;
  zoneText.textContent = game.scene === "tavern" ? "Taverne d'Aphalone" : "Landes";
  inventoryCrystals.textContent = `${player.crystals} / ${game.crystalsTarget}`;
  tonicText.textContent = String(player.tonics);
  xpText.textContent = `${player.xp} / ${xpToNextLevel()}`;
  spellPointText.textContent = String(player.spellPoints);
  crystalFill.style.width = `${Math.min(100, (player.crystals / game.crystalsTarget) * 100)}%`;
  syncSpellTree();
  syncQuestPanel();
}

function syncSpellTree() {
  spellButtons.forEach((button) => {
    const spellId = button.dataset.spell;
    const spell = SPELLS[spellId];
    if (!spell) return;
    const unlocked = player.unlockedSpells.has(spellId);
    const canUnlock = !unlocked && player.level >= spell.level && player.spellPoints >= spell.cost;
    button.classList.toggle("unlocked", unlocked);
    button.classList.toggle("selected", player.selectedSpell === spellId);
    button.classList.toggle("locked", !unlocked && !canUnlock);
    button.textContent = unlocked
      ? `${spell.name}${player.selectedSpell === spellId ? " ✓" : ""}`
      : `${spell.name} - niv. ${spell.level}, ${spell.cost} pt`;
    button.title = spell.desc;
  });
}

function selectOrUnlockSpell(spellId) {
  const spell = SPELLS[spellId];
  if (!spell) return;

  if (player.unlockedSpells.has(spellId)) {
    player.selectedSpell = spellId;
    showMessage(`${spell.name} préparé`, 0.9);
    updateHud();
    saveGame();
    return;
  }

  if (player.level < spell.level) {
    showMessage(`Niveau ${spell.level} requis`, 1);
    return;
  }

  if (player.spellPoints < spell.cost) {
    showMessage("Point de sort requis", 1);
    return;
  }

  player.spellPoints -= spell.cost;
  player.unlockedSpells.add(spellId);
  player.selectedSpell = spellId;
  showMessage(`${spell.name} débloqué`, 1.1);
  updateHud();
  saveGame();
}

function controlRowsHtml() {
  return Object.keys(DEFAULT_CONTROLS).map((action) => `
    <div class="binding-row">
      <span>${CONTROL_LABELS[action]}</span>
      <button type="button" data-bind="${action}">${rebindingAction === action ? "Appuie..." : formatKey(controls[action])}</button>
    </div>
  `).join("");
}

function renderSettingsPanel() {
  overlay.querySelector(".panel").innerHTML = `
    <img class="panel-portrait" src="assets/portraits/pensive.png" alt="" />
    <div>
      <h2>Configuration</h2>
      <p>Déplacement dans les intérieurs et extérieurs d'Aphalone. Les flèches restent toujours actives en secours.</p>
    </div>
    <div class="settings-grid">
      <div class="panel-actions">
        <button id="presetZqsdBtn" class="secondary" type="button">Preset ZQSD</button>
        <button id="presetWasdBtn" class="secondary" type="button">Preset WASD</button>
        <button id="closeSettingsBtn" class="primary" type="button">Retour</button>
      </div>
      ${controlRowsHtml()}
    </div>
  `;

  document.querySelector("#presetZqsdBtn").addEventListener("click", () => {
    controls = { ...controls, ...CONTROL_PRESETS.zqsd };
    saveControls();
    renderSettingsPanel();
  });

  document.querySelector("#presetWasdBtn").addEventListener("click", () => {
    controls = { ...controls, ...CONTROL_PRESETS.wasd };
    saveControls();
    renderSettingsPanel();
  });

  document.querySelector("#closeSettingsBtn").addEventListener("click", () => {
    rebindingAction = null;
    if (!game.started) renderStartOverlay();
    else if (game.paused) openPauseOverlay();
    else overlay.classList.remove("show");
    if (!game.paused) canvas.focus();
  });

  document.querySelectorAll("[data-bind]").forEach((button) => {
    button.addEventListener("click", () => {
      rebindingAction = button.dataset.bind;
      renderSettingsPanel();
    });
  });
}

function openSettingsOverlay() {
  if (game.started && !game.ended) {
    game.paused = true;
    updateHud();
  }
  overlay.classList.add("show");
  renderSettingsPanel();
}

function renderStartOverlay() {
  overlay.classList.add("show");
  overlay.querySelector(".panel").innerHTML = `
    <img class="panel-portrait" src="assets/portraits/joie.png" alt="" />
    <div>
      <h2>Crystal Quest</h2>
      <p>Jean-Dolmac attend Ardamir dans la taverne d'Aphalone. Son bâton de pacte répond aux cristaux, mais chaque sort exige le bon rythme.</p>
    </div>
    <div class="panel-actions">
      <button id="startBtn" class="primary">Nouvelle partie</button>
      <button id="continueBtn" class="secondary hidden">Continuer</button>
      <button id="settingsBtn" class="secondary">Configuration</button>
    </div>
  `;
  wireStartPanel();
  refreshContinueButton();
}

function syncQuestPanel() {
  const finishedCollecting = player.crystals >= game.crystalsTarget || game.quest === "boss" || game.quest === "return" || game.quest === "done";

  questStepEls.forEach((item) => {
    const step = item.dataset.step;
    item.classList.toggle("active", game.quest === step);
    item.classList.toggle("done",
      (step === "intro" && game.quest !== "intro") ||
      (step === "collect" && finishedCollecting) ||
      (step === "boss" && (game.quest === "return" || game.quest === "done")) ||
      (step === "return" && game.quest === "done")
    );
  });

  if (game.ended) {
    statusText.textContent = player.hp <= 0 ? "K.O." : "Quête finie";
  } else if (game.paused) {
    statusText.textContent = "Pause";
  } else if (rhythmCombat.active) {
    statusText.textContent = "Duel magique";
  } else if (dialogueOpen) {
    statusText.textContent = "Dialogue";
  } else if (player.dashCooldown > 0) {
    statusText.textContent = "Dash prêt bientôt";
  } else if (player.hp <= 2) {
    statusText.textContent = "Blessée";
  } else if (game.quest === "boss") {
    statusText.textContent = "Gardien actif";
  } else {
    statusText.textContent = game.scene === "tavern" ? "En sécurité" : "En exploration";
  }
}

function showMessage(text, duration = 1.5) {
  messageEl.textContent = text;
  messageEl.classList.remove("hidden");
  messageTimer = duration;
}

function hasSaveGame() {
  const storage = getStorage();
  return Boolean(storage && storage.getItem(SAVE_KEY));
}

function refreshContinueButton() {
  if (!continueBtn) return;
  continueBtn.classList.toggle("hidden", !hasSaveGame());
}

function saveGame() {
  const storage = getStorage();
  if (!storage || !game.started || game.ended) return;

  const data = {
    version: 3,
    game: {
      scene: game.scene,
      quest: game.quest,
      time: game.time
    },
    player: {
      x: player.x,
      y: player.y,
      hp: player.hp,
      stamina: player.stamina,
      level: player.level,
      xp: player.xp,
      spellPoints: player.spellPoints,
      selectedSpell: player.selectedSpell,
      unlockedSpells: Array.from(player.unlockedSpells),
      shield: player.shield,
      tonics: player.tonics,
      crystals: player.crystals,
      lastDir: player.lastDir
    },
    crystals: crystals.map(c => ({ id: c.id, collected: c.collected })),
    tonics: tonics.map(t => ({ id: t.id, collected: t.collected })),
    slimes: slimes.map(s => ({
      id: s.id,
      x: s.x,
      y: s.y,
      hp: s.hp,
      vx: s.vx,
      vy: s.vy,
      stun: s.stun
    })),
    boss: {
      x: boss.x,
      y: boss.y,
      hp: boss.hp,
      active: boss.active,
      defeated: boss.defeated
    }
  };

  try {
    storage.setItem(SAVE_KEY, JSON.stringify(data));
    refreshContinueButton();
  } catch {
    showMessage("Sauvegarde indisponible", 1.2);
  }
}

function clearSaveGame() {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(SAVE_KEY);
  refreshContinueButton();
}

function applySaveGame(data) {
  if (!data || !data.player || !data.game) return false;

  game.started = true;
  game.ended = false;
  game.paused = false;
  game.scene = data.game.scene === "forest" ? "forest" : "tavern";
  game.quest = ["intro", "collect", "boss", "return", "done"].includes(data.game.quest) ? data.game.quest : "intro";
  game.time = Number.isFinite(data.game.time) ? data.game.time : 0;

  player.x = Number.isFinite(data.player.x) ? data.player.x : tavern.playerStart.x;
  player.y = Number.isFinite(data.player.y) ? data.player.y : tavern.playerStart.y;
  player.level = Math.max(1, Number.isFinite(data.player.level) ? data.player.level : 1);
  player.maxHp = 5 + Math.floor(player.level / 2);
  player.maxStamina = 100 + (player.level - 1) * 8;
  player.hp = Math.max(1, Math.min(player.maxHp, data.player.hp || player.maxHp));
  player.stamina = Math.max(0, Math.min(player.maxStamina, Number.isFinite(data.player.stamina) ? data.player.stamina : player.maxStamina));
  player.xp = Math.max(0, Number.isFinite(data.player.xp) ? data.player.xp : 0);
  player.spellPoints = Math.max(0, Number.isFinite(data.player.spellPoints) ? data.player.spellPoints : 0);
  player.selectedSpell = SPELLS[data.player.selectedSpell] ? data.player.selectedSpell : "bolt";
  player.unlockedSpells = new Set(Array.isArray(data.player.unlockedSpells) ? data.player.unlockedSpells.filter(id => SPELLS[id]) : ["bolt"]);
  player.unlockedSpells.add("bolt");
  if (!player.unlockedSpells.has(player.selectedSpell)) player.selectedSpell = "bolt";
  player.shield = Math.max(0, Number.isFinite(data.player.shield) ? data.player.shield : 0);
  player.tonics = Math.max(0, data.player.tonics || 0);
  player.crystals = Math.max(0, Math.min(game.crystalsTarget, data.player.crystals || 0));
  player.frame = 0;
  player.anim = 0;
  player.invuln = 0;
  player.dashTimer = 0;
  player.dashCooldown = 0;
  player.attackTimer = 0;
  player.attackCooldown = 0;
  player.attackHitIds.clear();
  player.lastDir = data.player.lastDir || { x: 0, y: 1 };

  crystals.forEach((crystal) => {
    const saved = data.crystals?.find(c => c.id === crystal.id);
    crystal.collected = Boolean(saved?.collected);
  });

  tonics.forEach((tonic) => {
    const saved = data.tonics?.find(t => t.id === tonic.id);
    tonic.collected = Boolean(saved?.collected);
  });

  slimes.forEach((slime, index) => {
    const saved = data.slimes?.find(s => s.id === slime.id);
    const start = SLIME_STARTS[index];
    slime.x = Number.isFinite(saved?.x) ? saved.x : start[0];
    slime.y = Number.isFinite(saved?.y) ? saved.y : start[1];
    slime.vx = Number.isFinite(saved?.vx) ? saved.vx : start[2];
    slime.vy = Number.isFinite(saved?.vy) ? saved.vy : start[3];
    slime.hp = Math.max(0, Math.min(slime.maxHp, Number.isFinite(saved?.hp) ? saved.hp : slime.maxHp));
    slime.stun = Number.isFinite(saved?.stun) ? saved.stun : 0;
  });

  boss.x = Number.isFinite(data.boss?.x) ? data.boss.x : 1130;
  boss.y = Number.isFinite(data.boss?.y) ? data.boss.y : 560;
  boss.hp = Math.max(0, Math.min(boss.maxHp, Number.isFinite(data.boss?.hp) ? data.boss.hp : boss.maxHp));
  boss.active = Boolean(data.boss?.active);
  boss.defeated = Boolean(data.boss?.defeated);
  boss.vx = 0;
  boss.vy = 0;
  boss.stun = 0;
  boss.hurtCooldown = 0;

  particles.length = 0;
  floaters.length = 0;
  messageTimer = 0;
  screenShake = 0;
  saveTimer = 0;
  messageEl.classList.add("hidden");
  gameShell.classList.remove("dialogue-open");
  dialogueOpen = false;
  dialogueEl.classList.add("hidden");

  ensurePlayerWalkable();
  setObjective(objectiveForState());
  updateHud();
  updateCamera();
  return true;
}

function loadSavedGame() {
  const storage = getStorage();
  if (!storage) return false;

  try {
    const parsed = JSON.parse(storage.getItem(SAVE_KEY));
    return applySaveGame(parsed);
  } catch {
    clearSaveGame();
    showMessage("Sauvegarde invalide supprimée", 1.2);
    return false;
  }
}

function openDialogue(lines, onClose = null) {
  const normalized = Array.isArray(lines) ? lines : [lines];
  dialogueQueue = normalized.map(item => {
    if (typeof item === "string") {
      return { portrait: "pensive", name: "Ardamir", text: item };
    }
    return item;
  });
  pendingDialogueClose = onClose;
  dialogueOpen = true;
  gameShell.classList.add("dialogue-open");
  syncQuestPanel();
  showNextDialogueLine();
}

function showNextDialogueLine() {
  if (dialogueQueue.length === 0) {
    closeDialogue();
    return;
  }
  const line = dialogueQueue.shift();
  dialogueName.textContent = line.name || "Ardamir";
  dialogueText.textContent = line.text;
  const portrait = images.portraits[line.portrait || "pensive"];
  dialoguePortrait.src = portrait ? portrait.src : "";
  dialogueEl.classList.remove("hidden");
}

function closeDialogue() {
  if (dialogueQueue.length > 0) {
    showNextDialogueLine();
    return;
  }
  dialogueOpen = false;
  dialogueEl.classList.add("hidden");
  gameShell.classList.remove("dialogue-open");
  syncQuestPanel();
  if (pendingDialogueClose) {
    const fn = pendingDialogueClose;
    pendingDialogueClose = null;
    fn();
  }
}

function playerRectAt(x, y) {
  return {
    x: x + PLAYER_COLLISION.insetX,
    y: y + PLAYER_COLLISION.offsetY,
    w: player.w - PLAYER_COLLISION.insetX * 2,
    h: PLAYER_COLLISION.height
  };
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function sameRect(a, b) {
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

function isForestTavernBuilding(rect) {
  return sameRect(rect, forest.tavernBuilding);
}

function circleRectCollision(cx, cy, r, rect) {
  const testX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const testY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - testX;
  const dy = cy - testY;
  return dx * dx + dy * dy < r * r;
}

function playerDistanceToRect(rect) {
  const pc = playerCenter();
  const closestX = Math.max(rect.x, Math.min(pc.x, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(pc.y, rect.y + rect.h));
  return Math.hypot(pc.x - closestX, pc.y - closestY);
}

function isPlayerNearRect(rect, range = 70) {
  return playerDistanceToRect(rect) <= range;
}

function currentSceneStart() {
  return game.scene === "forest" ? forest.playerStart : tavern.playerStart;
}

function forestDoorPassage() {
  return {
    x: forest.door.x,
    y: forest.door.y,
    w: forest.door.w,
    h: forest.tavernBuilding.y + forest.tavernBuilding.h - forest.door.y + 18
  };
}

function canMoveTo(x, y) {
  const def = sceneDef();
  const rect = playerRectAt(x, y);
  if (x < 0 || y < 0 || x + player.w > def.width || y + player.h > def.height) return false;

  for (const obs of def.obstacles) {
    if (game.scene === "forest" && isForestTavernBuilding(obs)) {
      // door opening cuts a passage in the tavern collision
      const inDoor = rectsOverlap(rect, forestDoorPassage());
      if (inDoor) continue;
    }
    if (rectsOverlap(rect, obs)) return false;
  }
  return true;
}

function ensurePlayerWalkable() {
  if (canMoveTo(player.x, player.y)) return;
  const start = currentSceneStart();
  player.x = start.x;
  player.y = start.y;
}

function tryMove(dx, dy) {
  const nx = player.x + dx;
  const ny = player.y + dy;

  if (canMoveTo(nx, player.y)) player.x = nx;
  if (canMoveTo(player.x, ny)) player.y = ny;
}

function triggerDash() {
  if (!game.started || game.ended || game.paused || dialogueOpen) return;
  if (player.dashCooldown > 0 || player.stamina < 34) {
    showMessage("Énergie insuffisante", 0.75);
    return;
  }

  player.stamina -= 34;
  player.dashTimer = 0.16;
  player.dashCooldown = 0.58;
  player.invuln = Math.max(player.invuln, 0.18);
  spawnParticles(playerCenter().x - player.lastDir.x * 18, playerCenter().y - player.lastDir.y * 18, "#8ff8ff", 9);
  bumpScreen(2);
  updateHud();
}

function useTonic() {
  if (!game.started || game.ended || game.paused || dialogueOpen) return;
  if (player.tonics <= 0) {
    showMessage("Aucun tonic", 0.8);
    return;
  }
  if (player.hp >= player.maxHp && player.stamina >= player.maxStamina) {
    showMessage("Déjà en forme", 0.8);
    return;
  }

  player.tonics -= 1;
  player.hp = Math.min(player.maxHp, player.hp + 2);
  player.stamina = Math.min(player.maxStamina, player.stamina + 45);
  spawnParticles(playerCenter().x, playerCenter().y, "#74df87", 22);
  showMessage("Tonic utilisé", 1);
  updateHud();
  saveGame();
}

function updatePlayer(dt) {
  const previousStamina = Math.round(player.stamina);
  let mx = 0;
  let my = 0;

  if (isMoveActive("up")) my -= 1;
  if (isMoveActive("down")) my += 1;
  if (isMoveActive("left")) mx -= 1;
  if (isMoveActive("right")) mx += 1;

  player.moving = mx !== 0 || my !== 0;

  if (player.moving) {
    const len = Math.hypot(mx, my) || 1;
    mx /= len;
    my /= len;
    player.lastDir.x = mx;
    player.lastDir.y = my;
    const dashMultiplier = player.dashTimer > 0 ? 2.45 : 1;
    tryMove(mx * player.speed * dashMultiplier * dt, my * player.speed * dashMultiplier * dt);

    player.anim += dt;
    if (player.anim > (player.dashTimer > 0 ? 0.045 : 0.085)) {
      player.anim = 0;
      player.frame = (player.frame + 1) % images.walk.length;
    }
  } else {
    player.frame = 0;
  }

  if (player.dashTimer > 0) player.dashTimer -= dt;
  if (player.dashCooldown > 0) player.dashCooldown -= dt;
  if (player.dashTimer <= 0 && player.stamina < player.maxStamina) {
    player.stamina = Math.min(player.maxStamina, player.stamina + (player.moving ? 20 : 34) * dt);
  }
  if (player.invuln > 0) player.invuln -= dt;
  if (player.attackCooldown > 0) player.attackCooldown -= dt;
  if (player.attackTimer > 0) {
    player.attackTimer -= dt;
    checkAttackHits();
  }
  if (Math.round(player.stamina) !== previousStamina) updateHud();
}

function playerCenter() {
  return {
    x: player.x + player.w * 0.5,
    y: player.y + player.h * 0.56
  };
}

function triggerAttack() {
  if (!game.started || game.ended || game.paused || dialogueOpen || player.attackCooldown > 0) return;
  const targetInfo = findNearestCombatTarget();
  if (!targetInfo) {
    showMessage("Aucune cible à portée du bâton", 1);
    return;
  }
  startRhythmCombat(targetInfo.target, targetInfo.type);
}

function findNearestCombatTarget(maxDistance = 320) {
  if (game.scene !== "forest") return null;
  const pc = playerCenter();
  let best = null;

  for (const slime of slimes) {
    if (slime.hp <= 0) continue;
    const d = Math.hypot(pc.x - slime.x, pc.y - slime.y);
    if (d <= maxDistance && (!best || d < best.distance)) {
      best = { target: slime, type: slime.kind || "slime", distance: d };
    }
  }

  if (boss.active && !boss.defeated && boss.hp > 0) {
    const d = Math.hypot(pc.x - boss.x, pc.y - boss.y);
    if (d <= maxDistance && (!best || d < best.distance)) {
      best = { target: boss, type: "boss", distance: d };
    }
  }

  return best;
}

function randomRhythmKey() {
  const options = rhythmKeys();
  return options[Math.floor(Math.random() * options.length)] || "z";
}

function resetRhythmNote() {
  rhythmCombat.noteKey = randomRhythmKey();
  rhythmCombat.noteX = canvas.width - 150;
  rhythmCombat.speed = 280 + Math.min(120, player.level * 12 + rhythmCombat.combo * 8)
    + (rhythmCombat.targetType === "wraith" ? 55 : 0);
}

function startRhythmCombat(target, type) {
  if (!target || rhythmCombat.active) return;

  rhythmCombat.active = true;
  rhythmCombat.target = target;
  rhythmCombat.targetType = type;
  rhythmCombat.enemyDistance = type === "boss" ? 380 : (type === "wraith" ? 320 : 340);
  rhythmCombat.enemyRange = type === "boss" ? 96 : (type === "wraith" ? 84 : 76);
  rhythmCombat.window = type === "wraith" ? 32 : 42;
  rhythmCombat.combo = 0;
  rhythmCombat.misses = 0;
  rhythmCombat.resultTimer = 1;
  rhythmCombat.resultText = `${targetName(type)} ciblé`;
  rhythmCombat.castFlash = 0;
  rhythmCombat.enemyFlash = 0;
  resetRhythmNote();
  showMessage(`Duel magique : ${targetName(type)}`, 1);
}

function targetName(type) {
  if (type === "boss") return "Gardien cristallin";
  if (type === "wraith") return "Spectre d'Aphalone";
  return "Slime d'Aphalone";
}

function currentSpell() {
  return SPELLS[player.selectedSpell] || SPELLS.bolt;
}

function rhythmEnemyScreenPos() {
  const x = 735 - (360 - rhythmCombat.enemyDistance) * 0.55;
  const groundY = 424;
  const y = rhythmCombat.targetType === "boss" ? groundY - 150 : groundY - 90;
  return { x, y };
}

function handleRhythmInput(key) {
  if (!rhythmCombat.active) return false;
  const normalized = normalizeKey(key);
  const distance = Math.abs(rhythmCombat.noteX - rhythmCombat.hitX);

  if (normalized === rhythmCombat.noteKey && distance <= rhythmCombat.window) {
    castRhythmSpell(distance <= rhythmCombat.window * 0.4);
  } else {
    rhythmMiss(normalized === rhythmCombat.noteKey ? "Trop tôt / trop tard" : "Mauvaise touche");
  }
  return true;
}

function castRhythmSpell(perfect = false) {
  const spell = currentSpell();
  rhythmCombat.combo += 1;
  rhythmCombat.resultTimer = 0.8;
  rhythmCombat.resultText = perfect ? `PARFAIT ! ${spell.name}` : `${spell.name} lancé`;
  rhythmCombat.castFlash = perfect ? 0.28 : 0.18;
  player.stamina = Math.max(0, player.stamina - (perfect ? 4 : 8));

  if (spell.shield) player.shield = Math.min(3, player.shield + spell.shield);
  if (spell.heal && player.hp < player.maxHp) {
    player.hp = Math.min(player.maxHp, player.hp + spell.heal);
    const hero = { x: 158, y: 246 };
    spawnFloater(hero.x, hero.y, `+${spell.heal} vie`, "#74df87", { screen: true });
  }

  const bonus = perfect ? 1 : 0;
  if (perfect) {
    spawnFloater(180, 150, "PARFAIT !", "#ffe28c", { screen: true, size: 22, life: 1 });
    spawnParticles(playerCenter().x + 70, playerCenter().y, "#ffe28c", 14);
  }

  dealRhythmDamage(spell.damage + bonus);
  spawnParticles(playerCenter().x + 70, playerCenter().y, "#8ff8ff", 20);
  updateHud();

  if (rhythmCombat.active) resetRhythmNote();
}

function dealRhythmDamage(amount) {
  if (!rhythmCombat.target) return;

  const pos = rhythmEnemyScreenPos();

  if (rhythmCombat.targetType === "boss") {
    let dealt = 0;
    for (let i = 0; i < amount; i++) {
      if (!rhythmCombat.active || boss.hp <= 0) break;
      damageBoss();
      dealt += 1;
    }
    if (dealt > 0) spawnFloater(pos.x, pos.y, `-${dealt}`, "#d5f6ff", { screen: true });
    if (boss.defeated) endRhythmCombat(true);
    return;
  }

  const slime = rhythmCombat.target;
  const before = slime.hp;
  slime.hp = Math.max(0, slime.hp - amount);
  slime.stun = 0.25;
  rhythmCombat.enemyFlash = 0.2;
  spawnParticles(slime.x, slime.y, "#d5f6ff", 18);
  spawnFloater(pos.x, pos.y, `-${before - slime.hp}`, "#d5f6ff", { screen: true });
  bumpScreen(slime.hp <= 0 ? 7 : 3);

  if (slime.hp <= 0) {
    spawnParticles(slime.x, slime.y, "#74df87", 26);
    addXp(slime.kind === "wraith" ? 5 : 3);
    endRhythmCombat(true);
    saveGame();
  }
}

function rhythmMiss(reason) {
  rhythmCombat.combo = 0;
  rhythmCombat.misses += 1;
  rhythmCombat.enemyDistance = Math.max(rhythmCombat.enemyRange - 8, rhythmCombat.enemyDistance - 72);
  rhythmCombat.resultTimer = 0.85;
  rhythmCombat.resultText = reason;
  rhythmCombat.enemyFlash = 0.16;

  if (rhythmCombat.enemyDistance <= rhythmCombat.enemyRange) {
    enemyRhythmAttack();
  } else {
    showMessage("L'ennemi avance", 0.75);
  }

  if (rhythmCombat.active) resetRhythmNote();
}

function enemyRhythmAttack() {
  let damage = rhythmCombat.targetType === "boss" ? 2 : 1;
  if (player.shield > 0) {
    player.shield -= 1;
    damage = Math.max(0, damage - 1);
    showMessage("Voile d'os absorbe le choc", 0.9);
  }

  if (damage > 0) {
    player.hp -= damage;
    player.invuln = 0.5;
    spawnParticles(playerCenter().x, playerCenter().y, "#d94a4a", 24);
    spawnFloater(158, 240, `-${damage}`, "#ff8a8a", { screen: true, size: 20 });
    bumpScreen(player.hp <= 0 ? 14 : 9);
  }

  updateHud();

  if (player.hp <= 0) {
    game.ended = true;
    endRhythmCombat(false);
    openEndOverlay(false);
  } else {
    rhythmCombat.enemyDistance = rhythmCombat.enemyRange + 28;
  }
}

function updateRhythmCombat(dt) {
  if (!rhythmCombat.active) return;
  rhythmCombat.noteX -= rhythmCombat.speed * dt;
  if (rhythmCombat.resultTimer > 0) rhythmCombat.resultTimer -= dt;
  if (rhythmCombat.castFlash > 0) rhythmCombat.castFlash -= dt;
  if (rhythmCombat.enemyFlash > 0) rhythmCombat.enemyFlash -= dt;

  if (!rhythmCombat.target || rhythmCombat.target.hp <= 0) {
    endRhythmCombat(true);
    return;
  }

  if (rhythmCombat.noteX < rhythmCombat.hitX - rhythmCombat.window - 34) {
    rhythmMiss("Sort raté");
  }
}

function endRhythmCombat(victory) {
  rhythmCombat.active = false;
  rhythmCombat.target = null;
  rhythmCombat.targetType = "";
  player.attackCooldown = 0.3;
  updateHud();

  if (victory && !game.ended) {
    showMessage("Duel terminé", 0.9);
  }
}

function addXp(amount) {
  player.xp += amount;
  let leveled = false;

  while (player.xp >= xpToNextLevel()) {
    player.xp -= xpToNextLevel();
    player.level += 1;
    player.spellPoints += 1;
    player.maxHp += player.level % 2 === 0 ? 1 : 0;
    player.hp = player.maxHp;
    player.maxStamina += 8;
    player.stamina = player.maxStamina;
    leveled = true;
  }

  if (leveled) {
    showMessage(`Niveau ${player.level} - point de sort gagné`, 1.4);
  }

  updateHud();
}

function attackPoint() {
  const c = playerCenter();
  return {
    x: c.x + player.lastDir.x * 70,
    y: c.y + player.lastDir.y * 70,
    r: 58
  };
}

function checkAttackHits() {
  if (game.scene !== "forest") return;
  const atk = attackPoint();

  for (const slime of slimes) {
    if (slime.hp <= 0 || player.attackHitIds.has(slime.id)) continue;
    const d = Math.hypot(slime.x - atk.x, slime.y - atk.y);
    if (d < slime.r + atk.r) {
      slime.hp -= 1;
      slime.stun = 0.18;
      player.attackHitIds.add(slime.id);

      const dx = slime.x - playerCenter().x;
      const dy = slime.y - playerCenter().y;
      const len = Math.hypot(dx, dy) || 1;
      slime.x += (dx / len) * 34;
      slime.y += (dy / len) * 34;

      spawnParticles(slime.x, slime.y, "#ffe28c", 16);
      spawnFloater(slime.x, slime.y - slime.r - 6, "-1", "#ffe28c");
      bumpScreen(3);
      showMessage(slime.hp <= 0 ? "Slime vaincu !" : "Touché !", 0.6);

      if (slime.hp <= 0) {
        spawnParticles(slime.x, slime.y, "#74df87", 24);
        addXp(slime.kind === "wraith" ? 3 : 2);
        if (player.hp < player.maxHp && Math.random() < 0.35) {
          player.hp += 1;
          updateHud();
          spawnFloater(playerCenter().x, playerCenter().y - 48, "+1 vie", "#74df87");
          showMessage("+1 vie récupérée", 1);
        }
      }
    }
  }

  if (boss.active && !boss.defeated && !player.attackHitIds.has("boss")) {
    const d = Math.hypot(boss.x - atk.x, boss.y - atk.y);
    if (d < boss.r + atk.r) {
      spawnFloater(boss.x, boss.y - boss.r - 8, "-1", "#d5f6ff");
      damageBoss();
      player.attackHitIds.add("boss");
    }
  }
}

function damageBoss() {
  boss.hp -= 1;
  boss.stun = 0.22;
  boss.hurtCooldown = 0.18;

  const dx = boss.x - playerCenter().x;
  const dy = boss.y - playerCenter().y;
  const len = Math.hypot(dx, dy) || 1;
  boss.x += (dx / len) * 20;
  boss.y += (dy / len) * 20;

  spawnParticles(boss.x, boss.y, "#d5f6ff", 26);
  bumpScreen(boss.hp <= 0 ? 12 : 5);

  if (boss.hp <= 0) {
    boss.hp = 0;
    boss.active = false;
    boss.defeated = true;
    game.quest = "return";
    setObjective("Retourne à la taverne et parle à Jean-Dolmac.");
    spawnParticles(boss.x, boss.y, "#8ff8ff", 48);
    addXp(8);
    openDialogue({ portrait: "surprise", name: "Ardamir", text: "Le gardien s’est dissous. Les cristaux sont calmes maintenant. Direction la taverne." });
    saveGame();
    updateHud();
    return;
  }

  showMessage("Gardien touché !", 0.7);
}

function updateSlimes(dt) {
  if (game.scene !== "forest") return;

  const pc = playerCenter();

  for (const slime of slimes) {
    if (slime.hp <= 0) continue;

    if (slime.stun > 0) {
      slime.stun -= dt;
      continue;
    }

    const isWraith = slime.kind === "wraith";
    const dist = Math.hypot(pc.x - slime.x, pc.y - slime.y);
    if (dist < (isWraith ? 460 : 360)) {
      const dx = (pc.x - slime.x) / (dist || 1);
      const dy = (pc.y - slime.y) / (dist || 1);
      slime.vx += dx * (isWraith ? 135 : 90) * dt;
      slime.vy += dy * (isWraith ? 135 : 90) * dt;
    }

    const speed = Math.hypot(slime.vx, slime.vy) || 1;
    const maxSpeed = (dist < 360 ? 105 : 70) * (isWraith ? 1.5 : 1);
    if (speed > maxSpeed) {
      slime.vx = (slime.vx / speed) * maxSpeed;
      slime.vy = (slime.vy / speed) * maxSpeed;
    }

    slime.x += slime.vx * dt;
    slime.y += slime.vy * dt;

    if (slime.x - slime.r < 40 || slime.x + slime.r > forest.width - 40) slime.vx *= -1;
    if (slime.y - slime.r < 60 || slime.y + slime.r > forest.height - 40) slime.vy *= -1;

    for (const obs of forest.obstacles) {
      if (circleRectCollision(slime.x, slime.y, slime.r, obs)) {
        slime.vx *= -1;
        slime.vy *= -1;
        slime.x += slime.vx * dt * 3;
        slime.y += slime.vy * dt * 3;
        break;
      }
    }

    if (Math.hypot(pc.x - slime.x, pc.y - slime.y) < slime.r + 34 && !rhythmCombat.active) {
      startRhythmCombat(slime, slime.kind || "slime");
      return;
    }
  }
}

function updateBoss(dt) {
  if (game.scene !== "forest" || !boss.active || boss.defeated) return;

  const pc = playerCenter();
  const dist = Math.hypot(pc.x - boss.x, pc.y - boss.y) || 1;

  if (boss.hurtCooldown > 0) boss.hurtCooldown -= dt;
  if (boss.stun > 0) {
    boss.stun -= dt;
  } else {
    boss.vx += ((pc.x - boss.x) / dist) * 140 * dt;
    boss.vy += ((pc.y - boss.y) / dist) * 140 * dt;
  }

  const speed = Math.hypot(boss.vx, boss.vy) || 1;
  const maxSpeed = dist < 420 ? 128 : 88;
  if (speed > maxSpeed) {
    boss.vx = (boss.vx / speed) * maxSpeed;
    boss.vy = (boss.vy / speed) * maxSpeed;
  }

  boss.x += boss.vx * dt;
  boss.y += boss.vy * dt;
  boss.x = Math.max(80, Math.min(forest.width - 80, boss.x));
  boss.y = Math.max(80, Math.min(forest.height - 80, boss.y));

  for (const obs of forest.obstacles) {
    if (circleRectCollision(boss.x, boss.y, boss.r, obs)) {
      boss.vx *= -0.75;
      boss.vy *= -0.75;
      boss.x += boss.vx * dt * 4;
      boss.y += boss.vy * dt * 4;
      break;
    }
  }

  if (dist < boss.r + 42 && !rhythmCombat.active) {
    startRhythmCombat(boss, "boss");
  }
}

function updateCrystals() {
  if (game.scene !== "forest") return;
  if (game.quest === "intro" || game.quest === "done") return;
  const pc = playerCenter();

  for (const crystal of crystals) {
    if (crystal.collected) continue;
    if (Math.hypot(pc.x - crystal.x, pc.y - crystal.y) < 42) {
      crystal.collected = true;
      player.crystals++;
      updateHud();
      spawnParticles(crystal.x, crystal.y, "#8ff8ff", 20);
      spawnFloater(crystal.x, crystal.y - 28, "+1 cristal", "#8ff8ff");
      bumpScreen(2);

      if (player.crystals === 1) {
        openDialogue({ portrait: "joie", name: "Ardamir", text: "Premier cristal récupéré. Plus que quatre. Facile… tant que les slimes restent polis." });
      } else if (player.crystals >= game.crystalsTarget) {
        game.quest = "boss";
        boss.active = true;
        boss.defeated = false;
        boss.hp = boss.maxHp;
        boss.x = 1130;
        boss.y = 560;
        boss.vx = 0;
        boss.vy = 0;
        setObjective("Vaincs le gardien cristallin dans le bois.");
        openDialogue([
          { portrait: "surprise", name: "Ardamir", text: "Cinq cristaux. Mission remplie..." },
          { portrait: "panique", name: "Ardamir", text: "Ah. Non. Évidemment, il y avait un gardien cristallin." }
        ]);
        saveGame();
      } else {
        showMessage(`${player.crystals}/${game.crystalsTarget} cristaux`, 1.1);
      }
      saveGame();
    }
  }
}

function updateTonics() {
  if (game.scene !== "forest" || game.quest === "intro" || game.quest === "done") return;
  const pc = playerCenter();

  for (const tonic of tonics) {
    if (tonic.collected) continue;
    if (Math.hypot(pc.x - tonic.x, pc.y - tonic.y) < 38) {
      tonic.collected = true;
      player.tonics += 1;
      spawnParticles(tonic.x, tonic.y, "#74df87", 18);
      spawnFloater(tonic.x, tonic.y - 24, "+1 tonic", "#74df87");
      showMessage("+1 tonic", 1);
      updateHud();
      saveGame();
    }
  }
}

function interact() {
  if (!game.started || game.ended || game.paused || dialogueOpen) return;

  if (game.scene === "tavern") {
    const distJean = Math.hypot(playerCenter().x - tavern.jean.x, playerCenter().y - tavern.jean.y);

    if (distJean < 105) {
      if (game.quest === "intro") {
        game.quest = "collect";
        setObjective("Sors de la taverne et récupère 5 cristaux.");
        saveGame();
        openDialogue([
          { portrait: "rire", name: "Jean-Dolmac", text: "Bonne nouvelle ! J’ai trouvé une quête simple." },
          { portrait: "perplexe", name: "Ardamir", text: "Pourquoi ai-je l’impression que “simple” veut dire “dangereuse et mal expliquée” ?" },
          { portrait: "pensive", name: "Jean-Dolmac", text: "Il faut récupérer cinq cristaux dans les landes d'Aphalone. Ton bâton de pacte réagira aux menaces." },
          { portrait: "colere", name: "Ardamir", text: "Donc si un slime approche, je gagne le duel au rythme ou il me mord. Très rassurant." }
        ]);
      } else if (game.quest === "collect") {
        openDialogue({ portrait: "pensive", name: "Ardamir", text: "Je dois encore récupérer les cristaux dehors avant de revenir." });
      } else if (game.quest === "boss") {
        openDialogue({ portrait: "panique", name: "Ardamir", text: "Les cristaux ont réveillé un gardien. Je dois le vaincre avant de rendre la quête." });
      } else if (game.quest === "return") {
        game.quest = "done";
        game.ended = true;
        updateHud();
        openDialogue([
          { portrait: "joie", name: "Ardamir", text: "Voilà les cinq cristaux. Et aucun buisson ne m’a vaincue." },
          { portrait: "rire", name: "Jean-Dolmac", text: "Magnifique ! La taverne offre une boisson aux héroïnes couvertes de poussière." },
          { portrait: "amoureuse", name: "Ardamir", text: "Enfin une récompense raisonnable." }
        ], () => openEndOverlay(true));
      }
      return;
    }

    if (isPlayerNearRect(tavern.door, 70)) {
      if (game.quest === "intro") {
        setObjective("Parle à Jean-Dolmac avant de partir dans le bois.");
        openDialogue({ portrait: "perplexe", name: "Ardamir", text: "Mieux vaut parler à Jean-Dolmac avant de sortir. Il a l’air beaucoup trop content de lui." });
        return;
      }

      enterForest();
      return;
    }

    showMessage("Approche-toi de Jean-Dolmac ou de la porte.", 1.2);
  } else {
    if (isPlayerNearRect(forest.door, 70)) {
      if (game.quest === "boss" && boss.active && !boss.defeated) {
        showMessage("Le gardien bloque le retour.", 1.2);
        return;
      }
      enterTavern();
      return;
    }

    if (game.quest === "intro") {
      showMessage("Retourne parler à Jean-Dolmac.", 1.1);
    } else {
      showMessage("Rien à faire ici. Continue l’exploration.", 1.1);
    }
  }
}

function enterForest() {
  if (game.quest === "intro") return;
  game.scene = "forest";
  player.x = forest.playerStart.x;
  player.y = forest.playerStart.y;
  player.lastDir = { x: 0, y: 1 };
  ensurePlayerWalkable();
  updateHud();
  setObjective(objectiveForState());
  showMessage("Landes d'Aphalone", 1);
  saveGame();
}

function enterTavern() {
  game.scene = "tavern";
  player.x = tavern.playerStart.x;
  player.y = tavern.playerStart.y;
  player.lastDir = { x: 0, y: -1 };
  ensurePlayerWalkable();
  updateHud();
  setObjective(game.quest === "return" ? "Parle à Jean-Dolmac." : objectiveForState());
  showMessage("Taverne", 1);
  saveGame();
}

function updateCamera() {
  const def = sceneDef();
  if (game.scene === "tavern") {
    camera.x = 0;
    camera.y = 0;
    return;
  }

  camera.x = player.x + player.w / 2 - canvas.width / 2;
  camera.y = player.y + player.h / 2 - canvas.height / 2;
  camera.x = Math.max(0, Math.min(def.width - canvas.width, camera.x));
  camera.y = Math.max(0, Math.min(def.height - canvas.height, camera.y));
}

function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 40 + Math.random() * 130;
    particles.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 0.35 + Math.random() * 0.4,
      maxLife: 0.7,
      color,
      size: 3 + Math.random() * 4
    });
  }
}

function bumpScreen(amount) {
  screenShake = Math.max(screenShake, amount);
}

function spawnFloater(x, y, text, color, opts = {}) {
  floaters.push({
    x,
    y,
    vy: opts.vy ?? -54,
    life: opts.life ?? 0.85,
    maxLife: opts.life ?? 0.85,
    text,
    color: color || "#fbf3dd",
    size: opts.size ?? 18,
    screen: Boolean(opts.screen)
  });
}

function updateParticles(dt) {
  for (const p of particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 80 * dt;
    p.life -= dt;
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    if (particles[i].life <= 0) particles.splice(i, 1);
  }

  for (const f of floaters) {
    f.y += f.vy * dt;
    f.vy += 36 * dt;
    f.life -= dt;
  }
  for (let i = floaters.length - 1; i >= 0; i--) {
    if (floaters[i].life <= 0) floaters.splice(i, 1);
  }
}

function drawFloaters(screen) {
  ctx.textAlign = "center";
  for (const f of floaters) {
    if (Boolean(f.screen) !== screen) continue;
    const t = Math.max(0, f.life / f.maxLife);
    ctx.globalAlpha = t < 0.4 ? t / 0.4 : 1;
    const x = screen ? f.x : f.x - camera.x;
    const y = screen ? f.y : f.y - camera.y;
    ctx.font = `900 ${f.size}px system-ui`;
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(15,22,32,.85)";
    ctx.strokeText(f.text, x, y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, x, y);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";
}

function update(dt) {
  game.time += dt;
  if (screenShake > 0) screenShake = Math.max(0, screenShake - dt * 24);

  if (messageTimer > 0) {
    messageTimer -= dt;
    if (messageTimer <= 0) messageEl.classList.add("hidden");
  }

  if (!game.started || game.ended || game.paused || dialogueOpen) {
    updateParticles(dt);
    return;
  }

  if (rhythmCombat.active) {
    updateRhythmCombat(dt);
    updateParticles(dt);
    return;
  }

  updatePlayer(dt);
  updateSlimes(dt);
  updateBoss(dt);
  updateCrystals();
  updateTonics();
  updateParticles(dt);
  updateCamera();

  saveTimer += dt;
  if (saveTimer >= 3) {
    saveGame();
    saveTimer = 0;
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (rhythmCombat.active) {
    drawRhythmCombat();
    drawParticles();
    drawFloaters(true);
    drawCanvasHud();
    return;
  }

  ctx.save();
  if (screenShake > 0) {
    ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
  }

  if (game.scene === "tavern") drawTavernScene();
  else drawForestScene();

  drawParticles();
  drawPlayer();
  if (player.attackTimer > 0) drawAttack();
  drawFloaters(false);
  ctx.restore();

  drawCanvasHud();
}

function drawForestScene() {
  ctx.fillStyle = "#c9b184";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawForestTiles();
  drawForestPath();
  drawForestTavern();
  drawObstacles(forest.obstacles, true);
  drawTonics();
  drawCrystals();
  drawSlimes();
  drawBoss();
  drawDoorPrompt(forest.door, "E entrer");
}

function drawForestTiles() {
  const offX = -(camera.x % 120);
  const offY = -(camera.y % 120);
  for (let x = offX; x < canvas.width + 120; x += 120) {
    for (let y = offY; y < canvas.height + 120; y += 120) {
      const gx = x + ((Math.floor((x + camera.x) / 120) + Math.floor((y + camera.y) / 120)) % 2) * 10;
      ctx.fillStyle = "rgba(62, 114, 58, .12)";
      ctx.beginPath();
      ctx.ellipse(gx + 36, y + 34, 34, 18, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255,255,255,.07)";
      ctx.beginPath();
      ctx.arc(gx + 90, y + 82, 12, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawForestPath() {
  ctx.save();
  ctx.translate(-camera.x, -camera.y);
  ctx.strokeStyle = "#ddc69a";
  ctx.lineWidth = 70;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(225, 925);
  ctx.bezierCurveTo(440, 860, 520, 660, 690, 560);
  ctx.bezierCurveTo(880, 450, 1040, 520, 1220, 420);
  ctx.bezierCurveTo(1410, 315, 1540, 420, 1660, 555);
  ctx.stroke();

  ctx.strokeStyle = "rgba(130,91,48,.16)";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();
}

function drawForestTavern() {
  const b = forest.tavernBuilding;
  const x = b.x - camera.x;
  const y = b.y - camera.y;

  ctx.fillStyle = "#6e4532";
  ctx.fillRect(x, y, b.w, b.h);

  ctx.fillStyle = "#8f5f40";
  ctx.beginPath();
  ctx.moveTo(x - 18, y + 18);
  ctx.lineTo(x + b.w / 2, y - 78);
  ctx.lineTo(x + b.w + 18, y + 18);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#3b2419";
  ctx.fillRect(x + 132, y + 120, 68, 95);

  ctx.fillStyle = "#f1dca8";
  ctx.fillRect(x + 45, y + 80, 52, 46);
  ctx.fillRect(x + 216, y + 80, 52, 46);

  ctx.fillStyle = "#fbf3dd";
  ctx.font = "bold 18px system-ui";
  ctx.fillText("TAVERNE", x + 96, y + 35);
  ctx.font = "bold 13px system-ui";
  ctx.fillText("La Licorne Mouillée", x + 66, y + 56);
}

function drawTavernScene() {
  // floor
  ctx.fillStyle = "#9a6a43";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // planks
  for (let y = 32; y < canvas.height; y += 42) {
    ctx.fillStyle = y % 84 === 0 ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.05)";
    ctx.fillRect(0, y, canvas.width, 4);
  }
  for (let x = 0; x < canvas.width; x += 110) {
    ctx.fillStyle = "rgba(0,0,0,.045)";
    ctx.fillRect(x, 32, 4, canvas.height - 64);
  }

  drawTavernWalls();
  drawTavernObjects();
  drawJean();
  drawDoorPrompt(tavern.door, "E sortir");
}

function drawTavernWalls() {
  ctx.fillStyle = "#56331f";
  ctx.fillRect(0, 0, 960, 32);
  ctx.fillRect(0, 0, 32, 540);
  ctx.fillRect(928, 0, 32, 540);
  ctx.fillRect(0, 518, 420, 22);
  ctx.fillRect(540, 518, 420, 22);

  ctx.fillStyle = "#2b1b12";
  ctx.fillRect(425, 504, 110, 36);
  ctx.fillStyle = "#f4d18a";
  ctx.font = "bold 16px system-ui";
  ctx.fillText("SORTIE", 452, 498);
}

function drawTavernObjects() {
  // counter
  ctx.fillStyle = "#5a321f";
  ctx.beginPath();
  ctx.roundRect(70, 70, 250, 66, 16);
  ctx.fill();
  ctx.fillStyle = "#c28b4f";
  ctx.fillRect(92, 86, 205, 14);

  // fireplace
  ctx.fillStyle = "#3c2b22";
  ctx.beginPath();
  ctx.roundRect(780, 62, 90, 110, 16);
  ctx.fill();
  ctx.fillStyle = "#ffb347";
  ctx.beginPath();
  ctx.moveTo(825, 140);
  ctx.bezierCurveTo(790, 108, 827, 104, 816, 78);
  ctx.bezierCurveTo(858, 105, 852, 118, 825, 140);
  ctx.fill();

  // tables
  drawTable(108, 232, 126, 76);
  drawTable(708, 236, 126, 76);
  drawTable(350, 350, 260, 62);

  // rug
  ctx.fillStyle = "#163f70";
  ctx.beginPath();
  ctx.roundRect(370, 165, 220, 95, 22);
  ctx.fill();
  ctx.strokeStyle = "#d99b27";
  ctx.lineWidth = 5;
  ctx.stroke();
}

function drawTable(x, y, w, h) {
  ctx.fillStyle = "#5a321f";
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 18);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.08)";
  ctx.fillRect(x + 14, y + 12, w - 28, 8);

  ctx.fillStyle = "#2b1b12";
  ctx.fillRect(x + 10, y + h - 8, 12, 32);
  ctx.fillRect(x + w - 22, y + h - 8, 12, 32);
}

function drawJean() {
  const x = tavern.jean.x - camera.x;
  const y = tavern.jean.y - camera.y;

  ctx.fillStyle = "#522a78";
  ctx.beginPath();
  ctx.arc(x, y, tavern.jean.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f0d2a3";
  ctx.beginPath();
  ctx.arc(x, y - 8, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 14px system-ui";
  ctx.fillText("Jean-Dolmac", x - 42, y - 36);

  const d = Math.hypot(playerCenter().x - tavern.jean.x, playerCenter().y - tavern.jean.y);
  if (d < 105 && !dialogueOpen && !game.ended) {
    speechBubble(x - 42, y - 78, "E parler");
  }
}

function drawObstacles(obstacles, skipTavern) {
  for (const obs of obstacles) {
    if (skipTavern && isForestTavernBuilding(obs)) continue;
    const x = obs.x - camera.x;
    const y = obs.y - camera.y;

    ctx.fillStyle = "#466f38";
    ctx.beginPath();
    ctx.roundRect(x, y, obs.w, obs.h, 28);
    ctx.fill();

    for (let i = 0; i < Math.max(4, Math.floor(obs.w / 55)); i++) {
      ctx.fillStyle = i % 2 ? "#5f8745" : "#3f6533";
      ctx.beginPath();
      ctx.arc(x + 28 + i * 42, y + 30 + (i % 3) * 18, 18, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawCrystals() {
  for (const c of crystals) {
    if (c.collected) continue;
    const x = c.x - camera.x;
    const y = c.y - camera.y;
    const pulse = 1 + Math.sin(game.time * 5 + c.x) * .08;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = "rgba(110,240,255,.24)";
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#84f6ff";
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(15, -2);
    ctx.lineTo(0, 24);
    ctx.lineTo(-15, -2);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}

function drawTonics() {
  for (const tonic of tonics) {
    if (tonic.collected) continue;
    const x = tonic.x - camera.x;
    const y = tonic.y - camera.y;
    const pulse = 1 + Math.sin(game.time * 4 + tonic.x) * .06;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = "rgba(116,223,135,.20)";
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#2a8f59";
    ctx.beginPath();
    ctx.roundRect(-10, -15, 20, 30, 6);
    ctx.fill();
    ctx.fillStyle = "#d8fff0";
    ctx.fillRect(-6, -9, 12, 4);
    ctx.fillStyle = "#74df87";
    ctx.beginPath();
    ctx.arc(0, 3, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawSlimes() {
  for (const s of slimes) {
    if (s.hp <= 0) continue;
    const x = s.x - camera.x;
    const y = s.y - camera.y;

    if (s.kind === "wraith") drawWraithBody(x, y, s);
    else drawSlimeBody(x, y, s);

    // hp bar
    ctx.fillStyle = "rgba(0,0,0,.32)";
    ctx.fillRect(x - 24, y - s.r - 16, 48, 6);
    ctx.fillStyle = s.kind === "wraith" ? "#b07bdc" : "#e34d4d";
    ctx.fillRect(x - 24, y - s.r - 16, 48 * (s.hp / s.maxHp), 6);
  }
}

function drawSlimeBody(x, y, s) {
  ctx.fillStyle = s.stun > 0 ? "#a5f293" : "#39a95b";
  ctx.beginPath();
  ctx.arc(x, y, s.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x - 8, y - 5, 5, 0, Math.PI * 2);
  ctx.arc(x + 8, y - 5, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#1c2a21";
  ctx.beginPath();
  ctx.arc(x - 8, y - 4, 2, 0, Math.PI * 2);
  ctx.arc(x + 8, y - 4, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#1f5d32";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y + 4, 10, 0.2, Math.PI - 0.2);
  ctx.stroke();
}

function drawWraithBody(x, y, s) {
  const bob = Math.sin(game.time * 3 + s.x) * 5;
  const cy = y + bob;
  const r = s.r;

  ctx.save();
  // aura
  ctx.fillStyle = "rgba(176,123,220,.16)";
  ctx.beginPath();
  ctx.arc(x, cy, r + 10, 0, Math.PI * 2);
  ctx.fill();

  // hooded body: rounded top, wavy tattered hem
  ctx.fillStyle = s.stun > 0 ? "#d7b6f2" : "#7b54a8";
  ctx.beginPath();
  ctx.arc(x, cy, r, Math.PI, 0);
  const hem = cy + r;
  const seg = (r * 2) / 4;
  for (let i = 0; i <= 4; i++) {
    const px = x + r - i * seg;
    const py = hem + (i % 2 === 0 ? 8 : -2);
    ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  // glowing eyes
  ctx.fillStyle = "#e9d8ff";
  ctx.beginPath();
  ctx.arc(x - 7, cy - 3, 3.4, 0, Math.PI * 2);
  ctx.arc(x + 7, cy - 3, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3a1d63";
  ctx.beginPath();
  ctx.arc(x - 7, cy - 3, 1.5, 0, Math.PI * 2);
  ctx.arc(x + 7, cy - 3, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBoss() {
  if (!boss.active || boss.defeated) return;
  const x = boss.x - camera.x;
  const y = boss.y - camera.y;
  const pulse = 1 + Math.sin(game.time * 6) * .04;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pulse, pulse);

  ctx.fillStyle = boss.hurtCooldown > 0 ? "#e9fbff" : "#78d8f2";
  ctx.beginPath();
  ctx.moveTo(0, -boss.r);
  ctx.lineTo(boss.r * 0.78, -boss.r * 0.12);
  ctx.lineTo(boss.r * 0.46, boss.r * 0.88);
  ctx.lineTo(-boss.r * 0.46, boss.r * 0.88);
  ctx.lineTo(-boss.r * 0.78, -boss.r * 0.12);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = "#0d3b4d";
  ctx.beginPath();
  ctx.arc(-12, -6, 5, 0, Math.PI * 2);
  ctx.arc(12, -6, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(13,59,77,.85)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 8, 14, 0.15, Math.PI - 0.15);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = "rgba(0,0,0,.36)";
  ctx.fillRect(x - 48, y - boss.r - 22, 96, 8);
  ctx.fillStyle = "#78d8f2";
  ctx.fillRect(x - 48, y - boss.r - 22, 96 * (boss.hp / boss.maxHp), 8);
}

function drawDoorPrompt(door, text) {
  if (!door) return;
  if (isPlayerNearRect(door, 70) && !dialogueOpen && !game.ended) {
    const x = door.x + door.w / 2 - camera.x;
    const y = door.y - 20 - camera.y;
    speechBubble(x - 36, y - 18, text);
  }
}

function speechBubble(x, y, text) {
  ctx.fillStyle = "rgba(255,255,255,.96)";
  ctx.beginPath();
  ctx.roundRect(x, y, 92, 30, 14);
  ctx.fill();
  ctx.fillStyle = "#082d53";
  ctx.font = "bold 14px system-ui";
  ctx.fillText(text, x + 14, y + 20);
}

function drawPlayer() {
  const img = images.walk[player.frame] || images.walk[0];
  const x = player.x - camera.x;
  const y = player.y - camera.y;
  const drawX = x - 28;
  const drawY = y - 22;

  ctx.save();
  ctx.fillStyle = "rgba(19, 28, 34, .24)";
  ctx.beginPath();
  ctx.ellipse(x + player.w * 0.5, y + player.h + 26, 38, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  if (player.invuln > 0 && Math.floor(player.invuln * 14) % 2 === 0) {
    ctx.globalAlpha = 0.55;
  }

  if (player.lastDir.x < -0.15) {
    ctx.translate(drawX + 132, drawY);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0, 132, 180);
  } else {
    ctx.drawImage(img, drawX, drawY, 132, 180);
  }
  ctx.restore();
}

function drawAttack() {
  const atk = attackPoint();
  const x = atk.x - camera.x;
  const y = atk.y - camera.y;
  const dirAng = Math.atan2(player.lastDir.y, player.lastDir.x);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(dirAng);
  ctx.globalAlpha = 0.78;
  ctx.fillStyle = "rgba(255, 218, 96, .45)";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, atk.r, -0.8, 0.8);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#fff0a8";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, atk.r, -0.8, 0.8);
  ctx.stroke();
  ctx.restore();
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x - camera.x, p.y - camera.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawRhythmCombat() {
  const spell = currentSpell();
  const targetType = rhythmCombat.targetType;
  const enemyX = 735 - (360 - rhythmCombat.enemyDistance) * 0.55;
  const groundY = 424;

  ctx.fillStyle = "#1d2630";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#253f48";
  ctx.fillRect(0, 350, canvas.width, 190);
  ctx.fillStyle = "#16262f";
  ctx.fillRect(0, groundY, canvas.width, 116);

  ctx.fillStyle = "rgba(143,248,255,.08)";
  for (let i = 0; i < 9; i++) {
    ctx.beginPath();
    ctx.arc(120 + i * 110, 90 + Math.sin(game.time + i) * 10, 40, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#fbf3dd";
  ctx.font = "bold 18px system-ui";
  ctx.fillText("Duel de pacte - Aphalone", 32, 44);
  ctx.fillStyle = "#aab7c4";
  ctx.font = "bold 13px system-ui";
  ctx.fillText(`Sort préparé : ${spell.name}`, 32, 68);

  const img = images.walk[player.frame] || images.walk[0];
  const heroY = groundY - 178;
  ctx.save();
  if (rhythmCombat.castFlash > 0) ctx.shadowBlur = 24;
  ctx.shadowColor = "#8ff8ff";
  ctx.drawImage(img, 92, heroY, 132, 180);
  ctx.restore();

  drawRhythmEnemy(enemyX, groundY, targetType);

  ctx.fillStyle = "rgba(255,255,255,.92)";
  ctx.beginPath();
  ctx.roundRect(150, 116, 660, 94, 12);
  ctx.fill();

  ctx.fillStyle = "#657184";
  ctx.font = "bold 12px system-ui";
  ctx.fillText("RYTHME", 168, 140);

  const laneY = 170;
  ctx.strokeStyle = "rgba(23,32,43,.22)";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(190, laneY);
  ctx.lineTo(768, laneY);
  ctx.stroke();

  ctx.strokeStyle = "#d99b27";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(rhythmCombat.hitX - rhythmCombat.window, laneY - 34, rhythmCombat.window * 2, 68, 8);
  ctx.stroke();

  ctx.fillStyle = "#123d54";
  ctx.beginPath();
  ctx.roundRect(rhythmCombat.noteX - 24, laneY - 24, 48, 48, 8);
  ctx.fill();
  ctx.fillStyle = "white";
  ctx.font = "bold 22px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(formatKey(rhythmCombat.noteKey), rhythmCombat.noteX, laneY + 8);
  ctx.textAlign = "left";

  if (rhythmCombat.resultTimer > 0) {
    ctx.fillStyle = rhythmCombat.resultText.includes("raté") || rhythmCombat.resultText.includes("Mauvaise") || rhythmCombat.resultText.includes("tard")
      ? "#b93535"
      : "#246d53";
    ctx.font = "bold 18px system-ui";
    ctx.fillText(rhythmCombat.resultText, 168, 202);
  }

  ctx.fillStyle = "rgba(255,255,255,.88)";
  ctx.beginPath();
  ctx.roundRect(330, 424, 300, 30, 10);
  ctx.fill();
  ctx.fillStyle = rhythmCombat.enemyDistance <= rhythmCombat.enemyRange ? "#b93535" : "#246d53";
  ctx.fillRect(340, 435, Math.max(0, Math.min(280, rhythmCombat.enemyDistance - rhythmCombat.enemyRange)), 8);
  ctx.fillStyle = "#17202b";
  ctx.font = "bold 12px system-ui";
  ctx.fillText("Distance ennemie", 340, 418);

  if (player.shield > 0) {
    ctx.fillStyle = "#8ff8ff";
    ctx.font = "bold 14px system-ui";
    ctx.fillText(`Voile d'os x${player.shield}`, 92, heroY - 14);
  }

  if (rhythmCombat.target) {
    ctx.fillStyle = "#fbf3dd";
    ctx.font = "bold 14px system-ui";
    ctx.fillText(`${targetName(targetType)} ${rhythmCombat.target.hp}/${rhythmCombat.target.maxHp}`, enemyX - 52, groundY - 162);
  }
}

function drawRhythmEnemy(x, groundY, type) {
  if (type === "boss") {
    const y = groundY - 92;
    ctx.save();
    ctx.translate(x, y);
    if (rhythmCombat.enemyFlash > 0) ctx.scale(1.08, 1.08);
    ctx.fillStyle = rhythmCombat.enemyFlash > 0 ? "#e9fbff" : "#78d8f2";
    ctx.beginPath();
    ctx.moveTo(0, -60);
    ctx.lineTo(58, -6);
    ctx.lineTo(34, 70);
    ctx.lineTo(-34, 70);
    ctx.lineTo(-58, -6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = "#0d3b4d";
    ctx.beginPath();
    ctx.arc(-16, -10, 6, 0, Math.PI * 2);
    ctx.arc(16, -10, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (type === "wraith") {
    const bob = Math.sin(game.time * 3) * 8;
    const y = groundY - 70 + bob;
    ctx.save();
    ctx.translate(x, y);
    if (rhythmCombat.enemyFlash > 0) ctx.scale(1.08, 1.08);
    ctx.fillStyle = "rgba(176,123,220,.18)";
    ctx.beginPath();
    ctx.arc(0, 0, 56, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = rhythmCombat.enemyFlash > 0 ? "#e4ccff" : "#7b54a8";
    ctx.beginPath();
    ctx.arc(0, 0, 42, Math.PI, 0);
    const hem = 42;
    for (let i = 0; i <= 5; i++) {
      const px = 42 - i * (84 / 5);
      const py = hem + (i % 2 === 0 ? 16 : -2);
      ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#e9d8ff";
    ctx.beginPath();
    ctx.arc(-13, -6, 6, 0, Math.PI * 2);
    ctx.arc(13, -6, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3a1d63";
    ctx.beginPath();
    ctx.arc(-13, -6, 2.6, 0, Math.PI * 2);
    ctx.arc(13, -6, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  const y = groundY - 44;
  ctx.save();
  ctx.translate(x, y);
  if (rhythmCombat.enemyFlash > 0) ctx.scale(1.08, .94);
  ctx.fillStyle = rhythmCombat.enemyFlash > 0 ? "#a5f293" : "#39a95b";
  ctx.beginPath();
  ctx.arc(0, 0, 36, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(-12, -8, 7, 0, Math.PI * 2);
  ctx.arc(12, -8, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1c2a21";
  ctx.beginPath();
  ctx.arc(-12, -7, 3, 0, Math.PI * 2);
  ctx.arc(12, -7, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCanvasHud() {
  ctx.fillStyle = "rgba(255,255,255,.92)";
  ctx.beginPath();
  ctx.roundRect(14, 14, 365, 74, 18);
  ctx.fill();

  ctx.fillStyle = "#657184";
  ctx.font = "bold 12px system-ui";
  ctx.fillText("OBJECTIF", 28, 36);

  ctx.fillStyle = "#17202b";
  ctx.font = "bold 17px system-ui";
  wrapText(ctx, objectiveText.textContent, 28, 62, 325, 20);

  for (let i = 0; i < player.maxHp; i++) {
    const hx = canvas.width - 160 + i * 27;
    const hy = 32;
    ctx.fillStyle = i < player.hp ? "#d94949" : "rgba(217,73,73,.18)";
    drawHeart(hx, hy, 10);
  }

  if (player.attackCooldown > 0) {
    ctx.fillStyle = "rgba(255,255,255,.75)";
    ctx.beginPath();
    ctx.roundRect(canvas.width - 190, 58, 170, 20, 10);
    ctx.fill();

    ctx.fillStyle = "#d99b27";
    ctx.beginPath();
    ctx.roundRect(canvas.width - 186, 62, 162 * (1 - player.attackCooldown / 0.38), 12, 6);
    ctx.fill();
  }

  ctx.fillStyle = "rgba(255,255,255,.80)";
  ctx.beginPath();
  ctx.roundRect(canvas.width - 190, 84, 170, 20, 10);
  ctx.fill();

  ctx.fillStyle = player.stamina >= 34 ? "#246d53" : "#b93535";
  ctx.beginPath();
  ctx.roundRect(canvas.width - 186, 88, 162 * (player.stamina / player.maxStamina), 12, 6);
  ctx.fill();

  ctx.fillStyle = "#17202b";
  ctx.font = "bold 11px system-ui";
  ctx.fillText("ÉNERGIE", canvas.width - 184, 80);

  drawMiniMap();
}

function drawMiniMap() {
  const w = 168;
  const h = 106;
  const x = canvas.width - w - 20;
  const y = 120;
  const def = sceneDef();
  const scaleX = w / def.width;
  const scaleY = h / def.height;

  ctx.fillStyle = "rgba(255,255,255,.88)";
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = "rgba(23,32,43,.16)";
  ctx.stroke();

  ctx.fillStyle = "#657184";
  ctx.font = "bold 11px system-ui";
  ctx.fillText("CARTE", x + 10, y + 18);

  const mapPoint = (worldX, worldY, color, radius = 3) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + worldX * scaleX, y + worldY * scaleY, radius, 0, Math.PI * 2);
    ctx.fill();
  };

  if (game.scene === "forest") {
    ctx.fillStyle = "rgba(36,109,83,.16)";
    ctx.fillRect(x + forest.tavernBuilding.x * scaleX, y + forest.tavernBuilding.y * scaleY, forest.tavernBuilding.w * scaleX, forest.tavernBuilding.h * scaleY);
    crystals.forEach(c => { if (!c.collected) mapPoint(c.x, c.y, "#22b8c7", 2.5); });
    tonics.forEach(t => { if (!t.collected) mapPoint(t.x, t.y, "#2a8f59", 2.5); });
    slimes.forEach(s => { if (s.hp > 0) mapPoint(s.x, s.y, "#39a95b", 2.2); });
    if (boss.active && !boss.defeated) mapPoint(boss.x, boss.y, "#78d8f2", 5);
  } else {
    mapPoint(tavern.jean.x, tavern.jean.y, "#522a78", 4);
    ctx.fillStyle = "rgba(217,155,39,.24)";
    ctx.fillRect(x + tavern.door.x * scaleX, y + tavern.door.y * scaleY, Math.max(4, tavern.door.w * scaleX), Math.max(3, tavern.door.h * scaleY));
  }

  const pc = playerCenter();
  mapPoint(pc.x, pc.y, "#d94949", 4);
}

function wrapText(context, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = context.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      context.fillText(line, x, y);
      line = words[n] + " ";
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  context.fillText(line, x, y);
}

function drawHeart(x, y, size) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.bezierCurveTo(x - size, y - size, x - size * 2, y + size * 0.7, x, y + size * 1.8);
  ctx.bezierCurveTo(x + size * 2, y + size * 0.7, x + size, y - size, x, y);
  ctx.fill();
}

function wirePauseButtons() {
  const resumeBtn = document.querySelector("#resumeBtn");
  const newGameBtn = document.querySelector("#newGameBtn");
  const saveBtn = document.querySelector("#saveBtn");

  if (resumeBtn) {
    resumeBtn.addEventListener("click", () => {
      game.paused = false;
      overlay.classList.remove("show");
      canvas.focus();
      updateHud();
    });
  }

  if (newGameBtn) {
    newGameBtn.addEventListener("click", () => {
      overlay.classList.remove("show");
      canvas.focus();
      resetGame();
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      saveGame();
      showMessage("Partie sauvegardée", 1);
    });
  }
}

function openPauseOverlay() {
  if (!game.started || game.ended || dialogueOpen) return;
  game.paused = true;
  saveGame();
  updateHud();
  overlay.classList.add("show");
  overlay.querySelector(".panel").innerHTML = `
    <img class="panel-portrait" src="assets/portraits/pensive.png" alt="" />
    <div>
      <h2>Pause</h2>
      <p>La partie est sauvegardée localement. Reprends maintenant ou relance une nouvelle aventure.</p>
    </div>
    <div class="panel-actions">
      <button id="resumeBtn" class="primary">Reprendre</button>
      <button id="saveBtn" class="secondary">Sauvegarder</button>
      <button id="newGameBtn" class="secondary">Nouvelle partie</button>
    </div>
  `;
  wirePauseButtons();
}

function togglePause() {
  if (!game.started || game.ended || dialogueOpen) return;
  if (game.paused) {
    game.paused = false;
    overlay.classList.remove("show");
    canvas.focus();
    updateHud();
  } else {
    openPauseOverlay();
  }
}

function openEndOverlay(win) {
  if (win) clearSaveGame();
  overlay.classList.add("show");
  overlay.querySelector(".panel").innerHTML = win ? `
    <img class="panel-portrait" src="assets/portraits/joie.png" alt="" />
    <div>
      <h2>Victoire</h2>
      <p>Ardamir a maîtrisé les cristaux d'Aphalone, vaincu le gardien au rythme de son bâton de pacte et ramené la lumière à la taverne.</p>
    </div>
    <button id="restartBtn" class="primary">Rejouer</button>
  ` : `
    <img class="panel-portrait" src="assets/portraits/panique.png" alt="" />
    <div>
      <h2>Défaite</h2>
      <p>Ardamir a perdu le rythme du pacte. Rejoue en frappant les touches au centre de la jauge avant que l'ennemi approche.</p>
    </div>
    <button id="restartBtn" class="primary">Rejouer</button>
  `;
  document.querySelector("#restartBtn").addEventListener("click", () => {
    overlay.classList.remove("show");
    canvas.focus();
    resetGame();
  });
}

function resetGame() {
  game.started = true;
  game.ended = false;
  game.paused = false;
  game.scene = "tavern";
  game.quest = "intro";
  game.time = 0;

  Object.keys(keys).forEach((key) => { keys[key] = false; });
  Object.keys(heldControls).forEach((key) => { heldControls[key] = false; });
  document.querySelectorAll(".touch-controls button").forEach((button) => button.classList.remove("is-held"));

  player.x = tavern.playerStart.x;
  player.y = tavern.playerStart.y;
  player.maxHp = 5;
  player.hp = player.maxHp;
  player.maxStamina = 100;
  player.stamina = player.maxStamina;
  player.level = 1;
  player.xp = 0;
  player.spellPoints = 0;
  player.selectedSpell = "bolt";
  player.unlockedSpells = new Set(["bolt"]);
  player.shield = 0;
  player.tonics = 0;
  player.crystals = 0;
  player.frame = 0;
  player.anim = 0;
  player.invuln = 0;
  player.dashTimer = 0;
  player.dashCooldown = 0;
  player.attackTimer = 0;
  player.attackCooldown = 0;
  player.lastDir = { x: 0, y: -1 };

  crystals.forEach(c => c.collected = false);
  tonics.forEach(t => t.collected = false);

  slimes.forEach((s, i) => {
    s.x = SLIME_STARTS[i][0];
    s.y = SLIME_STARTS[i][1];
    s.vx = SLIME_STARTS[i][2];
    s.vy = SLIME_STARTS[i][3];
    s.hp = s.maxHp;
    s.stun = 0;
  });

  boss.x = 1130;
  boss.y = 560;
  boss.hp = boss.maxHp;
  boss.vx = 0;
  boss.vy = 0;
  boss.stun = 0;
  boss.hurtCooldown = 0;
  boss.active = false;
  boss.defeated = false;

  rhythmCombat.active = false;
  rhythmCombat.target = null;
  rhythmCombat.targetType = "";

  particles.length = 0;
  floaters.length = 0;
  messageTimer = 0;
  screenShake = 0;
  saveTimer = 0;
  messageEl.classList.add("hidden");

  setObjective("Parle à Jean-Dolmac dans la taverne.");
  ensurePlayerWalkable();
  updateHud();
  updateCamera();
  saveGame();

  openDialogue([
    { portrait: "surprise", name: "Ardamir", text: "Le bâton de pacte vibre depuis mon arrivée à Aphalone. Mauvais signe." },
    { portrait: "pensive", name: "Ardamir", text: "Jean-Dolmac m’attend à la taverne. Je devrais lui parler avant de sortir." }
  ]);
}

function loop(ts) {
  const dt = Math.min((ts - lastTime) / 1000, 0.033);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

let lastTime = 0;

window.addEventListener("keydown", (event) => {
  const key = normalizeKey(event.key);

  if (rebindingAction) {
    event.preventDefault();
    controls[rebindingAction] = key;
    rebindingAction = null;
    saveControls();
    renderSettingsPanel();
    return;
  }

  keys[key] = true;

  if ((movementKeys.has(key) || Object.values(controls).includes(key)) && game.started) {
    event.preventDefault();
  }

  if (matchesAction(key, "pause") || key === "p") {
    event.preventDefault();
    togglePause();
    return;
  }

  if (game.paused) {
    event.preventDefault();
    return;
  }

  if (dialogueOpen && (isMoveKey(key) || matchesAction(key, "interact") || matchesAction(key, "cast") || key === "enter" || key === " ")) {
    event.preventDefault();
    closeDialogue();
    return;
  }

  if (rhythmCombat.active) {
    event.preventDefault();
    handleRhythmInput(key);
    return;
  }

  if (matchesAction(key, "cast") && !dialogueOpen) {
    event.preventDefault();
    triggerAttack();
  }

  if (matchesAction(key, "interact")) {
    event.preventDefault();
    interact();
  }

  if (matchesAction(key, "dash") || key === "x") {
    event.preventDefault();
    triggerDash();
  }

  if (matchesAction(key, "tonic")) {
    event.preventDefault();
    useTonic();
  }
});

window.addEventListener("keyup", (event) => {
  keys[normalizeKey(event.key)] = false;
});

window.addEventListener("blur", () => {
  Object.keys(keys).forEach((key) => { keys[key] = false; });
  Object.keys(heldControls).forEach((key) => { heldControls[key] = false; });
  document.querySelectorAll(".touch-controls button").forEach((button) => button.classList.remove("is-held"));
});

function updateMouseFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  mouse.x = (event.clientX - rect.left) * (canvas.width / rect.width);
  mouse.y = (event.clientY - rect.top) * (canvas.height / rect.height);
}

canvas.addEventListener("mousemove", (event) => {
  updateMouseFromEvent(event);
});

canvas.addEventListener("mousedown", (event) => {
  if (event.button !== 0) return;
  event.preventDefault();
  canvas.focus();
  updateMouseFromEvent(event);

  if (dialogueOpen) {
    closeDialogue();
    return;
  }

  const pc = playerCenter();
  const worldMouseX = mouse.x + camera.x;
  const worldMouseY = mouse.y + camera.y;
  const dx = worldMouseX - pc.x;
  const dy = worldMouseY - pc.y;
  const len = Math.hypot(dx, dy) || 1;
  player.lastDir.x = dx / len;
  player.lastDir.y = dy / len;
  triggerAttack();
});

function releaseHeldControl(direction, button) {
  heldControls[direction] = false;
  button.classList.remove("is-held");
}

document.querySelectorAll("[data-hold]").forEach((button) => {
  const direction = button.dataset.hold;

  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    canvas.focus();
    if (dialogueOpen) {
      closeDialogue();
      return;
    }
    if (rhythmCombat.active) {
      handleRhythmInput(controls[direction]);
      return;
    }
    if (button.setPointerCapture) button.setPointerCapture(event.pointerId);
    heldControls[direction] = true;
    button.classList.add("is-held");
  });

  ["pointerup", "pointercancel", "pointerleave"].forEach((type) => {
    button.addEventListener(type, () => releaseHeldControl(direction, button));
  });
});

document.querySelectorAll("[data-action]").forEach((button) => {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    canvas.focus();

    if (dialogueOpen) {
      closeDialogue();
      return;
    }

    if (button.dataset.action === "attack") triggerAttack();
    if (button.dataset.action === "dash") triggerDash();
    if (button.dataset.action === "interact") interact();
  });
});

dialogueEl.addEventListener("click", closeDialogue);

function wireStartPanel() {
  startBtn = document.querySelector("#startBtn");
  continueBtn = document.querySelector("#continueBtn");
  settingsBtn = document.querySelector("#settingsBtn");

  if (startBtn) {
    startBtn.addEventListener("click", () => {
      overlay.classList.remove("show");
      canvas.focus();
      resetGame();
    });
  }

  if (continueBtn) {
    continueBtn.addEventListener("click", () => {
      if (loadSavedGame()) {
        overlay.classList.remove("show");
        canvas.focus();
        showMessage("Sauvegarde chargée", 1);
      }
    });
  }

  if (settingsBtn) {
    settingsBtn.addEventListener("click", openSettingsOverlay);
  }
}

if (sidebarSettingsBtn) {
  sidebarSettingsBtn.addEventListener("click", openSettingsOverlay);
}

spellButtons.forEach((button) => {
  button.addEventListener("click", () => selectOrUnlockSpell(button.dataset.spell));
});

loadControls();
wireStartPanel();

loadAssets().then(() => {
  refreshContinueButton();
  updateHud();
  requestAnimationFrame(loop);
}).catch(err => {
  console.error(err);
  overlay.classList.add("show");
  overlay.querySelector(".panel").innerHTML = `
    <div class="panel-full">
      <h2>Erreur de chargement</h2>
      <p>Impossible de charger certains assets.</p>
      <p>${err.message}</p>
    </div>
  `;
});
