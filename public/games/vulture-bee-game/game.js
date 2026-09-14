'use strict';

(() => {
  const $ = id => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const fmt = n => Math.round(n).toLocaleString('fr-FR');
  const dec = n => n.toFixed(1).replace('.', ',');
  const signed = n => (Math.round(n) >= 0 ? '+' : '−') + fmt(Math.abs(n));
  const hours = days => `${Math.round(days * 24)} h`;
  const TAU = Math.PI * 2;
  const fx = window.NecroFX;

  const SAVE_KEY = 'necrobutinage:v1';
  const MAP_W = 800;
  const MAP_H = 500;
  const HIVE = { x: 96, y: 250 };

  // Tous les leviers d'équilibrage. Une journée dure 12 s à vitesse ×1.
  const BALANCE = {
    secondsPerDay: 12,
    stepDays: 0.01,
    daysPerSeason: 8,
    startWorkers: 40,
    startBrood: 6,
    startCells: 24,
    startPots: 2,
    startCerumen: 10,
    startProtein: 20,
    adultEat: 0.1,          // protéines par ouvrière et par jour
    broodEat: 0.5,          // protéines par larve et par jour
    broodDays: 4,           // durée de développement d'une larve
    layPerDay: 6,
    nurseCapacity: 3,       // larves par nourrice
    adultMortality: 0.015,  // par jour, hors faim et infection
    collapseWorkers: 5,
    potCapacity: 20,
    potCost: 12,
    cellsBatch: 8,
    cellsCost: 15,
    cerumenPerBuilder: 1.5,
    rawSpoil: 0.12,         // part de viande crue perdue par jour
    rawLoadGain: 0.15,      // la viande crue se charge en microbes
    potMaturation: 0.5,     // décroissance de la charge en pot, par jour
    maturedLoad: 0.2,       // sous ce seuil, la viande compte comme mûrie
    infectionPerLoad: 1.5,
    infectionDecay: 4,      // points d'infection résorbés par jour
    foragerSpeed: 600,      // unités de carte par jour
    cutDays: 0.1,
    carry: 1.2,
    rainForaging: 0.15,
    flies: 0.06,            // part de la carcasse mangée par les mouches, par jour
    antLoss: 0.03,          // part des butineuses tuées par jour sur une carcasse à fourmis
    maxCarcasses: 6,
    maxTeam: 5,
    maxWeight: 10,
    raidChance: 0.12,
    raidBase: 10,
    guardStrength: 1,
    // Un joueur scripté prudent finit entre 95 et 170 ouvrières : l'essaimage doit se mériter.
    swarmThreshold: 120,
    researchPerProtein: 0.1,
  };

  const SEASONS = [
    { name: 'Fin des pluies', rain: 0.25, spawn: 0.7, decay: 1, flies: 1, raids: 0.5, rawLoad: 1,
      hint: 'Les dernières pluies. Carcasses assez fréquentes et raids rares : bâtissez des pots et agrandissez le couvain tant que c’est calme.' },
    { name: 'Saison sèche', rain: 0.08, spawn: 0.65, decay: 1.5, flies: 1.6, raids: 1, rawLoad: 1,
      hint: 'La chaleur accélère la décomposition et attire les mouches : les carcasses deviennent vite putrides.' },
    { name: 'Cœur de la sèche', rain: 0.02, spawn: 0.35, decay: 1.8, flies: 2, raids: 1.6, rawLoad: 1,
      hint: 'Les carcasses se font rares et les fourmis affamées multiplient les raids. Vivez sur vos réserves.' },
    { name: 'Retour des pluies', rain: 0.55, spawn: 0.6, decay: 1.2, flies: 1, raids: 1.2, rawLoad: 2,
      hint: 'On butine peu sous la pluie, et la viande crue se charge deux fois plus vite en microbes.' },
  ];

  const STAGES = [
    { id: 'fraiche', name: 'Fraîche', until: 1.5, rate: 0.6, load: 0.1, color: '#8fbf4a' },
    { id: 'mure', name: 'Mûre', until: 4, rate: 1, load: 0.35, color: '#e8b33a' },
    { id: 'putride', name: 'Putride', until: 7, rate: 1.2, load: 0.8, color: '#a86ee0' },
  ];

  const CARCASS_TYPES = [
    { id: 'grenouille', name: 'Grenouille', icon: '🐸', mass: [30, 50], weight: 3 },
    { id: 'lezard', name: 'Lézard', icon: '🦎', mass: [45, 70], weight: 3 },
    { id: 'poisson', name: 'Poisson échoué', icon: '🐟', mass: [70, 110], weight: 2 },
    { id: 'oiseau', name: 'Oiseau', icon: '🐦', mass: [90, 140], weight: 2 },
    { id: 'singe', name: 'Singe hurleur', icon: '🐒', mass: [220, 320], weight: 0.5 },
  ];

  const ROLES = [
    { id: 'butineuses', name: 'Butineuses', icon: '🥩', desc: 'Découpent et rapportent la chair' },
    { id: 'nourrices', name: 'Nourrices', icon: '🍯', desc: `Élèvent le couvain, ${BALANCE.nurseCapacity} larves chacune` },
    { id: 'gardiennes', name: 'Gardiennes', icon: '🛡️', desc: 'Repoussent les raids de fourmis' },
    { id: 'batisseuses', name: 'Bâtisseuses', icon: '🧱', desc: `Produisent ${dec(BALANCE.cerumenPerBuilder)} cérumen par jour` },
  ];

  const RESEARCH = [
    { id: 'acido', name: 'Bactéries acidophiles', desc: 'Charge microbienne rapportée −25 %', costs: [5, 10, 18] },
    { id: 'cerumen', name: 'Cérumen antimicrobien', desc: 'Maturation en pot +50 %', costs: [6, 14] },
    { id: 'mandibules', name: 'Mandibules tranchantes', desc: 'Découpe +25 %', costs: [6, 14] },
    { id: 'odorat', name: 'Odorat fin', desc: 'Carcasses repérées +30 %', costs: [5, 12] },
    { id: 'gardes', name: 'Gardiennes aguerries', desc: 'Défense contre les raids +50 %', costs: [5, 12] },
    { id: 'reine', name: 'Reine féconde', desc: 'Ponte +3 par jour', costs: [8, 16] },
  ];

  // Bonus permanents achetés avec les essaimages (fin d'année réussie avec une colonie nombreuse).
  const PERKS = [
    { id: 'essaim', name: 'Essaim nombreux', desc: '+8 ouvrières au départ', max: 3 },
    { id: 'reserves', name: 'Réserves', desc: '+1 pot plein de viande mûrie au départ', max: 3 },
    { id: 'lignee', name: 'Lignée acidophile', desc: 'Bactéries acidophiles niveau 1 au départ', max: 1 },
  ];

  // ── Sauvegarde ──
  function loadSave() {
    const base = { best: null, swarms: 0, perks: {}, muted: false };
    try {
      const raw = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (raw && typeof raw === 'object') return { ...base, ...raw, perks: { ...(raw.perks || {}) } };
    } catch { /* stockage indisponible : partie sans sauvegarde */ }
    return base;
  }
  const save = loadSave();
  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* idem */ }
  }
  const perkLevel = id => save.perks[id] | 0;
  const perkPointsFree = () => save.swarms - PERKS.reduce((sum, p) => sum + perkLevel(p.id), 0);

  // ── État ──
  let colony = null;
  let speed = 0;
  let selectedId = null;
  let logVersion = 0;

  const totalDays = () => SEASONS.length * BALANCE.daysPerSeason;
  const seasonIndex = () => Math.min(SEASONS.length - 1, Math.floor(colony.day / BALANCE.daysPerSeason));
  const season = () => SEASONS[seasonIndex()];
  function stageIndex(k) {
    const i = STAGES.findIndex(s => k.age < s.until);
    return i === -1 ? STAGES.length - 1 : i;
  }
  const stageOf = k => STAGES[stageIndex(k)];
  const tripDays = k => 2 * k.dist / BALANCE.foragerSpeed + BALANCE.cutDays;
  const storedProtein = () => colony.raw.qty + colony.pots.reduce((sum, p) => sum + p.qty, 0);
  const dailyNeed = () => colony.workers * BALANCE.adultEat + colony.brood * BALANCE.broodEat;
  const deliveredLoad = st => st.load * (1 - 0.25 * colony.research.acido);

  function roleCounts() {
    const w = colony.weights;
    const sum = ROLES.reduce((s, r) => s + w[r.id], 0) || 1;
    return Object.fromEntries(ROLES.map(r => [r.id, colony.workers * w[r.id] / sum]));
  }
  const broodCapacity = counts => Math.min(colony.cells, counts.nourrices * BALANCE.nurseCapacity);
  const defense = counts => counts.gardiennes * BALANCE.guardStrength * (1 + 0.5 * colony.research.gardes);

  function newColony() {
    const reserves = perkLevel('reserves');
    const pots = Array.from({ length: BALANCE.startPots + reserves }, () => ({ qty: 0, load: 0 }));
    pots[0].qty = BALANCE.startProtein;
    pots[0].load = 0.05;
    for (let i = 1; i <= reserves; i++) Object.assign(pots[i], { qty: BALANCE.potCapacity, load: 0.05 });
    const research = Object.fromEntries(RESEARCH.map(r => [r.id, 0]));
    if (perkLevel('lignee')) research.acido = 1;

    colony = {
      day: 0,
      dayIndex: -1,
      workers: BALANCE.startWorkers + 8 * perkLevel('essaim'),
      brood: BALANCE.startBrood,
      cells: BALANCE.startCells,
      cerumen: BALANCE.startCerumen,
      raw: { qty: 0, load: 0 },
      pots,
      infection: 0,
      research,
      points: 0,
      weights: { butineuses: 4, nourrices: 3, gardiennes: 2, batisseuses: 2 },
      carcasses: [],
      nextId: 1,
      rainy: false,
      raid: null,
      dayStartWorkers: null,
      netWorkers: null,
      today: { delivered: 0 },
      yesterday: null,
      log: [],
      over: false,
      stats: { delivered: 0, maxWorkers: 0, maxInfection: 0, raidsWon: 0, raidsLost: 0 },
    };
    colony.stats.maxWorkers = colony.workers;
    spawnCarcass({ type: 'lezard', dist: 210, age: 1.7, ants: false, quiet: true });
    spawnCarcass({ type: 'oiseau', dist: 430, age: 0.2, ants: false, quiet: true });
    selectedId = null;
    resetViews();
    logEvent('La colonie s’installe dans un tronc creux. Un lézard et un oiseau sont déjà repérés.');
  }

  function logEvent(text, tone = '') {
    colony.log.unshift({ day: Math.min(totalDays(), Math.floor(colony.day) + 1), text, tone });
    colony.log.length = Math.min(colony.log.length, 40);
    logVersion++;
  }

  // ── Carcasses ──
  function pickType() {
    const total = CARCASS_TYPES.reduce((s, t) => s + t.weight, 0);
    let r = Math.random() * total;
    for (const t of CARCASS_TYPES) {
      r -= t.weight;
      if (r <= 0) return t;
    }
    return CARCASS_TYPES[0];
  }

  function spawnCarcass(opts = {}) {
    if (colony.carcasses.length >= BALANCE.maxCarcasses) return null;
    const type = CARCASS_TYPES.find(t => t.id === opts.type) || pickType();
    let x;
    let y;
    let tries = 0;
    do {
      const angle = rand(-1.15, 1.15);
      const dist = opts.dist ?? rand(160, 640);
      x = clamp(HIVE.x + Math.cos(angle) * dist, 150, MAP_W - 40);
      y = clamp(HIVE.y + Math.sin(angle) * dist, 45, MAP_H - 45);
      tries++;
    } while (tries < 30 && colony.carcasses.some(k => Math.hypot(k.x - x, k.y - y) < 80));
    const mass = Math.round(rand(type.mass[0], type.mass[1]));
    const k = {
      id: colony.nextId++,
      type,
      x,
      y,
      dist: Math.hypot(x - HIVE.x, y - HIVE.y),
      mass,
      mass0: mass,
      age: opts.age ?? rand(0, 0.8),
      ants: opts.ants ?? Math.random() < (seasonIndex() >= 1 ? 0.35 : 0.2),
      team: 0,
      foragers: 0,
    };
    colony.carcasses.push(k);
    if (!opts.quiet) {
      logEvent(`${type.icon} ${type.name} repéré : aller-retour ${hours(tripDays(k))}${k.ants ? ', fourmis sur place' : ''}.`);
      fx.discovery();
    }
    return k;
  }

  // ── Réserves ──
  function addRaw(qty, load) {
    const raw = colony.raw;
    if (qty <= 0) return;
    raw.load = (raw.qty * raw.load + qty * load) / (raw.qty + qty);
    raw.qty += qty;
  }

  function fillPots() {
    const raw = colony.raw;
    for (const pot of colony.pots) {
      if (raw.qty <= 0.001) return;
      const move = Math.min(BALANCE.potCapacity - pot.qty, raw.qty);
      if (move <= 0) continue;
      pot.load = (pot.qty * pot.load + move * raw.load) / (pot.qty + move);
      pot.qty += move;
      raw.qty -= move;
    }
  }

  // La viande la plus mûrie d'abord, la crue en dernier recours.
  function consume(need) {
    let left = need;
    let loadSum = 0;
    let matured = 0;
    const sources = colony.pots.filter(p => p.qty > 0).sort((a, b) => a.load - b.load);
    sources.push(colony.raw);
    for (const src of sources) {
      if (left <= 0) break;
      const q = Math.min(left, src.qty);
      if (q <= 0) continue;
      src.qty -= q;
      left -= q;
      loadSum += q * src.load;
      if (src.load < BALANCE.maturedLoad) matured += q;
    }
    return { eaten: need - left, loadSum, matured };
  }

  function takeProtein(amount) {
    let left = amount;
    for (const src of [colony.raw, ...colony.pots]) {
      const q = Math.min(left, src.qty);
      src.qty -= q;
      left -= q;
      if (left <= 0) return;
    }
  }

  // ── Simulation ──
  function newDay(idx) {
    const c = colony;
    const previousSeason = c.dayIndex < 0 ? -1 : Math.floor(c.dayIndex / BALANCE.daysPerSeason);
    c.dayIndex = idx;
    const si = Math.floor(idx / BALANCE.daysPerSeason);
    const s = SEASONS[si];

    c.netWorkers = c.dayStartWorkers === null ? null : c.workers - c.dayStartWorkers;
    c.dayStartWorkers = c.workers;
    c.yesterday = idx > 0 ? c.today : null;
    c.today = { delivered: 0 };

    c.rainy = idx > 0 && Math.random() < s.rain;
    if (c.rainy) logEvent('🌧️ Journée de pluie : les butineuses sortent à peine.');

    if (c.raid && idx >= c.raid.day) {
      resolveRaid();
    } else if (!c.raid && idx >= 3 && Math.random() < BALANCE.raidChance * s.raids) {
      const strength = BALANCE.raidBase * (1 + idx / 8) * rand(0.8, 1.2);
      c.raid = { day: idx + 1, strength };
      logEvent(`🐜 Une colonne de fourmis approche : raid demain, force ${fmt(strength)}.`, 'danger');
      fx.raidWarn();
    }

    const expected = s.spawn * (1 + 0.3 * c.research.odorat);
    let n = Math.floor(expected) + (Math.random() < expected % 1 ? 1 : 0);
    while (n-- > 0) spawnCarcass();

    if (previousSeason >= 0 && si !== previousSeason) announceSeason(si);
  }

  function resolveRaid() {
    const c = colony;
    const counts = roleCounts();
    const def = defense(counts);
    const str = c.raid.strength;
    c.raid = null;
    if (def >= str) {
      const lost = Math.min(counts.gardiennes, str * 0.15);
      c.workers -= lost;
      c.stats.raidsWon++;
      logEvent(`🛡️ Raid repoussé (défense ${fmt(def)} contre ${fmt(str)}), ${fmt(lost)} gardiennes tombées.`, 'good');
      fx.raidWon();
      return;
    }
    const ratio = clamp(1 - def / str, 0.2, 1);
    const stolen = storedProtein() * 0.4 * ratio;
    takeProtein(stolen);
    const broodLost = c.brood * 0.35 * ratio;
    c.brood -= broodLost;
    const lost = Math.min(c.workers, counts.gardiennes * 0.5 + str * 0.1);
    c.workers -= lost;
    c.stats.raidsLost++;
    logEvent(`🐜 Raid perdu : ${fmt(stolen)} protéines pillées, ${fmt(broodLost)} larves et ${fmt(lost)} ouvrières perdues.`, 'danger');
    fx.raidLost();
    document.body.classList.remove('flash');
    void document.body.offsetWidth;
    document.body.classList.add('flash');
  }

  function step(dt) {
    const c = colony;
    const dayIdx = Math.floor(c.day);
    if (dayIdx !== c.dayIndex) newDay(dayIdx);
    const s = season();
    const counts = roleCounts();
    const efficiency = 1 - c.infection / 200;

    // Carcasses : décomposition, mouches, butinage.
    const teams = c.carcasses.reduce((sum, k) => sum + k.team, 0);
    for (const k of c.carcasses) {
      k.age += dt * s.decay;
      k.mass -= k.mass * BALANCE.flies * s.flies * dt;
      const st = stageOf(k);
      k.foragers = teams > 0 ? counts.butineuses * k.team / teams : 0;
      if (k.foragers > 0 && k.mass > 0) {
        const perDay = k.foragers / tripDays(k) * BALANCE.carry * st.rate
          * (1 + 0.25 * c.research.mandibules) * efficiency * (c.rainy ? BALANCE.rainForaging : 1);
        const got = Math.min(k.mass, perDay * dt);
        k.mass -= got;
        addRaw(got, deliveredLoad(st));
        c.stats.delivered += got;
        c.today.delivered += got;
        if (k.ants) c.workers -= k.foragers * BALANCE.antLoss * dt;
      }
    }
    for (const k of c.carcasses.filter(k => k.age >= STAGES[STAGES.length - 1].until || k.mass < 1)) {
      logEvent(k.mass < 1 ? `${k.type.icon} ${k.type.name} entièrement nettoyé.` : `${k.type.icon} ${k.type.name} décomposé, perdu pour la colonie.`);
      if (selectedId === k.id) selectedId = null;
    }
    c.carcasses = c.carcasses.filter(k => k.age < STAGES[STAGES.length - 1].until && k.mass >= 1);

    // Viande : la crue pourrit et se charge, les pots la font mûrir.
    c.raw.qty -= c.raw.qty * BALANCE.rawSpoil * dt;
    if (c.raw.qty > 0) c.raw.load = Math.min(1, c.raw.load + BALANCE.rawLoadGain * s.rawLoad * dt);
    fillPots();
    const maturation = Math.exp(-BALANCE.potMaturation * (1 + 0.5 * c.research.cerumen) * dt);
    for (const pot of c.pots) pot.load *= maturation;

    c.cerumen += counts.batisseuses * BALANCE.cerumenPerBuilder * efficiency * dt;

    // Repas, infection, recherche.
    const need = dailyNeed() * dt;
    const meal = consume(need);
    const hunger = need > 0 ? 1 - meal.eaten / need : 0;
    c.infection = clamp(c.infection + meal.loadSum * BALANCE.infectionPerLoad - BALANCE.infectionDecay * dt, 0, 100);
    c.points += meal.matured * BALANCE.researchPerProtein;

    // Couvain et ouvrières.
    const capacity = broodCapacity(counts);
    const layRate = (BALANCE.layPerDay + 3 * c.research.reine) * clamp((capacity - c.brood) / 2, 0, 1) * (1 - hunger);
    const hatch = c.brood / BALANCE.broodDays * dt;
    const broodDeath = c.brood * (hunger * 0.6 + Math.max(0, (c.infection - 30) / 100) * 0.8) * dt;
    c.brood = Math.max(0, c.brood + layRate * dt - hatch - broodDeath);
    c.workers += hatch;
    c.workers -= c.workers * (BALANCE.adultMortality + hunger * 0.08 + Math.max(0, (c.infection - 60) / 100) * 0.3) * dt;

    c.stats.maxWorkers = Math.max(c.stats.maxWorkers, c.workers);
    c.stats.maxInfection = Math.max(c.stats.maxInfection, c.infection);
    c.day += dt;

    if (c.workers < BALANCE.collapseWorkers) endColony(false);
    else if (c.day >= totalDays()) endColony(true);
  }

  function endColony(victory) {
    const c = colony;
    c.over = true;
    setSpeed(0);
    const days = Math.min(totalDays(), Math.floor(c.day));
    const score = Math.round(c.stats.delivered + c.workers * 2 + days * 5 + (victory ? 200 : 0));
    const swarm = victory && c.workers >= BALANCE.swarmThreshold;
    if (swarm) save.swarms++;
    const record = !save.best || score > save.best.score;
    if (record) save.best = { score, day: days, victory };
    persist();
    if (victory) fx.victory(); else fx.collapse();
    logEvent(victory ? 'L’année est bouclée.' : 'La colonie s’est effondrée.', victory ? 'good' : 'danger');
    showEnd({ victory, score, swarm, record, days });
  }

  // ── Actions du joueur ──
  function setSpeed(value) {
    speed = value;
    document.querySelectorAll('[data-speed]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.speed === value)));
  }

  function buildPot() {
    if (colony.over || colony.cerumen < BALANCE.potCost) return;
    colony.cerumen -= BALANCE.potCost;
    colony.pots.push({ qty: 0, load: 0 });
    fx.build();
    logEvent('🍯 Nouveau pot de cérumen.');
    renderUi();
  }

  function buildCells() {
    if (colony.over || colony.cerumen < BALANCE.cellsCost) return;
    colony.cerumen -= BALANCE.cellsCost;
    colony.cells += BALANCE.cellsBatch;
    fx.build();
    logEvent(`🥚 ${BALANCE.cellsBatch} cellules de couvain ajoutées.`);
    renderUi();
  }

  function study(id) {
    const r = RESEARCH.find(x => x.id === id);
    const level = colony.research[id];
    const cost = r.costs[level];
    if (colony.over || cost === undefined || colony.points < cost) return;
    colony.points -= cost;
    colony.research[id]++;
    fx.research();
    logEvent(`🧬 ${r.name} : niveau ${colony.research[id]}.`, 'good');
    renderUi();
  }

  // ── Fenêtres ──
  let overlayResume = 0;

  function openOverlay(html, bind) {
    if ($('overlay').hidden) overlayResume = speed;
    setSpeed(0);
    const card = $('overlay-card');
    card.innerHTML = html;
    $('overlay').hidden = false;
    bind?.(card);
    card.querySelector('.primary')?.focus();
  }

  function closeOverlay(resumeAt = overlayResume) {
    $('overlay').hidden = true;
    if (colony && !colony.over) setSpeed(resumeAt);
  }

  const rulesHtml = () => `
    <ul class="rules">
      <li>🥩 <b>Carcasses</b> : donnez-leur des équipes de butineuses. Fraîche, la chair se découpe lentement mais reste saine ; putride, elle vient vite mais grouille de microbes.</li>
      <li>🍯 <b>Pots de cérumen</b> : la viande y mûrit et perd sa charge microbienne. La viande crue qui ne trouve pas de pot pourrit et infecte la colonie.</li>
      <li>☣️ <b>Infection</b> : au-delà de 30 %, le couvain meurt ; au-delà de 60 %, les ouvrières aussi.</li>
      <li>🐜 <b>Raids</b> : une colonne de fourmis s’annonce la veille. Renforcez les gardiennes à temps.</li>
      <li>🧬 <b>Microbiome</b> : chaque protéine mûrie consommée rapporte des points de recherche.</li>
      <li>🗓️ <b>Objectif</b> : tenir quatre saisons. Terminez avec ${BALANCE.swarmThreshold} ouvrières ou plus pour essaimer et gagner un bonus permanent.</li>
    </ul>
    <p class="note">Espace : pause · 1, 2, 3 : vitesse ×1, ×2, ×4. Le temps s’arrête tant qu’une fenêtre est ouverte.</p>`;

  function perksHtml() {
    if (save.swarms <= 0) return '';
    return `
      <h3 class="eyebrow">Essaimages · ${perkPointsFree()} point(s) libre(s)</h3>
      <ul class="perks">${PERKS.map(p => `
        <li><div><span class="name">${p.name}</span> <span class="pips">${'●'.repeat(perkLevel(p.id))}${'○'.repeat(p.max - perkLevel(p.id))}</span><small class="note">${p.desc}</small></div>
        <button class="secondary" data-perk="${p.id}" ${perkPointsFree() <= 0 || perkLevel(p.id) >= p.max ? 'disabled' : ''}>Choisir</button></li>`).join('')}
      </ul>
      <p class="note">Les bonus s’appliquent à la prochaine colonie. <button class="secondary" data-perk-reset>Redistribuer</button></p>`;
  }

  function bindPerks(card, rerender) {
    card.querySelectorAll('[data-perk]').forEach(b => b.addEventListener('click', () => {
      const p = PERKS.find(x => x.id === b.dataset.perk);
      if (perkPointsFree() <= 0 || perkLevel(p.id) >= p.max) return;
      save.perks[p.id] = perkLevel(p.id) + 1;
      persist();
      fx.click();
      rerender();
    }));
    card.querySelector('[data-perk-reset]')?.addEventListener('click', () => {
      save.perks = {};
      persist();
      rerender();
    });
  }

  function showIntro() {
    const render = () => openOverlay(`
      <p class="eyebrow">Gestion de colonie</p>
      <h2>Nécrobutinage</h2>
      <p>Vous dirigez une colonie de <em>Trigona</em>, des abeilles sans dard qui se nourrissent de charognes. Tenez une année entière.</p>
      ${rulesHtml()}
      ${save.best ? `<p class="note">Record : ${fmt(save.best.score)} points, jour ${save.best.day}${save.best.victory ? ', année bouclée' : ''}.</p>` : ''}
      ${perksHtml()}
      <div class="actions"><button class="primary" data-start>Fonder la colonie</button></div>`, card => {
      card.querySelector('[data-start]').addEventListener('click', () => {
        newColony();
        closeOverlay(1);
      });
      bindPerks(card, render);
    });
    render();
  }

  function showHelp() {
    openOverlay(`<h2>Règles</h2>${rulesHtml()}<div class="actions"><button class="primary" data-close>Reprendre</button></div>`,
      card => card.querySelector('[data-close]').addEventListener('click', () => closeOverlay()));
  }

  function summaryHtml(extra = []) {
    const c = colony;
    const rows = [
      ['Ouvrières', fmt(c.workers)],
      ['Couvain', fmt(c.brood)],
      ['Protéines en réserve', fmt(storedProtein())],
      ['Infection', `${fmt(c.infection)} %`],
      ['Protéines livrées', fmt(c.stats.delivered)],
      ['Raids repoussés', `${c.stats.raidsWon} / ${c.stats.raidsWon + c.stats.raidsLost}`],
      ...extra,
    ];
    return `<dl class="summary">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
  }

  function announceSeason(si) {
    const s = SEASONS[si];
    fx.season();
    logEvent(`🗓️ ${s.name}.`);
    openOverlay(`
      <p class="eyebrow">Saison ${si + 1} / ${SEASONS.length}</p>
      <h2>${s.name}</h2>
      <p>${s.hint}</p>
      ${summaryHtml()}
      <div class="actions"><button class="primary" data-close>Continuer</button></div>`,
    card => card.querySelector('[data-close]').addEventListener('click', () => closeOverlay(Math.max(1, overlayResume))));
  }

  function showEnd({ victory, score, swarm, record, days }) {
    const c = colony;
    const render = () => openOverlay(`
      <p class="eyebrow">${victory ? 'Année bouclée' : `Jour ${days + 1}`}</p>
      <h2>${victory ? 'La colonie a tenu' : 'La colonie s’est effondrée'}</h2>
      <p>${victory
    ? (swarm ? `Avec ${fmt(c.workers)} ouvrières, une jeune reine part fonder une colonie-fille : <b>+1 essaimage</b>.`
      : `Il fallait ${BALANCE.swarmThreshold} ouvrières pour essaimer ; la colonie en compte ${fmt(c.workers)}.`)
    : 'Moins de cinq ouvrières : la reine n’est plus nourrie.'}</p>
      ${summaryHtml([['Ouvrières au maximum', fmt(c.stats.maxWorkers)], ['Infection au maximum', `${fmt(c.stats.maxInfection)} %`]])}
      <p><b>Score : ${fmt(score)}</b> ${record ? '· nouveau record' : `· record ${fmt(save.best.score)}`}</p>
      ${perksHtml()}
      <div class="actions"><button class="primary" data-restart>Nouvelle colonie</button></div>`, card => {
      card.querySelector('[data-restart]').addEventListener('click', () => {
        newColony();
        closeOverlay(1);
      });
      bindPerks(card, render);
    });
    render();
  }

  // ── Interface ──
  const carcassEls = new Map();
  let potsCount = -1;
  let renderedLog = -1;

  function resetViews() {
    carcassEls.forEach(el => el.remove());
    carcassEls.clear();
    potsCount = -1;
    renderedLog = -1;
  }

  function buildStatic() {
    $('roles').innerHTML = ROLES.map(r => `
      <li data-role="${r.id}">
        <div><span class="name">${r.icon} ${r.name}</span><small>${r.desc}</small></div>
        <div class="stepper"><span class="share"></span>
          <button data-act="minus" aria-label="Moins de ${r.name.toLowerCase()}">−</button><b></b>
          <button data-act="plus" aria-label="Plus de ${r.name.toLowerCase()}">+</button></div>
      </li>`).join('');
    $('research').innerHTML = RESEARCH.map(r => `
      <li data-research="${r.id}">
        <div><span class="name">${r.name}</span><span class="pips"></span><small>${r.desc}</small></div>
        <button class="action" data-act="study"></button>
      </li>`).join('');
  }

  function setRes(id, value, sub, tone = '') {
    const el = $(`r-${id}`);
    el.querySelector('b').textContent = value;
    const small = el.querySelector('small');
    if (small) small.textContent = sub;
    el.classList.toggle('warn', tone === 'warn');
    el.classList.toggle('bad', tone === 'bad');
  }

  const loadColor = load => `hsl(${Math.round(90 - clamp(load, 0, 1) * 170 + 360) % 360} 55% 52%)`;

  function currentAlert(counts) {
    const c = colony;
    const need = dailyNeed();
    if (c.raid) {
      const def = defense(counts);
      return def >= c.raid.strength
        ? { tone: 'warn', text: `🐜 Raid demain : force ${fmt(c.raid.strength)}, votre défense ${fmt(def)}. Ça devrait tenir.` }
        : { tone: 'danger', text: `🐜 Raid demain : force ${fmt(c.raid.strength)}, votre défense ${fmt(def)}. Renforcez les gardiennes.` };
    }
    if (c.infection >= 60) return { tone: 'danger', text: '☣️ Infection critique : le couvain et les ouvrières meurent.' };
    if (storedProtein() < need) return { tone: 'danger', text: '🍖 Moins d’un jour de réserves : la colonie va avoir faim.' };
    if (c.raw.qty > 4) return { tone: 'warn', text: `🥩 ${fmt(c.raw.qty)} protéines crues sans pot : elles pourrissent. Bâtissez des pots.` };
    if (c.infection >= 30) return { tone: 'warn', text: '☣️ Infection au-dessus de 30 % : le couvain en souffre.' };
    if (c.rainy) return { tone: 'warn', text: '🌧️ Pluie : le butinage tombe à 15 %.' };
    if (c.carcasses.length && !c.carcasses.some(k => k.team > 0)) return { tone: 'warn', text: 'Envoyez des butineuses : bouton + sur une carcasse.' };
    return null;
  }

  function renderUi() {
    const c = colony;
    if (!c) return;
    const s = season();
    const counts = roleCounts();
    const need = dailyNeed();
    const stock = storedProtein();

    $('season').textContent = s.name;
    $('day').textContent = `Jour ${Math.min(totalDays(), Math.floor(c.day) + 1)} / ${totalDays()}`;
    $('day-progress').style.width = `${(c.day % 1) * 100}%`;
    $('weather').textContent = c.rainy ? '🌧️ Pluie' : '☀️ Sec';

    setRes('workers', fmt(c.workers), c.netWorkers === null ? `départ ${fmt(c.dayStartWorkers ?? c.workers)}` : `${signed(c.netWorkers)} hier`,
      c.workers < 15 ? 'bad' : '');
    const capacity = broodCapacity(counts);
    const limit = c.cells <= counts.nourrices * BALANCE.nurseCapacity ? 'cellules' : 'nourrices';
    setRes('brood', fmt(c.brood), `place ${fmt(capacity)}, limitée par les ${limit}`);
    const autonomy = need > 0 ? stock / need : Infinity;
    setRes('protein', fmt(stock), `${c.yesterday ? `${signed(c.yesterday.delivered)} livrées hier · ` : ''}${dec(Math.min(autonomy, 99))} j de réserve`,
      autonomy < 1 ? 'bad' : autonomy < 2 ? 'warn' : '');
    setRes('cerumen', fmt(c.cerumen), `+${dec(counts.batisseuses * BALANCE.cerumenPerBuilder)} par jour`);
    setRes('infection', `${fmt(c.infection)} %`, '', c.infection >= 60 ? 'bad' : c.infection >= 30 ? 'warn' : '');
    $('infection-fill').style.width = `${c.infection}%`;
    $('infection-fill').style.backgroundColor = c.infection >= 60 ? 'var(--danger)' : c.infection >= 30 ? 'var(--honey)' : 'var(--green)';

    const alert = c.over ? null : currentAlert(counts);
    $('alert').hidden = !alert;
    if (alert) {
      $('alert').textContent = alert.text;
      $('alert').className = `alert ${alert.tone}`;
    }

    // Rôles
    const weightSum = ROLES.reduce((sum, r) => sum + c.weights[r.id], 0) || 1;
    for (const r of ROLES) {
      const li = $('roles').querySelector(`[data-role="${r.id}"]`);
      li.querySelector('.share').textContent = `${fmt(counts[r.id])} 🐝`;
      li.querySelector('b').textContent = `${Math.round(c.weights[r.id] / weightSum * 100)} %`;
      li.querySelector('[data-act="minus"]').disabled = c.weights[r.id] <= 0;
      li.querySelector('[data-act="plus"]').disabled = c.weights[r.id] >= BALANCE.maxWeight;
    }

    renderCarcasses();

    // Réserves
    if (potsCount !== c.pots.length) {
      $('pots').innerHTML = c.pots.map(() => '<span class="pot"><i></i></span>').join('');
      potsCount = c.pots.length;
    }
    [...$('pots').children].forEach((el, i) => {
      const pot = c.pots[i];
      el.querySelector('i').style.height = `${pot.qty / BALANCE.potCapacity * 100}%`;
      el.style.setProperty('--load', loadColor(pot.load / 0.8));
      el.title = `${fmt(pot.qty)} / ${BALANCE.potCapacity} protéines, charge ${fmt(pot.load * 100)} %`;
    });
    const potQty = c.pots.reduce((sum, p) => sum + p.qty, 0);
    $('pots-summary').textContent = `${fmt(potQty)} / ${fmt(c.pots.length * BALANCE.potCapacity)} en pots`;
    $('raw').textContent = c.raw.qty >= 0.5
      ? `Viande crue hors pot : ${fmt(c.raw.qty)}, charge ${fmt(c.raw.load * 100)} %.`
      : 'Toute la viande est en pots. Vert : mûrie ; violet : chargée en microbes.';
    $('raw').classList.toggle('bad', c.raw.qty >= 0.5);
    $('build-pot').disabled = c.over || c.cerumen < BALANCE.potCost;
    $('build-pot-cost').textContent = `${BALANCE.potCost} cérumen · +${BALANCE.potCapacity} de stockage`;
    $('build-cells').disabled = c.over || c.cerumen < BALANCE.cellsCost;
    $('build-cells-cost').textContent = `${BALANCE.cellsCost} cérumen · +${BALANCE.cellsBatch} places`;

    // Recherche
    $('research-points').textContent = `${dec(c.points)} points`;
    for (const r of RESEARCH) {
      const li = $('research').querySelector(`[data-research="${r.id}"]`);
      const level = c.research[r.id];
      const cost = r.costs[level];
      li.querySelector('.pips').textContent = `${'●'.repeat(level)}${'○'.repeat(r.costs.length - level)}`;
      const btn = li.querySelector('button');
      btn.textContent = cost === undefined ? 'Maîtrisé' : `Étudier · ${cost}`;
      btn.disabled = c.over || cost === undefined || c.points < cost;
    }

    if (renderedLog !== logVersion) {
      $('log').innerHTML = c.log.slice(0, 12).map(e => `<li class="${e.tone}"><b>J${e.day}</b>${e.text}</li>`).join('');
      renderedLog = logVersion;
    }
  }

  function renderCarcasses() {
    const c = colony;
    const list = $('carcasses');
    const alive = new Set();
    const s = season();
    for (const k of c.carcasses) {
      alive.add(k.id);
      let el = carcassEls.get(k.id);
      if (!el) {
        el = document.createElement('li');
        el.className = 'carcass';
        el.dataset.id = String(k.id);
        el.innerHTML = `
          <span class="icon" aria-hidden="true">${k.type.icon}</span>
          <div><div class="title"><b>${k.type.name}</b><span class="stage"></span>${k.ants ? '<span class="ants">🐜 fourmis</span>' : ''}</div>
            <span class="detail"></span><div class="mass"><i></i></div></div>
          <div class="team"><div class="stepper">
            <button data-act="minus" aria-label="Retirer une équipe">−</button><b></b>
            <button data-act="plus" aria-label="Ajouter une équipe">+</button></div><small></small></div>`;
        list.appendChild(el);
        carcassEls.set(k.id, el);
      }
      const idx = stageIndex(k);
      const st = STAGES[idx];
      const next = idx < STAGES.length - 1 ? `${STAGES[idx + 1].name.toLowerCase()} dans ${dec((st.until - k.age) / s.decay)} j`
        : `disparaît dans ${dec((st.until - k.age) / s.decay)} j`;
      el.classList.toggle('selected', k.id === selectedId);
      el.style.setProperty('--stage', st.color);
      el.querySelector('.stage').textContent = `${st.name} · charge ${fmt(deliveredLoad(st) * 100)} %`;
      el.querySelector('.detail').textContent = `reste ${fmt(k.mass)} · aller-retour ${hours(tripDays(k))} · ${next}`;
      el.querySelector('.mass i').style.width = `${k.mass / k.mass0 * 100}%`;
      el.querySelector('.stepper b').textContent = String(k.team);
      el.querySelector('.team small').textContent = `${fmt(k.foragers)} 🐝`;
      el.querySelector('[data-act="minus"]').disabled = k.team <= 0;
      el.querySelector('[data-act="plus"]').disabled = k.team >= BALANCE.maxTeam;
    }
    for (const [id, el] of carcassEls) {
      if (!alive.has(id)) {
        el.remove();
        carcassEls.delete(id);
      }
    }
    $('carcasses-empty').hidden = c.carcasses.length > 0;
  }

  // ── Carte ──
  const canvas = $('map');
  const ctx = canvas.getContext('2d');
  let scale = 1;

  // Décor fixe : graine constante pour que la forêt ne change pas d'une partie à l'autre.
  const DECOR = (() => {
    let seed = 7;
    const next = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    return Array.from({ length: 70 }, () => ({
      x: 150 + next() * (MAP_W - 150),
      y: next() * MAP_H,
      r: 10 + next() * 34,
      color: next() < 0.5 ? '#25331b' : '#2d2418',
      alpha: 0.35 + next() * 0.4,
    }));
  })();

  function resizeMap() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.width * MAP_H / MAP_W * dpr);
    scale = canvas.width / MAP_W;
  }
  new ResizeObserver(resizeMap).observe(canvas);

  function circle(x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
  }

  function drawMap() {
    const c = colony;
    if (!c || !canvas.width) return;
    const t = c.day;
    const s = season();
    ctx.setTransform(scale, 0, 0, scale, 0, 0);

    const ground = ctx.createLinearGradient(0, 0, MAP_W, 0);
    ground.addColorStop(0, '#1f2a17');
    ground.addColorStop(1, '#131a0f');
    ctx.fillStyle = ground;
    ctx.fillRect(0, 0, MAP_W, MAP_H);
    for (const d of DECOR) {
      ctx.globalAlpha = d.alpha;
      ctx.fillStyle = d.color;
      circle(d.x, d.y, d.r);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Tronc du nid
    ctx.fillStyle = '#3b2a1c';
    ctx.fillRect(HIVE.x - 62, 0, 58, MAP_H);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(HIVE.x - 56 + i * 11, 0);
      ctx.lineTo(HIVE.x - 52 + i * 11, MAP_H);
      ctx.stroke();
    }

    // Pistes et butineuses
    for (const k of c.carcasses) {
      if (k.foragers < 0.5) continue;
      ctx.strokeStyle = 'rgba(232,179,58,0.14)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(HIVE.x + 14, HIVE.y);
      ctx.lineTo(k.x, k.y);
      ctx.stroke();
      const dots = Math.max(1, Math.round(Math.min(24, Math.ceil(k.foragers / 2)) * (c.rainy ? BALANCE.rainForaging : 1)));
      const trip = tripDays(k);
      for (let i = 0; i < dots; i++) {
        const phase = (t / trip + i / dots) % 1;
        const outbound = phase < 0.5;
        const p = outbound ? phase * 2 : (1 - phase) * 2;
        const x = HIVE.x + 14 + (k.x - HIVE.x - 14) * p;
        const y = HIVE.y + (k.y - HIVE.y) * p + Math.sin((phase + i) * 23) * 3;
        ctx.fillStyle = outbound ? '#f3d36b' : '#e07a3a';
        circle(x, y, outbound ? 2.2 : 2.8);
        ctx.fill();
      }
    }

    // Carcasses
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const k of c.carcasses) {
      const st = stageOf(k);
      const r = 10 + Math.sqrt(k.mass0) * 1.4;
      ctx.fillStyle = 'rgba(70,24,24,0.55)';
      ctx.beginPath();
      ctx.ellipse(k.x, k.y + 4, r * 1.3, r * 0.9, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = st.color;
      ctx.lineWidth = 3;
      circle(k.x, k.y, r);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath();
      ctx.arc(k.x, k.y, r + 5, -Math.PI / 2, -Math.PI / 2 + TAU * k.mass / k.mass0);
      ctx.stroke();
      ctx.font = `${Math.round(r * 1.05)}px system-ui, "Segoe UI Emoji", sans-serif`;
      ctx.fillText(k.type.icon, k.x, k.y + 1);
      if (k.id === selectedId) {
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = '#e8b33a';
        ctx.lineWidth = 2;
        circle(k.x, k.y, r + 12);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      const flies = Math.round(3 * s.flies * (st.id === 'putride' ? 2 : 1));
      ctx.fillStyle = 'rgba(200,200,190,0.7)';
      for (let j = 0; j < flies; j++) {
        const a = t * (9 + j) + j * 2.1;
        circle(k.x + Math.cos(a) * (r + 9 + j * 2), k.y + Math.sin(a * 1.3) * (r * 0.7), 1.3);
        ctx.fill();
      }
      if (k.ants) {
        ctx.fillStyle = '#120a06';
        for (let j = 0; j < 10; j++) {
          const a = j / 10 * TAU + t * 0.6;
          circle(k.x + Math.cos(a) * (r + 1), k.y + Math.sin(a) * (r + 1), 1.6);
          ctx.fill();
        }
      }
    }

    // Colonne de fourmis en route vers le nid
    if (c.raid) {
      const progress = clamp(t - (c.raid.day - 1), 0, 1);
      const from = { x: MAP_W + 10, y: MAP_H - 30 };
      const to = { x: HIVE.x + 20, y: HIVE.y + 20 };
      ctx.fillStyle = '#5a1a12';
      for (let i = 0; i < 40; i++) {
        const p = progress - i * 0.012;
        if (p < 0) break;
        circle(from.x + (to.x - from.x) * p, from.y + (to.y - from.y) * p + Math.sin(i * 1.7 + t * 40) * 3, 2);
        ctx.fill();
      }
    }

    // Entrée en tube de cérumen
    ctx.fillStyle = '#c98f2e';
    ctx.beginPath();
    ctx.moveTo(HIVE.x - 8, HIVE.y - 12);
    ctx.lineTo(HIVE.x + 18, HIVE.y - 7);
    ctx.lineTo(HIVE.x + 18, HIVE.y + 7);
    ctx.lineTo(HIVE.x - 8, HIVE.y + 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1a1208';
    ctx.beginPath();
    ctx.ellipse(HIVE.x + 18, HIVE.y, 3.5, 6, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#e6e2d3';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('Nid', HIVE.x - 33, HIVE.y + 30);

    if (c.rainy) {
      ctx.strokeStyle = 'rgba(160,190,220,0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 70; i++) {
        const x = (i * 137 + t * 3000) % (MAP_W + 60) - 30;
        const y = (i * 89 + t * 9000) % (MAP_H + 40) - 20;
        ctx.moveTo(x, y);
        ctx.lineTo(x - 6, y + 14);
      }
      ctx.stroke();
    }
  }

  // ── Événements ──
  document.querySelectorAll('[data-speed]').forEach(b => b.addEventListener('click', () => {
    if (colony && !colony.over && $('overlay').hidden) setSpeed(+b.dataset.speed);
  }));

  $('roles').addEventListener('click', e => {
    const btn = e.target.closest('button[data-act]');
    if (!btn || !colony || colony.over) return;
    const id = btn.closest('[data-role]').dataset.role;
    const delta = btn.dataset.act === 'plus' ? 1 : -1;
    colony.weights[id] = clamp(colony.weights[id] + delta, 0, BALANCE.maxWeight);
    fx.click();
    renderUi();
  });

  $('carcasses').addEventListener('click', e => {
    const li = e.target.closest('.carcass');
    if (!li || !colony) return;
    const k = colony.carcasses.find(x => x.id === +li.dataset.id);
    if (!k) return;
    selectedId = k.id;
    const btn = e.target.closest('button[data-act]');
    if (btn && !colony.over) {
      k.team = clamp(k.team + (btn.dataset.act === 'plus' ? 1 : -1), 0, BALANCE.maxTeam);
      fx.click();
    }
    renderUi();
  });

  $('research').addEventListener('click', e => {
    const btn = e.target.closest('button[data-act="study"]');
    if (btn) study(btn.closest('[data-research]').dataset.research);
  });

  $('build-pot').addEventListener('click', buildPot);
  $('build-cells').addEventListener('click', buildCells);
  $('help').addEventListener('click', () => { if ($('overlay').hidden) showHelp(); });

  function renderSound() { $('sound').textContent = save.muted ? '🔇' : '🔊'; }
  $('sound').addEventListener('click', () => {
    save.muted = !save.muted;
    fx.setMuted(save.muted);
    persist();
    renderSound();
  });

  canvas.addEventListener('click', e => {
    if (!colony) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * MAP_W / rect.width;
    const y = (e.clientY - rect.top) * MAP_H / rect.height;
    let best = null;
    let bestDist = 45;
    for (const k of colony.carcasses) {
      const d = Math.hypot(k.x - x, k.y - y);
      if (d < bestDist) {
        best = k;
        bestDist = d;
      }
    }
    selectedId = best ? best.id : null;
    if (best) carcassEls.get(best.id)?.scrollIntoView({ block: 'nearest' });
    renderUi();
  });

  document.addEventListener('keydown', e => {
    if (!colony || colony.over || !$('overlay').hidden || e.target.closest('input, textarea')) return;
    if (e.code === 'Space' && !e.target.closest('button')) {
      e.preventDefault();
      setSpeed(speed === 0 ? 1 : 0);
    } else if (e.key === '1' || e.key === '2' || e.key === '3') {
      setSpeed([1, 2, 4][+e.key - 1]);
    }
  });

  // ── Boucle ──
  let last = performance.now();
  let acc = 0;
  let lastUi = 0;
  function frame(now) {
    const realDt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (colony && !colony.over && speed > 0) {
      acc += realDt * speed / BALANCE.secondsPerDay;
      let guard = 0;
      while (acc >= BALANCE.stepDays && speed > 0 && !colony.over && guard++ < 200) {
        step(BALANCE.stepDays);
        acc -= BALANCE.stepDays;
      }
    } else {
      acc = 0;
    }
    drawMap();
    if (now - lastUi > 100) {
      renderUi();
      lastUi = now;
    }
    requestAnimationFrame(frame);
  }

  buildStatic();
  fx.setMuted(save.muted);
  renderSound();
  // Une colonie tourne déjà derrière l'accueil ; « Fonder » en recrée une avec les bonus choisis.
  newColony();
  setSpeed(0);
  showIntro();
  requestAnimationFrame(frame);

  // Couture de test : lire l'état et avancer la simulation sans attendre l'horloge.
  window.__necro = {
    BALANCE,
    get colony() { return colony; },
    get speed() { return speed; },
    newColony,
    spawnCarcass,
    setSpeed,
    renderUi,
    advance(days) {
      const steps = Math.round(days / BALANCE.stepDays);
      for (let i = 0; i < steps && !colony.over; i++) step(BALANCE.stepDays);
      renderUi();
    },
  };
})();
