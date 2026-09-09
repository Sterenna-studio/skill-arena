/**
 * Drone Quota — whack-a-mole roguelite à quotas.
 *
 * Structure : un round dure quelques dizaines de secondes et se termine sur un
 * palier à régler. Trois rounds forment une manche ; entre deux rounds d'une
 * même manche il n'y a qu'un souffle, et l'atelier n'ouvre qu'en fin de manche.
 * Pas de vies : la pression, c'est le temps et le quota. Se tromper coûte des
 * secondes, jamais un compteur de cœurs.
 *
 * La banque paie le palier *et* achète les nœuds de l'arbre, qui sont
 * définitifs. Tout le dilemme est là — investir, c'est reculer sur la facture
 * suivante.
 *
 * Autonome : aucune dépendance, aucun appel réseau, progression en
 * localStorage. Rien à voir avec le wallet Star Tokens de l'arcade.
 */
(() => {
  'use strict';

  const SAVE_KEY = 'drone-quota:v1';

  // La couche sensorielle est optionnelle : si fx.js n'a pas chargé, le jeu
  // doit rester jouable en silence plutôt que planter au premier clic.
  const FX = window.DQFX ?? {
    sfx: new Proxy({}, { get: () => () => {} }),
    hum() {}, setMuted() { return true; }, isMuted: () => true, unlock() {},
    attach() {}, resize() {}, burst() {}, tracer() {}, shake() {}, clear() {},
    scar() {}, clearScars() {}, centerOf: () => ({ x: 0, y: 0 }),
  };

  const BALANCE = {
    roundSeconds: 26,
    roundsPerManche: 3,
    interludeMs: 4000,

    // Calé sur un modèle de budget de frappes : le facteur limitant est la
    // main du joueur, pas le débit des ports. Un débutant sans arbre qui tape
    // une fois par cible fait ~3 900 par round, un bon joueur qui mène ses
    // chaînes jusqu'au bout ~16 000. À 1 500, l'arbre vide mure au round 5
    // pour le premier, au 10 pour le second, et l'arbre plein tient jusqu'au
    // 14-17. C'est la croissance géométrique qui fait le tri, pas la base.
    quotaBase: 1500,
    // Croissance géométrique, pas polynomiale : le revenu d'un round est à peu
    // près constant, donc un palier quasi linéaire finit toujours par être
    // dépassé pour de bon et la run ne s'arrête jamais. En ×1.5 par round, la
    // facture rattrape n'importe quel revenu — la question est juste quand.
    quotaGrowth: 1.5,

    spawnBaseMs: 340,
    spawnVarianceMs: 300,
    coolantSlowFactor: 1.55,
    coolantMs: 3200,
    overclockMs: 4200,
    baseComboCap: 6,
    baseMaxActive: 2,

    // Chaîne d'étourdissement : une cible frappée reste sonnée sur le port et
    // rapporte de plus en plus tant qu'on l'enchaîne. Chaque coup l'étourdit
    // moins longtemps, donc la fenêtre se referme d'elle-même.
    stunBaseMs: 560,
    stunFalloff: 0.74,
    chainMax: 5,
    chainStep: 0.45,

    // Cibles blindées : le bouclier encaisse des coups, chacun prolonge
    // l'étourdissement pour garder la fenêtre ouverte.
    shieldStunMs: 320,
    shieldBonus: 2.2,

    // Parade : frapper une sentinelle déclenche un duel court. Le chrono du
    // round continue pendant — sinon rater la parade deviendrait un abri où
    // souffler quand le plateau déborde.
    qteSweepMs: 1450,
    qteSweepLegs: 2,
    qteZone: 0.24,
    playerStunMs: 1000,
    parryBonus: 2.8,

    turretIntervalMs: [0, 2600, 1800, 1200],
    turretPointShare: 0.6,
  };

  /**
   * Types de cible.
   * `effect` = bonus sans points. `shield` = coups à encaisser avant de
   * marquer. `parry` = déclenche le duel quand le joueur la frappe.
   */
  const TARGETS = [
    { id: 'drone', icon: '🤖', name: 'DRONE', pts: 6, weight: 40, ttl: 900 },
    { id: 'scout', icon: '⚡', name: 'SCOUT', pts: 12, weight: 18, ttl: 560 },
    { id: 'core', icon: '⭐', name: 'CORE', pts: 30, weight: 7, ttl: 700 },
    { id: 'coolant', icon: '🔋', name: 'COOLANT', pts: 0, weight: 6, ttl: 760, effect: 'coolant' },
    { id: 'overclock', icon: '💠', name: 'OVERCLOCK', pts: 0, weight: 5, ttl: 720, effect: 'overclock' },
    { id: 'blinde', icon: '🛡️', name: 'BLINDÉ', pts: 14, weight: 10, ttl: 1500, shield: 3 },
    { id: 'sentinelle', icon: '⚔️', name: 'SENTINELLE', pts: 18, weight: 14, ttl: 1300, parry: true },
  ];

  const ROWS = 3;
  const COLS = 4;
  const PORTS = ROWS * COLS;

  // ── arbre de compétences ────────────────────────────────────────────────
  //
  // Permanent : les niveaux achetés survivent à la mort. Le palier monte pour
  // compenser. L'arbre principal est strict (un parent au plus par nœud) ; les
  // spécialisations flottantes s'ouvrent à la profondeur de leur branche.

  const TREE = [
    {
      id: 'armement',
      name: 'ARMEMENT',
      color: '#35e6ff',
      blurb: 'Ce que ton marteau fait au contact.',
      tierThresholds: { 3: 3 },
      nodes: [
        {
          id: 'frappe', name: 'FRAPPE RENFORCÉE', max: 4, costs: [260, 620, 1400, 2900],
          tier: 1, lane: '1 / -1',
          desc: lvl => `+${lvl * 25}% sur tous les points marqués.`,
          apply: (s, lvl) => { s.pointMult += 0.25 * lvl; },
        },
        {
          id: 'combo', name: 'COMBO ÉTENDU', max: 3, costs: [440, 1100, 2400],
          tier: 2, lane: '1', requires: { frappe: 1 },
          desc: lvl => `Combo plafonné à ×${BALANCE.baseComboCap + lvl * 2} au lieu de ×${BALANCE.baseComboCap}.`,
          apply: (s, lvl) => { s.comboCap += 2 * lvl; },
        },
        {
          id: 'etourdi', name: 'MARTEAU LOURD', max: 3, costs: [700, 1750, 3600],
          tier: 2, lane: '2', requires: { frappe: 1 },
          desc: lvl => `Les cibles restent sonnées ${lvl * 22}% plus longtemps : plus de coups dans la chaîne.`,
          apply: (s, lvl) => { s.stunMult += 0.22 * lvl; },
        },
        {
          id: 'onde', name: 'ONDE DE CHOC', max: 2, costs: [1700, 3800],
          tier: 3, lane: '1 / -1', requires: { combo: 1 },
          desc: lvl => `L'impact touche aussi les ports voisins, à ${lvl === 1 ? '50' : '100'}% des points.`,
          apply: (s, lvl) => { s.splash = lvl === 1 ? 0.5 : 1; },
        },
      ],
      specialties: [
        {
          id: 'critique', name: 'FRAPPE CRITIQUE', max: 3, costs: [560, 1300, 2700],
          unlock: { depth: 2, invested: 3 },
          desc: lvl => `${lvl * 8}% de chance de tripler les points d'une touche.`,
          apply: (s, lvl) => { s.critChance += 0.08 * lvl; },
        },
      ],
    },
    {
      id: 'flux',
      name: 'FLUX',
      color: '#3cf0a0',
      blurb: 'Ce que les ports crachent, et à quelle vitesse.',
      tierThresholds: { 3: 3 },
      nodes: [
        {
          id: 'cadence', name: 'CADENCE DE POP', max: 3, costs: [560, 1400, 3000],
          tier: 1, lane: '1 / -1',
          desc: lvl => `Les cibles arrivent ${lvl * 12}% plus vite.`,
          apply: (s, lvl) => { s.spawnScale *= Math.pow(0.88, lvl); },
        },
        {
          id: 'densite', name: 'DENSITÉ DE FLUX', max: 3, costs: [750, 1900, 3900],
          tier: 2, lane: '1', requires: { cadence: 1 },
          desc: lvl => `${BALANCE.baseMaxActive + lvl} cibles simultanées au lieu de ${BALANCE.baseMaxActive}.`,
          apply: (s, lvl) => { s.maxActive += lvl; },
        },
        {
          id: 'fenetre', name: 'FENÊTRE LONGUE', max: 2, costs: [640, 1650],
          tier: 2, lane: '2', requires: { cadence: 1 },
          desc: lvl => `Les cibles restent ${lvl * 18}% plus longtemps.`,
          apply: (s, lvl) => { s.ttlMult += 0.18 * lvl; },
        },
        {
          id: 'rarete', name: 'SIGNAL RARE', max: 3, costs: [820, 2000, 4300],
          tier: 3, lane: '1 / -1', requires: { densite: 1 },
          desc: lvl => `CORE ${(1 + 0.5 * lvl).toFixed(1)}× plus fréquent.`,
          apply: (s, lvl) => { s.coreWeightMult += 0.5 * lvl; },
        },
      ],
    },
    {
      id: 'tourelles',
      name: 'TOURELLES',
      color: '#a274ff',
      blurb: 'Des canons sur les flancs qui frappent sans toi.',
      tierThresholds: { 3: 3 },
      nodes: [
        {
          id: 'tourelleG', name: 'TOURELLE BÂBORD', max: 3, costs: [1100, 2600, 5200],
          tier: 1, lane: '1 / -1',
          desc: lvl => `Tire sur la colonne de gauche toutes les ${(BALANCE.turretIntervalMs[lvl] / 1000).toFixed(1)} s.`,
          apply: (s, lvl) => { s.turretLeft = lvl; },
        },
        {
          id: 'tourelleD', name: 'TOURELLE TRIBORD', max: 3, costs: [1100, 2600, 5200],
          tier: 2, lane: '1 / -1', requires: { tourelleG: 1 },
          desc: lvl => `Tire sur la colonne de droite toutes les ${(BALANCE.turretIntervalMs[lvl] / 1000).toFixed(1)} s.`,
          apply: (s, lvl) => { s.turretRight = lvl; },
        },
        {
          id: 'surchauffe', name: 'SURCHAUFFE', max: 2, costs: [2800, 6000],
          tier: 3, lane: '1 / -1', requires: { tourelleD: 1 },
          desc: lvl => lvl === 1
            ? 'Les tirs de tourelle alimentent ton combo.'
            : 'Les tirs de tourelle alimentent le combo et marquent à plein tarif.',
          apply: (s, lvl) => { s.turretCombo = lvl; },
        },
      ],
      specialties: [
        {
          id: 'ciblage', name: 'CIBLAGE SMART', max: 2, costs: [2200, 4700],
          unlock: { depth: 2, invested: 3 },
          desc: lvl => lvl === 1
            ? 'Les tourelles ne gaspillent plus leurs tirs sur les sentinelles.'
            : 'Les tourelles évitent les sentinelles et visent la cible la plus chère.',
          apply: (s, lvl) => { s.turretSmart = lvl; },
        },
      ],
    },
    {
      id: 'vital',
      name: 'VITAL',
      color: '#ffbe3c',
      blurb: 'Gagner du temps, et payer moins cher.',
      tierThresholds: { 3: 3 },
      nodes: [
        {
          id: 'rallonge', name: 'RALLONGE', max: 3, costs: [900, 2400, 5000],
          tier: 1, lane: '1 / -1',
          desc: lvl => `+${lvl * 2} secondes par round.`,
          apply: (s, lvl) => { s.roundBonusSeconds += 2 * lvl; },
        },
        {
          id: 'reflexe', name: 'RÉFLEXE', max: 2, costs: [1300, 3200],
          tier: 2, lane: '1 / -1', requires: { rallonge: 1 },
          desc: lvl => `Fenêtre de parade ${lvl * 22}% plus large.`,
          apply: (s, lvl) => { s.qteZoneMult += 0.22 * lvl; },
        },
        {
          id: 'negoce', name: 'NÉGOCIATION', max: 3, costs: [1900, 4500, 8500],
          tier: 3, lane: '1 / -1', requires: { reflexe: 1 },
          desc: lvl => `Palier réduit de ${lvl * 6}%.`,
          apply: (s, lvl) => { s.quotaDiscount += 0.06 * lvl; },
        },
      ],
      specialties: [
        {
          id: 'amorti', name: 'AMORTISSEUR', max: 2, costs: [1500, 3600],
          unlock: { depth: 2, invested: 3 },
          desc: lvl => `Parade ratée : tu restes étourdi ${lvl * 25}% moins longtemps.`,
          apply: (s, lvl) => { s.playerStunMult -= 0.25 * lvl; },
        },
      ],
    },
  ];

  const allBranchNodes = branch => [...branch.nodes, ...(branch.specialties ?? [])];

  const NODES = new Map();
  for (const branch of TREE) {
    for (const node of allBranchNodes(branch)) NODES.set(node.id, { ...node, branch });
  }

  // ── sauvegarde ──────────────────────────────────────────────────────────

  function emptySave() {
    return { tree: {}, bestRound: 0, bestScore: 0, runs: 0 };
  }

  function loadSave() {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) return emptySave();
      const parsed = JSON.parse(raw);
      const save = { ...emptySave(), ...parsed };
      // On ne garde que des nœuds connus, bornés à leur max. C'est aussi ce qui
      // fait qu'une sauvegarde d'avant la refonte perd proprement les nœuds
      // supprimés (REDONDANCE, PARE-FEU) au lieu d'injecter un niveau fantôme.
      const tree = {};
      for (const [id, lvl] of Object.entries(save.tree ?? {})) {
        const node = NODES.get(id);
        if (!node) continue;
        const level = Math.floor(Number(lvl));
        if (Number.isFinite(level) && level > 0) tree[id] = Math.min(level, node.max);
      }
      save.tree = normalizeTree(tree);
      return save;
    } catch (error) {
      console.warn('[Drone Quota] sauvegarde illisible, on repart de zéro :', error?.message ?? error);
      return emptySave();
    }
  }

  /**
   * Une ancienne sauvegarde peut posséder un descendant dont le nouveau parent
   * est à zéro. On conserve l'achat et on complète gratuitement ses ancêtres :
   * aucun bonus payé ne devient invisible ou inactif après la refonte.
   */
  function normalizeTree(tree) {
    const normalized = { ...tree };
    let changed = true;
    while (changed) {
      changed = false;
      for (const node of NODES.values()) {
        if ((normalized[node.id] ?? 0) <= 0) continue;
        for (const [parentId, requiredLevel] of Object.entries(node.requires ?? {})) {
          const parent = NODES.get(parentId);
          if (!parent) continue;
          const target = Math.min(parent.max, requiredLevel);
          if ((normalized[parentId] ?? 0) >= target) continue;
          normalized[parentId] = target;
          changed = true;
        }
      }
    }
    return normalized;
  }

  function persist() {
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    } catch (error) {
      console.warn('[Drone Quota] sauvegarde impossible :', error?.message ?? error);
    }
  }

  // ── stats dérivées ──────────────────────────────────────────────────────

  function deriveStats(tree) {
    const stats = {
      pointMult: 1,
      critChance: 0,
      critMult: 3,
      splash: 0,
      comboCap: BALANCE.baseComboCap,
      maxActive: BALANCE.baseMaxActive,
      spawnScale: 1,
      coreWeightMult: 1,
      ttlMult: 1,
      stunMult: 1,
      turretLeft: 0,
      turretRight: 0,
      turretSmart: 0,
      turretCombo: 0,
      roundBonusSeconds: 0,
      qteZoneMult: 1,
      playerStunMult: 1,
      quotaDiscount: 0,
    };
    for (const branch of TREE) {
      for (const node of allBranchNodes(branch)) {
        const lvl = tree[node.id] ?? 0;
        if (lvl > 0) node.apply(stats, lvl);
      }
    }
    return stats;
  }

  function quotaFor(round, stats) {
    const raw = BALANCE.quotaBase * Math.pow(BALANCE.quotaGrowth, round - 1);
    const discount = stats ? stats.quotaDiscount : 0;
    return Math.max(1, Math.round(raw * (1 - Math.min(0.6, discount))));
  }

  function roundSecondsFor(stats) {
    return BALANCE.roundSeconds + (stats?.roundBonusSeconds ?? 0);
  }

  const mancheOf = r => Math.floor((r - 1) / BALANCE.roundsPerManche) + 1;
  const stepInManche = r => ((r - 1) % BALANCE.roundsPerManche) + 1;
  const isMancheEnd = r => stepInManche(r) === BALANCE.roundsPerManche;

  function branchInvestment(branch, tree) {
    return allBranchNodes(branch).reduce((sum, node) => sum + (tree[node.id] ?? 0), 0);
  }

  function branchDepth(branch, tree) {
    return branch.nodes.reduce((depth, node) => (
      (tree[node.id] ?? 0) > 0 ? Math.max(depth, node.tier ?? 1) : depth
    ), 0);
  }

  function unlockCheck(node, tree, progression = {}) {
    const level = tree[node.id] ?? 0;
    if (level > 0) return { open: true };

    for (const [parentId, requiredLevel] of Object.entries(node.requires ?? {})) {
      if ((tree[parentId] ?? 0) < requiredLevel) return { open: false, reason: 'parent' };
    }

    const branch = NODES.get(node.id)?.branch;
    const tierThreshold = branch?.tierThresholds?.[node.tier] ?? 0;
    if (branch && branchInvestment(branch, tree) < tierThreshold) {
      return { open: false, reason: 'invested', required: tierThreshold };
    }

    const unlock = node.unlock ?? {};
    if (branch && branchDepth(branch, tree) < (unlock.depth ?? 0)) {
      return { open: false, reason: 'depth', required: unlock.depth };
    }
    if (branch && branchInvestment(branch, tree) < (unlock.invested ?? 0)) {
      return { open: false, reason: 'invested', required: unlock.invested };
    }
    // Point d'extension pour l'issue #6 : une branche entière ou un nœud peut
    // poser la condition, mais aucun jeton n'est créé ni stocké ici.
    const requiredPrestige = Math.max(branch?.unlock?.prestige ?? 0, unlock.prestige ?? 0);
    if ((progression.prestigeTokens ?? 0) < requiredPrestige) {
      return { open: false, reason: 'prestige', required: requiredPrestige };
    }
    return { open: true };
  }

  function nodeState(node, tree, bank, progression) {
    const level = tree[node.id] ?? 0;
    if (level >= node.max) return { level, status: 'maxed', cost: null };
    const gate = unlockCheck(node, tree, progression);
    if (!gate.open) return { level, status: 'hidden', cost: node.costs[level], gate };
    const cost = node.costs[level];
    return { level, status: bank >= cost ? 'buyable' : 'poor', cost };
  }

  function ownedNodeCount(tree) {
    return Object.values(tree).reduce((sum, lvl) => sum + lvl, 0);
  }

  // ── état ────────────────────────────────────────────────────────────────

  let save = loadSave();
  let stats = deriveStats(save.tree);
  let interludeTimer = null;
  let shopSnapshot = null;
  let shopDirty = false;

  const run = { active: false, round: 1, bank: 0, totalScore: 0 };

  const round = {
    running: false,
    paused: false,
    endsAt: 0,
    seconds: BALANCE.roundSeconds,
    quota: 0,
    combo: 1,
    maxCombo: 1,
    gain: 0,
    hits: 0,
    misses: 0,
    chainBest: 0,
    parries: 0,
    parriesWon: 0,
    coolantUntil: 0,
    overclockUntil: 0,
    playerStunUntil: 0,
    qte: null,
    clock: null,
    spawnTimer: null,
    turretTimers: [],
  };

  const ports = [];

  // ── helpers DOM ─────────────────────────────────────────────────────────

  const $ = id => document.getElementById(id);
  const fmt = value => Math.round(value).toLocaleString('fr-FR');
  const cabinet = () => $('cabinet');

  function show(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === screenId));
    window.scrollTo({ top: 0 });
  }

  function weightedPick(items, weightOf) {
    const total = items.reduce((sum, item) => sum + weightOf(item), 0);
    let roll = Math.random() * total;
    for (const item of items) {
      roll -= weightOf(item);
      if (roll <= 0) return item;
    }
    return items[items.length - 1];
  }

  // ── accueil ─────────────────────────────────────────────────────────────

  function renderMenu() {
    $('menu-best-round').textContent = save.bestRound ? `#${save.bestRound}` : '—';
    $('menu-best-score').textContent = save.bestScore ? fmt(save.bestScore) : '—';
    $('menu-runs').textContent = fmt(save.runs);
    $('menu-nodes').textContent = fmt(ownedNodeCount(save.tree));
  }

  // ── rendu de l'arbre ────────────────────────────────────────────────────

  function nodeButton(node, state, mode, opaque = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.node = node.id;

    if (opaque && state.level === 0) {
      const condition = specialtyCondition(node);
      const open = state.status !== 'hidden';
      button.className = `node specialty-node opaque ${open ? state.status : 'opaque-locked'}`;
      button.setAttribute('aria-label', `Module classifié. ${condition}`);
      button.innerHTML = `
        <span class="node-head">
          <span class="node-name">MODULE CLASSIFIÉ</span>
          <span class="node-dots" aria-hidden="true">◆</span>
        </span>
        <span class="node-desc">Icône et statistiques masquées jusqu'au premier achat.</span>
        <span class="specialty-condition">${condition}</span>
        <span class="node-foot">
          <span class="node-cost">${fmt(state.cost)}</span>
          <span class="node-state">${open ? (state.status === 'poor' ? 'BANQUE INSUFFISANTE' : 'DÉVERROUILLER') : 'CONDITION NON REMPLIE'}</span>
        </span>`;
      if (mode === 'shop' && state.status === 'buyable') button.addEventListener('click', () => buy(node));
      else button.disabled = true;
      return button;
    }

    const shownLevel = Math.max(1, state.level + (state.status === 'maxed' ? 0 : 1));
    const dots = '●'.repeat(state.level) + '○'.repeat(node.max - state.level);
    let footer;
    if (state.status === 'maxed') {
      footer = '<span class="node-cost">—</span><span class="node-state">MAX</span>';
    } else if (mode === 'readonly') {
      footer = `<span class="node-cost">${fmt(state.cost)}</span>`
        + `<span class="node-state">NIVEAU ${state.level} / ${node.max}</span>`;
    } else {
      footer = `<span class="node-cost">${fmt(state.cost)}</span>`
        + `<span class="node-state">${state.status === 'poor' ? 'BANQUE INSUFFISANTE' : 'ACHETER'}</span>`;
    }

    button.className = `node ${state.status}${mode === 'readonly' ? ' readonly' : ''}`;
    button.innerHTML = `
      <span class="node-head">
        <span class="node-name">${node.name}</span>
        <span class="node-dots">${dots}</span>
      </span>
      <span class="node-desc">${node.desc(shownLevel)}</span>
      <span class="node-foot">${footer}</span>`;
    if (mode === 'shop' && state.status === 'buyable') button.addEventListener('click', () => buy(node));
    else button.disabled = true;
    return button;
  }

  function specialtyCondition(node) {
    const parts = [];
    const branch = NODES.get(node.id)?.branch;
    if (node.unlock?.depth) parts.push(`profondeur ${node.unlock.depth}`);
    if (node.unlock?.invested) parts.push(`${node.unlock.invested} niveaux investis`);
    const prestige = Math.max(branch?.unlock?.prestige ?? 0, node.unlock?.prestige ?? 0);
    if (prestige) parts.push(`${prestige} jeton${prestige > 1 ? 's' : ''} de prestige`);
    return `CONDITION : ${parts.join(' · ')}`;
  }

  function drawTreeLinks(container) {
    container.querySelectorAll('.branch-graph').forEach(graph => {
      const svg = graph.querySelector('.tree-links');
      if (!svg) return;
      svg.innerHTML = '';
      const graphRect = graph.getBoundingClientRect();
      svg.setAttribute('viewBox', `0 0 ${graphRect.width} ${graphRect.height}`);

      graph.querySelectorAll('.node[data-parent]').forEach(child => {
        const parent = graph.querySelector(`.node[data-node="${child.dataset.parent}"]`);
        if (!parent) return;
        const parentRect = parent.getBoundingClientRect();
        const childRect = child.getBoundingClientRect();
        const x1 = parentRect.left - graphRect.left + parentRect.width / 2;
        const y1 = parentRect.bottom - graphRect.top;
        const x2 = childRect.left - graphRect.left + childRect.width / 2;
        const y2 = childRect.top - graphRect.top;
        const bend = Math.max(10, (y2 - y1) * 0.5);
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M ${x1} ${y1} C ${x1} ${y1 + bend}, ${x2} ${y2 - bend}, ${x2} ${y2}`);
        svg.appendChild(path);
      });
    });
  }

  /** @param mode 'shop' = achetable, 'readonly' = consultation depuis l'accueil. */
  function renderTree(container, mode) {
    const bank = mode === 'shop' ? run.bank : Infinity;
    container.innerHTML = '';

    for (const branch of TREE) {
      const box = document.createElement('section');
      box.className = 'branch';
      box.style.setProperty('--branch', branch.color);
      const invested = branchInvestment(branch, save.tree);
      const depth = branchDepth(branch, save.tree);
      box.innerHTML = `<h3>${branch.name}</h3><p>${branch.blurb}</p>`
        + `<div class="branch-meta"><span>${invested} NIVEAU${invested > 1 ? 'X' : ''}</span>`
        + `<span>PROFONDEUR ${depth}</span></div>`;

      const graph = document.createElement('div');
      graph.className = 'branch-graph';
      graph.innerHTML = '<svg class="tree-links" aria-hidden="true"></svg>';
      let mobileRow = 1;
      for (const node of branch.nodes) {
        const state = nodeState(node, save.tree, bank);
        if (state.status === 'hidden') continue;
        const button = nodeButton(node, state, mode);
        button.style.setProperty('--tree-column', node.lane ?? '1 / -1');
        button.style.setProperty('--tree-row', node.tier ?? 1);
        button.style.setProperty('--tree-mobile-row', mobileRow++);
        const [parentId] = Object.keys(node.requires ?? {});
        if (parentId) button.dataset.parent = parentId;
        graph.appendChild(button);
      }
      box.appendChild(graph);

      if (branch.specialties?.length) {
        const specialties = document.createElement('div');
        specialties.className = 'specialties';
        specialties.innerHTML = '<h4>MODULES FLOTTANTS</h4>';
        for (const node of branch.specialties) {
          specialties.appendChild(nodeButton(node, nodeState(node, save.tree, bank), mode, true));
        }
        box.appendChild(specialties);
      }
      container.appendChild(box);
    }
    // L'écran peut encore être masqué pendant le rendu. Attendre une frame
    // garantit des rectangles mesurables après `show()`.
    requestAnimationFrame(() => drawTreeLinks(container));
  }

  function buy(node) {
    if (!shopSnapshot) return;
    const state = nodeState(node, save.tree, run.bank);
    if (state.status !== 'buyable') return;
    run.bank -= state.cost;
    save.tree[node.id] = state.level + 1;
    shopDirty = true;
    stats = deriveStats(save.tree);
    FX.sfx.buy();
    renderShop();
    // L'atelier est re-rendu : on retrouve le nœud pour lui donner son accusé
    // de réception, sinon l'achat ne se voit pas.
    const fresh = document.querySelector(`#shop-tree .node[data-node="${node.id}"]`);
    if (fresh) {
      fresh.classList.add('just-bought');
      setTimeout(() => fresh.classList.remove('just-bought'), 480);
    }
  }

  // ── atelier (fin de manche) ─────────────────────────────────────────────

  function enterShop() {
    shopSnapshot = { tree: { ...save.tree }, bank: run.bank };
    shopDirty = false;
    renderShop();
    show('scr-shop');
  }

  function cancelShopPurchases() {
    if (!shopSnapshot) return false;
    save.tree = { ...shopSnapshot.tree };
    run.bank = shopSnapshot.bank;
    stats = deriveStats(save.tree);
    shopDirty = false;
    renderShop();
    return true;
  }

  function discardShopChanges() {
    if (!shopSnapshot) return;
    save.tree = { ...shopSnapshot.tree };
    run.bank = shopSnapshot.bank;
    stats = deriveStats(save.tree);
    shopSnapshot = null;
    shopDirty = false;
  }

  function validateShop() {
    if (!shopSnapshot) return;
    persist();
    shopSnapshot = null;
    shopDirty = false;
    startRound();
  }

  function renderShop() {
    const next = quotaFor(run.round, stats);
    $('shop-next-round').textContent = run.round;
    $('shop-next-manche').textContent = mancheOf(run.round);
    $('shop-next-quota').textContent = fmt(next);
    $('shop-bank').textContent = fmt(run.bank);

    const warning = $('shop-warning');
    const short = next - run.bank;
    // Rouge = tu es sous la barre là, maintenant. Ambre = tu es au-dessus,
    // mais chaque achat t'en rapproche.
    if (short > 0) {
      warning.className = 'shop-warning danger';
      warning.innerHTML = `Il te manque <strong>${fmt(short)}</strong> pour le palier du round ${run.round}. `
        + 'Tout ce que tu dépenses ici, il faudra le regagner sur les ports.';
    } else {
      warning.className = 'shop-warning';
      warning.innerHTML = `Ta banque couvre le palier du round ${run.round} `
        + `(<strong>${fmt(next)}</strong>), avec ${fmt(-short)} d'avance. `
        + 'Investir maintenant, c\'est repasser sous la barre.';
    }

    renderTree($('shop-tree'), 'shop');
    $('btn-cancel-shop').disabled = !shopDirty;
    $('shop-transaction').textContent = shopDirty
      ? 'Achats en attente — valide la manche suivante pour les conserver.'
      : 'Aucun achat en attente.';
  }

  // ── briefing ────────────────────────────────────────────────────────────

  function renderBrief() {
    const quota = quotaFor(run.round, stats);
    $('brief-round').textContent = run.round;
    $('brief-manche').textContent = `MANCHE ${mancheOf(run.round)} · ROUND ${stepInManche(run.round)}/${BALANCE.roundsPerManche}`;
    $('brief-quota').textContent = fmt(quota);
    $('brief-bank').textContent = fmt(run.bank);
    $('brief-missing').textContent = fmt(Math.max(0, quota - run.bank));
    $('brief-duration').textContent = `${roundSecondsFor(stats)}s`;

    const owned = ownedNodeCount(save.tree);
    $('brief-hint').innerHTML = owned
      ? `Tu démarres avec <strong>${owned}</strong> niveau${owned > 1 ? 'x' : ''} d'arbre déjà acquis. `
        + 'Le palier, lui, ne se souvient de rien.'
      : 'Aucun nœud pour l\'instant : encaisse la première manche, puis va dépenser à l\'atelier.';
  }

  // ── grille ──────────────────────────────────────────────────────────────

  function buildGrid() {
    const grid = $('grid');
    grid.innerHTML = '';
    ports.length = 0;

    for (let i = 0; i < PORTS; i++) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'port';
      button.innerHTML = `<span class="id">P${String(i + 1).padStart(2, '0')}</span>`
        + '<span class="socket"><span class="shaft"></span>'
        + '<span class="riser"><span class="icon"></span></span></span>'
        + '<span class="shieldbar" aria-hidden="true"></span>'
        + '<span class="scars"></span><span class="name">IDLE</span>';
      const port = {
        index: i, el: button, target: null,
        ttlTimer: null, ttlLeft: 0, ttlArmedAt: 0,
        stunTimer: null, chain: 0, shieldLeft: 0,
      };
      button.addEventListener('click', () => onPortClick(port));
      grid.appendChild(button);
      ports.push(port);
    }

    for (const side of ['flank-left', 'flank-right']) {
      $(side).innerHTML = '<b></b><b></b><b></b>';
    }
  }

  /** Panoramique stéréo d'un port : la colonne 0 sonne à gauche. */
  function panOf(port) {
    return ((port.index % COLS) / (COLS - 1)) * 1.6 - 0.8;
  }

  function clearPort(port) {
    if (port.ttlTimer) clearTimeout(port.ttlTimer);
    if (port.stunTimer) clearTimeout(port.stunTimer);
    port.ttlTimer = null;
    port.stunTimer = null;
    port.ttlLeft = 0;
    port.target = null;
    port.chain = 0;
    port.shieldLeft = 0;
    port.el.className = 'port';
    port.el.querySelector('.icon').textContent = '';
    port.el.querySelector('.name').textContent = 'IDLE';
    port.el.style.removeProperty('--shield');
  }

  function popText(port, text, kind) {
    const pop = document.createElement('span');
    pop.className = `pop ${kind}`;
    pop.textContent = text;
    port.el.appendChild(pop);
    setTimeout(() => pop.remove(), 430);
  }

  function flashPort(port, cls) {
    const el = port.el;
    clearPort(port);
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 220);
  }

  /** Arme la disparition d'une cible, en mémorisant le reste à courir. */
  function armTtl(port, ms) {
    if (port.ttlTimer) clearTimeout(port.ttlTimer);
    port.ttlLeft = ms;
    port.ttlArmedAt = performance.now();
    port.ttlTimer = setTimeout(() => escape(port), ms);
  }

  /** Suspend toutes les disparitions pendant un duel. */
  function freezeTtls() {
    const now = performance.now();
    for (const port of ports) {
      if (!port.ttlTimer) continue;
      clearTimeout(port.ttlTimer);
      port.ttlTimer = null;
      port.ttlLeft = Math.max(80, port.ttlLeft - (now - port.ttlArmedAt));
    }
  }

  function thawTtls() {
    for (const port of ports) {
      if (!port.target || port.ttlTimer || port.ttlLeft <= 0) continue;
      armTtl(port, port.ttlLeft);
    }
  }

  // ── round ───────────────────────────────────────────────────────────────

  function startRound() {
    round.quota = quotaFor(run.round, stats);
    round.seconds = roundSecondsFor(stats);
    round.combo = 1;
    round.maxCombo = 1;
    round.gain = 0;
    round.hits = 0;
    round.misses = 0;
    round.chainBest = 0;
    round.parries = 0;
    round.parriesWon = 0;
    round.coolantUntil = 0;
    round.overclockUntil = 0;
    round.playerStunUntil = 0;
    round.paused = false;

    if (interludeTimer) clearTimeout(interludeTimer);
    interludeTimer = null;

    buildGrid();
    closeQte();
    $('interlude').hidden = true;
    updateHud();
    setMsg('Frappe tout ce qui bouge.', '');
    show('scr-round');
    FX.clear();
    FX.clearScars();
    FX.resize();
    FX.hum(true);

    countdown(() => {
      round.running = true;
      round.endsAt = performance.now() + round.seconds * 1000;
      round.clock = setInterval(tick, 100);
      scheduleSpawn();
      armTurrets();
    });
  }

  function countdown(done) {
    const steps = ['3', '2', '1', 'GO'];
    const overlay = $('boot');
    const label = $('boot-text');
    let i = 0;
    overlay.hidden = false;

    const step = () => {
      if (i >= steps.length) {
        overlay.hidden = true;
        done();
        return;
      }
      const text = steps[i++];
      label.textContent = text;
      label.style.animation = 'none';
      void label.offsetWidth;
      label.style.animation = '';
      text === 'GO' ? FX.sfx.go() : FX.sfx.tick();
      setTimeout(step, 480);
    };
    step();
  }

  function scheduleSpawn() {
    if (!round.running) return;

    if (!round.paused) {
      const free = ports.filter(p => !p.target);
      const activeCount = ports.length - free.length;
      if (free.length && activeCount < stats.maxActive) {
        spawn(free[Math.floor(Math.random() * free.length)]);
      }
    }

    const slow = performance.now() < round.coolantUntil ? BALANCE.coolantSlowFactor : 1;
    const delay = (BALANCE.spawnBaseMs * stats.spawnScale + Math.random() * BALANCE.spawnVarianceMs) * slow;
    round.spawnTimer = setTimeout(scheduleSpawn, delay);
  }

  function dressPort(port, type) {
    port.target = type;
    port.chain = 0;
    port.shieldLeft = type.shield ?? 0;
    port.el.className = `port up ${type.id}`;
    port.el.querySelector('.icon').textContent = type.icon;
    port.el.querySelector('.name').textContent = type.name;
    if (port.shieldLeft) paintShield(port);
  }

  function spawn(port) {
    const type = weightedPick(TARGETS, t => t.id === 'core' ? t.weight * stats.coreWeightMult : t.weight);
    dressPort(port, type);
    armTtl(port, type.ttl * stats.ttlMult);
  }

  function paintShield(port) {
    const total = port.target?.shield ?? 0;
    port.el.style.setProperty('--shield', total ? port.shieldLeft / total : 0);
    port.el.classList.toggle('shielded', port.shieldLeft > 0);
  }

  function escape(port) {
    if (!port.target) return;
    const scoring = port.target.pts > 0 && !port.target.effect;
    clearPort(port);
    if (!scoring) return;
    round.combo = 1;
    port.el.classList.add('gone');
    setTimeout(() => port.el.classList.remove('gone'), 240);
    FX.sfx.escape();
    updateHud();
  }

  // ── frappe ──────────────────────────────────────────────────────────────

  function onPortClick(port) {
    if (!round.running) return;

    // Duel en cours : le plateau est figé, c'est le panneau de parade qui prend
    // les clics.
    if (round.paused) return;

    if (performance.now() < round.playerStunUntil) {
      FX.sfx.miss(panOf(port));
      return;
    }

    if (!port.target) {
      // Frapper dans le vide casse le combo : sans ça, le spam de clics est
      // toujours la stratégie optimale.
      round.misses += 1;
      round.combo = 1;
      popText(port, 'RATÉ', 'neg');
      setMsg('Coup dans le vide — combo perdu.', 'bad');
      FX.sfx.miss(panOf(port));
      FX.scar(port.el, 'miss');
      FX.shake(cabinet(), 2);
      updateHud();
      return;
    }

    const type = port.target;

    if (type.effect) {
      applyEffect(type.effect);
      bumpCombo();
      popText(port, type.effect === 'coolant' ? 'FLUX -' : 'POINTS ×2', 'turret');
      FX.burst(port.el, 'bonus', 1.1);
      FX.sfx.bonus(type.effect);
      flashPort(port, 'hit');
      updateHud();
      return;
    }

    // Sentinelle encore sur ses gardes : elle pare, et le duel commence.
    if (type.parry && port.chain === 0) {
      openQte(port);
      return;
    }

    // Blindé : le bouclier encaisse, et chaque coup prolonge l'étourdissement
    // pour que la fenêtre reste ouverte.
    if (port.shieldLeft > 0) {
      port.shieldLeft -= 1;
      paintShield(port);
      const broken = port.shieldLeft === 0;
      popText(port, broken ? 'BRISÉ' : `${port.shieldLeft}/${type.shield}`, broken ? 'crit' : 'turret');
      FX.burst(port.el, broken ? 'crit' : 'turret', broken ? 1.3 : 0.7);
      broken ? FX.sfx.crit(panOf(port)) : FX.sfx.shield(panOf(port));
      FX.shake(cabinet(), broken ? 6 : 3);
      FX.scar(port.el, 'hit');
      stunTarget(port, BALANCE.shieldStunMs);
      // Pas de combo sur un coup absorbé : rien n'a touché. Engager un blindé
      // coûte donc de l'élan, sinon les trois coups de bouclier montaient le
      // combo gratuitement et la cible payait presque un palier à elle seule.
      updateHud();
      return;
    }

    strike(port, type);
  }

  /** Frappe qui marque : score, chaîne d'étourdissement, onde. */
  function strike(port, type) {
    const chainIndex = port.chain;
    const chainMult = 1 + chainIndex * BALANCE.chainStep;
    const kindMult = type.parry ? BALANCE.parryBonus : type.shield ? BALANCE.shieldBonus : 1;

    scoreHit(port, type, chainMult * kindMult, false, { keep: true, chainIndex });

    // L'onde part avant l'incrément de combo : les éclats appartiennent à la
    // frappe qui les a produits, ils ne doivent pas encaisser le combo qu'elle
    // vient de gagner. Et seulement au premier coup, sinon une chaîne arrose
    // les voisins cinq fois.
    if (stats.splash > 0 && chainIndex === 0) splash(port);

    round.hits += 1;
    port.chain += 1;
    round.chainBest = Math.max(round.chainBest, port.chain);
    bumpCombo();

    if (port.chain >= BALANCE.chainMax) {
      popText(port, 'HORS SERVICE', 'crit');
      flashPort(port, 'hit');
      updateHud();
      return;
    }

    stunTarget(port, BALANCE.stunBaseMs * Math.pow(BALANCE.stunFalloff, port.chain - 1));
    updateHud();
  }

  /**
   * Laisse la cible sonnée sur le port : on peut la reprendre pour de plus en
   * plus de points, jusqu'à ce que la fenêtre se referme.
   */
  function stunTarget(port, ms) {
    if (!port.target) return;
    const duration = Math.max(120, ms * stats.stunMult);
    port.el.classList.add('stunned');
    port.el.style.setProperty('--stun-ms', `${Math.round(duration)}ms`);
    if (port.stunTimer) clearTimeout(port.stunTimer);
    port.stunTimer = setTimeout(() => {
      if (!port.target) return;
      port.el.classList.remove('stunned');
      escape(port);
    }, duration);
    // Tant qu'elle est sonnée, elle ne s'échappe pas d'elle-même : c'est la
    // fenêtre d'étourdissement qui décide.
    if (port.ttlTimer) {
      clearTimeout(port.ttlTimer);
      port.ttlTimer = null;
      port.ttlLeft = 0;
    }
  }

  function bumpCombo() {
    round.combo = Math.min(stats.comboCap, round.combo + 1);
    round.maxCombo = Math.max(round.maxCombo, round.combo);
  }

  function splash(origin) {
    const col = origin.index % COLS;
    const neighbours = [];
    if (col > 0) neighbours.push(ports[origin.index - 1]);
    if (col < COLS - 1) neighbours.push(ports[origin.index + 1]);

    for (const port of neighbours) {
      // L'onde ne déclenche pas les bonus, ne réveille pas les sentinelles et
      // n'entame pas les boucliers : sinon le nœud se retourne contre son
      // acheteur.
      if (!port.target || port.target.pts <= 0 || port.target.effect) continue;
      if (port.target.parry || port.shieldLeft > 0) continue;
      scoreHit(port, port.target, stats.splash, false, { keep: false });
    }
  }

  /**
   * Marque une touche. `keep` laisse la cible en place (chaîne d'étourdissement)
   * au lieu de vider le port.
   */
  function scoreHit(port, type, share, viaTurret, { keep = false, chainIndex = 0 } = {}) {
    const overclock = performance.now() < round.overclockUntil;
    const comboFactor = viaTurret && !stats.turretCombo ? 1 : round.combo;
    const crit = !viaTurret && Math.random() < stats.critChance;

    let points = type.pts * comboFactor * stats.pointMult * share;
    if (overclock) points *= 2;
    if (crit) points *= stats.critMult;
    if (viaTurret) points *= stats.turretCombo >= 2 ? 1 : BALANCE.turretPointShare;
    points = Math.max(1, Math.round(points));

    run.bank += points;
    run.totalScore += points;
    round.gain += points;

    const suffix = chainIndex > 0 ? ` ×${(1 + chainIndex * BALANCE.chainStep).toFixed(1)}` : '';
    popText(port, `+${fmt(points)}${suffix}`, crit ? 'crit' : viaTurret ? 'turret' : '');

    const pan = panOf(port);
    if (viaTurret) {
      FX.burst(port.el, 'turret', 0.8);
    } else if (crit) {
      FX.burst(port.el, 'crit', 1.4);
      FX.sfx.crit(pan);
      FX.shake(cabinet(), 7);
    } else {
      // L'intensité suit le combo et la chaîne : une série longue doit
      // s'entendre et se voir monter.
      const ratio = (round.combo - 1) / Math.max(1, stats.comboCap - 1);
      FX.burst(port.el, 'hit', 0.85 + ratio * 0.7 + chainIndex * 0.15);
      FX.sfx.hit(Math.min(1, ratio + chainIndex * 0.12), pan);
      FX.shake(cabinet(), 2 + ratio * 2.5 + chainIndex);
    }
    FX.scar(port.el, crit ? 'crit' : 'hit');

    if (!keep) flashPort(port, viaTurret ? 'turret-hit' : 'hit');
  }

  function applyEffect(effect) {
    const now = performance.now();
    if (effect === 'coolant') {
      round.coolantUntil = Math.max(round.coolantUntil, now + BALANCE.coolantMs);
      setMsg('Coolant injecté — le flux ralentit.', 'good');
    } else {
      round.overclockUntil = Math.max(round.overclockUntil, now + BALANCE.overclockMs);
      setMsg('Overclock armé — points doublés.', 'good');
    }
  }

  // ── parade ──────────────────────────────────────────────────────────────

  /**
   * La sentinelle pare : le plateau se fige, la dalle zoome sur le port et le
   * joueur a une passe pour placer son coup. Le chrono du round, lui, continue
   * de tourner : le duel n'est pas un abri.
   */
  function openQte(port) {
    round.parries += 1;
    round.paused = true;
    freezeTtls();

    const zone = Math.min(0.7, BALANCE.qteZone * stats.qteZoneMult);
    const start = Math.random() * (1 - zone);
    // Deux traversées au minimum garantissent un aller-retour lisible. Chaque
    // jambe dure qteSweepMs et accepte la frappe : le joueur peut agir tout de
    // suite ou attendre d'avoir observé la trajectoire complète.
    const legs = Math.max(2, Math.round(BALANCE.qteSweepLegs));
    const duration = BALANCE.qteSweepMs * legs;
    round.qte = {
      port, startedAt: performance.now(), zoneStart: start, zoneWidth: zone,
      legs, duration, done: false, timeout: null,
    };

    const panel = $('qte');
    panel.hidden = false;
    panel.classList.remove('win', 'lose');
    panel.style.setProperty('--zone-start', `${start * 100}%`);
    panel.style.setProperty('--zone-width', `${zone * 100}%`);
    panel.style.setProperty('--sweep-ms', `${BALANCE.qteSweepMs}ms`);
    panel.style.setProperty('--sweep-legs', legs);
    $('qte-verdict').textContent = '';

    const cursor = $('qte-cursor');
    cursor.style.removeProperty('animation-play-state');
    cursor.style.animation = 'none';
    void cursor.offsetWidth;
    cursor.style.animation = '';

    // Zoom sur le port paré : c'est la cassure. L'origine du transform suit le
    // port pour que le zoom parte de lui et pas du centre de la grille.
    const rect = port.el.getBoundingClientRect();
    const gridRect = $('grid').getBoundingClientRect();
    const grid = $('grid');
    grid.style.setProperty('--zoom-x', `${((rect.left + rect.width / 2) - gridRect.left) / gridRect.width * 100}%`);
    grid.style.setProperty('--zoom-y', `${((rect.top + rect.height / 2) - gridRect.top) / gridRect.height * 100}%`);
    $('glass-inner').classList.add('duel');
    port.el.classList.add('parrying');

    FX.sfx.virus(panOf(port));
    FX.shake(cabinet(), 8);
    setMsg('PARADE — place ton coup.', 'bad');

    round.qte.timeout = setTimeout(() => resolveQte(false), duration);
  }

  /** Le balayage triangulaire est lu au temps écoulé, pas dans le CSS. */
  function attemptQte() {
    const qte = round.qte;
    if (!qte || qte.done) return;
    const elapsed = Math.min(qte.duration, performance.now() - qte.startedAt);
    const leg = Math.min(qte.legs - 1, Math.floor(elapsed / BALANCE.qteSweepMs));
    const legProgress = Math.min(1, (elapsed - leg * BALANCE.qteSweepMs) / BALANCE.qteSweepMs);
    const progress = leg % 2 === 0 ? legProgress : 1 - legProgress;
    resolveQte(progress >= qte.zoneStart && progress <= qte.zoneStart + qte.zoneWidth);
  }

  function resolveQte(won) {
    const qte = round.qte;
    if (!qte || qte.done) return;
    qte.done = true;
    clearTimeout(qte.timeout);

    const panel = $('qte');
    panel.classList.add(won ? 'win' : 'lose');
    $('qte-verdict').textContent = won ? 'OUVERTURE' : 'CONTRE';
    $('qte-cursor').style.animationPlayState = 'paused';

    const port = qte.port;

    if (won) {
      round.parriesWon += 1;
      FX.sfx.crit(panOf(port));
      FX.shake(cabinet(), 9);
      setMsg('Garde brisée — enchaîne pendant qu\'elle est sonnée.', 'good');
    } else {
      round.playerStunUntil = performance.now() + BALANCE.playerStunMs * stats.playerStunMult;
      FX.sfx.virus(panOf(port));
      FX.shake(cabinet(), 12);
      setMsg('Contre encaissé — tu es étourdi.', 'bad');
    }

    setTimeout(() => {
      closeQte();
      if (!round.running) return;
      round.paused = false;
      thawTtls();

      if (won && port.target) {
        // La garde est ouverte : la sentinelle devient une cible sonnée qu'on
        // peut enchaîner.
        port.chain = 0;
        strike(port, port.target);
      } else if (port.target) {
        escape(port);
      }
      updateHud();
    }, won ? 420 : 640);
  }

  function closeQte() {
    const panel = $('qte');
    if (panel) {
      panel.hidden = true;
      panel.classList.remove('win', 'lose');
      $('qte-cursor')?.style.removeProperty('animation-play-state');
    }
    $('glass-inner')?.classList.remove('duel');
    document.querySelectorAll('.port.parrying').forEach(el => el.classList.remove('parrying'));
    if (round.qte?.timeout) clearTimeout(round.qte.timeout);
    round.qte = null;
  }

  // ── tourelles ───────────────────────────────────────────────────────────

  function turretSides() {
    return [
      { level: stats.turretLeft, col: 0, flank: $('flank-left') },
      { level: stats.turretRight, col: COLS - 1, flank: $('flank-right') },
    ];
  }

  function armTurrets() {
    disarmTurrets();

    const sides = turretSides();
    let armed = 0;
    for (const side of sides) {
      if (side.level <= 0) continue;
      armed += 1;
      side.flank.classList.add('armed');
      round.turretTimers.push(setInterval(() => fireTurret(side), BALANCE.turretIntervalMs[side.level]));
    }

    const pill = $('pill-turrets');
    pill.textContent = armed ? `${armed} TOURELLE${armed > 1 ? 'S' : ''}` : 'TOURELLES OFF';
    pill.classList.toggle('on', armed > 0);
  }

  function disarmTurrets() {
    round.turretTimers.forEach(clearInterval);
    round.turretTimers = [];
    $('flank-left').classList.remove('armed');
    $('flank-right').classList.remove('armed');
  }

  function fireTurret(side) {
    if (!round.running || round.paused) return;

    let candidates = ports.filter(p => p.target && p.index % COLS === side.col && !p.target.effect);
    if (stats.turretSmart >= 1) candidates = candidates.filter(p => !p.target.parry);
    if (!candidates.length) return;

    let target;
    if (stats.turretSmart >= 2) {
      target = candidates.reduce((best, p) => p.target.pts > best.target.pts ? p : best, candidates[0]);
    } else {
      target = candidates[Math.floor(Math.random() * candidates.length)];
    }

    side.flank.querySelectorAll('b').forEach(led => {
      led.classList.add('firing');
      setTimeout(() => led.classList.remove('firing'), 160);
    });
    FX.tracer(side.flank, target.el);
    FX.sfx.turret(side.col === 0 ? -0.85 : 0.85);

    // Une sentinelle sur ses gardes pare le tir sans déclencher de duel : le
    // joueur n'a pas frappé, il ne doit pas être puni. La tourelle perd sa
    // passe, c'est tout.
    if (target.target.parry && target.chain === 0) {
      popText(target, 'PARÉ', 'neg');
      FX.burst(target.el, 'bad', 0.7);
      return;
    }

    // Sur un blindé, le tir entame le bouclier au lieu de marquer.
    if (target.shieldLeft > 0) {
      target.shieldLeft -= 1;
      paintShield(target);
      popText(target, target.shieldLeft === 0 ? 'BRISÉ' : `${target.shieldLeft}/${target.target.shield}`, 'turret');
      FX.burst(target.el, 'turret', 0.7);
      stunTarget(target, BALANCE.shieldStunMs);
      return;
    }

    scoreHit(target, target.target, 1, true, { keep: false });
    if (stats.turretCombo) bumpCombo();
    updateHud();
  }

  // ── horloge et HUD ──────────────────────────────────────────────────────

  function tick() {
    if (!round.running) return;
    const left = Math.max(0, round.endsAt - performance.now()) / 1000;

    $('hud-time').textContent = Math.ceil(left);
    $('hud-time').classList.toggle('urgent', left <= 6);
    const fill = $('time-fill');
    fill.style.transform = `scaleX(${left / round.seconds})`;
    fill.classList.toggle('urgent', left <= 6);

    const heat = left <= 8 ? 1 - left / 8 : 0;
    cabinet()?.style.setProperty('--time-heat', heat.toFixed(3));
    $('glass-inner')?.classList.toggle('stunned', performance.now() < round.playerStunUntil);

    updateEffectPills();
    if (left <= 0) endRound();
  }

  function updateHud() {
    $('hud-round').textContent = run.round;
    $('hud-bank').textContent = `${fmt(run.bank)} / ${fmt(round.quota)}`;
    $('hud-manche').textContent = `M${mancheOf(run.round)} · ${stepInManche(run.round)}/${BALANCE.roundsPerManche}`;

    const combo = $('hud-combo');
    combo.textContent = `×${round.combo}`;
    combo.classList.toggle('combo-hot', round.combo >= stats.comboCap);

    const heat = Math.max(0, Math.min(1, (round.combo - 1) / Math.max(1, stats.comboCap - 1)));
    cabinet()?.style.setProperty('--combo-heat', heat.toFixed(3));

    const ratio = Math.min(1, run.bank / round.quota);
    $('quota-fill').style.width = `${ratio * 100}%`;
    $('quota-label').textContent = `${Math.floor(ratio * 100)} %`;
    document.querySelector('.quota-bar').classList.toggle('done', ratio >= 1);
  }

  function updateEffectPills() {
    const now = performance.now();
    const coolant = Math.max(0, Math.ceil((round.coolantUntil - now) / 1000));
    const overclock = Math.max(0, Math.ceil((round.overclockUntil - now) / 1000));

    const cp = $('pill-coolant');
    cp.textContent = coolant ? `COOLANT ${coolant}s` : 'COOLANT';
    cp.classList.toggle('on', coolant > 0);

    const op = $('pill-overclock');
    op.textContent = overclock ? `OVERCLOCK ${overclock}s` : 'OVERCLOCK';
    op.classList.toggle('on', overclock > 0);
    op.classList.toggle('amber', overclock > 0);
  }

  function setMsg(text, kind) {
    const node = $('round-msg');
    node.textContent = text;
    node.className = `round-msg${kind ? ` ${kind}` : ''}`;
  }

  // ── fin de round ────────────────────────────────────────────────────────

  function stopRound() {
    round.running = false;
    round.paused = false;
    if (round.clock) clearInterval(round.clock);
    round.clock = null;
    if (round.spawnTimer) clearTimeout(round.spawnTimer);
    round.spawnTimer = null;
    disarmTurrets();
    closeQte();
    ports.forEach(clearPort);
    FX.hum(false);
    cabinet()?.style.setProperty('--time-heat', '0');
    $('glass-inner')?.classList.remove('stunned');
  }

  function endRound() {
    if (!round.running) return;
    stopRound();

    if (run.bank < round.quota) {
      setMsg(`Palier manqué — il manquait ${fmt(round.quota - run.bank)}.`, 'bad');
      FX.sfx.failed();
      FX.shake(cabinet(), 13);
      setTimeout(gameOver, 1500);
      return;
    }

    run.bank -= round.quota;
    setMsg(`Palier réglé — ${fmt(round.quota)} prélevés, il reste ${fmt(run.bank)} en banque.`, 'good');
    FX.sfx.paid();
    if (run.round > save.bestRound) {
      save.bestRound = run.round;
      persist();
    }

    const finishedManche = isMancheEnd(run.round);
    run.round += 1;

    if (finishedManche) setTimeout(enterShop, 1500);
    else setTimeout(showInterlude, 1100);
  }

  /**
   * Souffle entre deux rounds d'une même manche : quelques secondes, pas
   * d'atelier. Ça enchaîne tout seul, ou tout de suite si le joueur clique.
   */
  function showInterlude() {
    const quota = quotaFor(run.round, stats);
    const short = Math.max(0, quota - run.bank);

    $('inter-title').textContent = `ROUND ${stepInManche(run.round)} / ${BALANCE.roundsPerManche}`;
    $('inter-manche').textContent = `MANCHE ${mancheOf(run.round)}`;
    $('inter-quota').textContent = fmt(quota);
    $('inter-bank').textContent = fmt(run.bank);
    $('inter-missing').textContent = fmt(short);
    $('inter-note').textContent = short > 0
      ? `Il te manque ${fmt(short)} — l'atelier n'ouvre qu'en fin de manche.`
      : 'Le palier est déjà couvert : ce round est du rab pour l\'atelier.';

    $('interlude').hidden = false;
    show('scr-round');

    let left = Math.ceil(BALANCE.interludeMs / 1000);
    $('inter-count').textContent = left;

    const step = () => {
      left -= 1;
      $('inter-count').textContent = Math.max(0, left);
      if (left > 0) {
        interludeTimer = setTimeout(step, 1000);
        return;
      }
      goNextRound();
    };
    interludeTimer = setTimeout(step, 1000);
  }

  function goNextRound() {
    if (interludeTimer) clearTimeout(interludeTimer);
    interludeTimer = null;
    $('interlude').hidden = true;
    startRound();
  }

  function gameOver() {
    const missing = Math.max(0, round.quota - run.bank);
    run.active = false;

    save.runs += 1;
    if (run.totalScore > save.bestScore) save.bestScore = run.totalScore;
    persist();

    $('over-kicker').textContent = 'PALIER NON RÉGLÉ';
    $('over-round').textContent = `MANCHE ${mancheOf(run.round)} · ROUND ${run.round}`;
    $('over-missing').textContent = fmt(missing);
    $('over-score').textContent = fmt(run.totalScore);
    $('over-best').textContent = save.bestRound ? `#${save.bestRound}` : '—';
    $('over-nodes').textContent = fmt(ownedNodeCount(save.tree));

    const owned = ownedNodeCount(save.tree);
    $('over-hint').innerHTML = owned
      ? `L'arbre est <strong>conservé</strong> : la prochaine run repart avec ${owned} niveau${owned > 1 ? 'x' : ''} acquis, banque à zéro.`
      : 'L\'arbre est permanent — la prochaine run gardera tout ce que tu achètes à l\'atelier.';

    renderMenu();
    show('scr-over');
  }

  // ── run ─────────────────────────────────────────────────────────────────

  function newRun() {
    discardShopChanges();
    stats = deriveStats(save.tree);
    run.active = true;
    run.round = 1;
    run.bank = 0;
    run.totalScore = 0;
    renderBrief();
    show('scr-brief');
  }

  // ── câblage ─────────────────────────────────────────────────────────────

  $('btn-play').addEventListener('click', newRun);
  $('btn-retry').addEventListener('click', newRun);
  $('btn-start-round').addEventListener('click', startRound);
  $('btn-next-round').addEventListener('click', validateShop);
  $('btn-cancel-shop').addEventListener('click', cancelShopPurchases);
  $('btn-inter-go').addEventListener('click', goNextRound);
  $('qte').addEventListener('click', attemptQte);

  $('btn-view-tree').addEventListener('click', () => {
    renderTree($('tree-view'), 'readonly');
    show('scr-tree');
  });
  $('btn-tree-back').addEventListener('click', () => show('scr-menu'));
  $('btn-home').addEventListener('click', () => { renderMenu(); show('scr-menu'); });

  $('btn-wipe').addEventListener('click', () => {
    if (!window.confirm('Effacer tout l’arbre, le meilleur score et le compteur de runs ?')) return;
    save = emptySave();
    stats = deriveStats(save.tree);
    persist();
    renderMenu();
  });

  // Barre d'espace pendant un duel : le clavier doit pouvoir parer aussi.
  window.addEventListener('keydown', event => {
    if (event.code !== 'Space' || !round.qte || round.qte.done) return;
    event.preventDefault();
    attemptQte();
  });

  document.querySelector('.corner-tools a[href="/arena/"]').addEventListener('click', discardShopChanges);
  window.addEventListener('resize', () => {
    drawTreeLinks($('tree-view'));
    drawTreeLinks($('shop-tree'));
  });
  window.addEventListener('beforeunload', () => {
    discardShopChanges();
    stopRound();
  });

  FX.attach($('fx-layer'), $('arena'));

  const muteBtn = $('btn-mute');
  const paintMute = () => {
    const muted = FX.isMuted();
    muteBtn.textContent = muted ? '🔇' : '🔊';
    muteBtn.setAttribute('aria-pressed', String(muted));
    muteBtn.title = muted ? 'Rétablir le son' : 'Couper le son';
  };
  muteBtn.addEventListener('click', () => {
    FX.setMuted(!FX.isMuted());
    paintMute();
    if (!FX.isMuted()) {
      FX.unlock();
      FX.sfx.tick();
      if (round.running) FX.hum(true);
    }
  });
  paintMute();

  // Les navigateurs n'autorisent l'audio qu'après un geste : on ouvre le
  // contexte au premier contact, quel qu'il soit.
  const unlockOnce = () => {
    FX.unlock();
    window.removeEventListener('pointerdown', unlockOnce);
    window.removeEventListener('keydown', unlockOnce);
  };
  window.addEventListener('pointerdown', unlockOnce);
  window.addEventListener('keydown', unlockOnce);

  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', () => FX.sfx.tick());
  });

  renderMenu();

  // Couture de mise au point : vérifier la courbe de palier, l'effet des nœuds
  // et les chemins pilotés par minuteur (parade, tourelles, chaîne) sans avoir
  // à jouer vingt rounds à la main. Ces crochets court-circuitent uniquement
  // l'attente, jamais les règles.
  window.__droneQuota = {
    BALANCE, TARGETS, TREE, NODES, ports,
    quotaFor, deriveStats, roundSecondsFor, mancheOf, stepInManche, isMancheEnd,
    normalizeTree, branchInvestment, branchDepth, unlockCheck, nodeState,
    renderTree, enterShop, cancelShopPurchases, validateShop, discardShopChanges,
    run, round,
    get save() { return save; },
    get stats() { return stats; },
    get shopSnapshot() { return shopSnapshot; },

    forceSpawn(index, typeId) {
      const port = ports[index];
      const type = TARGETS.find(t => t.id === typeId);
      if (!port) return null;
      clearPort(port);
      if (!type) return null;
      dressPort(port, type);
      return type.id;
    },

    fireTurretNow(sideIndex) {
      const side = turretSides()[sideIndex];
      if (!side || side.level <= 0) return false;
      fireTurret(side);
      return true;
    },

    /** Force l'issue du duel en cours, sans dépendre du balayage. */
    resolveQteNow(won) {
      if (!round.qte || round.qte.done) return false;
      resolveQte(won);
      return true;
    },
  };
})();
