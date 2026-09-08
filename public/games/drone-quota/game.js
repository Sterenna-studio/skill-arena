/**
 * Drone Quota — whack-a-mole roguelite à quotas.
 *
 * Boucle : un round de 26 s sur 12 ports, un quota prélevé sur la banque à la
 * fin, trois vies perdues sur les virus. Le quota monte à chaque round ; la
 * banque sert à la fois à le payer et à acheter des nœuds définitifs. Toute la
 * tension est là — investir, c'est reculer sur la facture suivante.
 *
 * Autonome : aucune dépendance, aucun appel réseau, progression en
 * localStorage. Rien à voir avec le wallet Star Tokens de l'arcade.
 */
(() => {
  'use strict';

  const SAVE_KEY = 'drone-quota:v1';

  const BALANCE = {
    roundSeconds: 26,
    quotaBase: 520,
    // Croissance geometrique, pas polynomiale : le revenu d'un round est a peu
    // pres constant, donc un quota quasi lineaire finit toujours par etre
    // depasse pour de bon et la run ne s'arrete jamais. En x1.5 par round, la
    // facture rattrape n'importe quel revenu — la question est juste quand.
    quotaGrowth: 1.5,
    spawnBaseMs: 340,
    spawnVarianceMs: 300,
    coolantSlowFactor: 1.55,
    coolantMs: 3200,
    overclockMs: 4200,
    baseLives: 3,
    baseComboCap: 6,
    baseMaxActive: 2,
    turretIntervalMs: [0, 2600, 1800, 1200],
    turretPointShare: 0.6,
  };

  /** Types de cible. `pts` négatif = virus. `effect` = bonus sans points. */
  const TARGETS = [
    { id: 'drone', icon: '🤖', name: 'DRONE', pts: 6, weight: 46, ttl: 900 },
    { id: 'scout', icon: '⚡', name: 'SCOUT', pts: 12, weight: 20, ttl: 560 },
    { id: 'core', icon: '⭐', name: 'CORE', pts: 30, weight: 7, ttl: 700 },
    { id: 'coolant', icon: '🔋', name: 'COOLANT', pts: 0, weight: 7, ttl: 760, effect: 'coolant' },
    { id: 'overclock', icon: '💠', name: 'OVERCLOCK', pts: 0, weight: 6, ttl: 720, effect: 'overclock' },
    { id: 'virus', icon: '💣', name: 'VIRUS', pts: -20, weight: 14, ttl: 950 },
  ];

  const ROWS = 3;
  const COLS = 4;
  const PORTS = ROWS * COLS;

  // ── arbre de compétences ────────────────────────────────────────────────
  //
  // Permanent : les niveaux achetés survivent à la mort. Le quota monte pour
  // compenser. Chaque nœud écrit directement dans l'objet de stats dérivé.

  const TREE = [
    {
      id: 'armement',
      name: 'ARMEMENT',
      color: '#35e6ff',
      blurb: 'Ce que ton marteau fait au contact.',
      nodes: [
        {
          id: 'frappe', name: 'FRAPPE RENFORCÉE', max: 4, costs: [260, 620, 1400, 2900],
          desc: lvl => `+${lvl * 25}% sur tous les points marqués.`,
          apply: (s, lvl) => { s.pointMult += 0.25 * lvl; },
        },
        {
          id: 'combo', name: 'COMBO ÉTENDU', max: 3, costs: [440, 1100, 2400],
          requires: {},
          desc: lvl => `Combo plafonné à ×${BALANCE.baseComboCap + lvl * 2} au lieu de ×${BALANCE.baseComboCap}.`,
          apply: (s, lvl) => { s.comboCap += 2 * lvl; },
        },
        {
          id: 'critique', name: 'FRAPPE CRITIQUE', max: 3, costs: [560, 1300, 2700],
          requires: { frappe: 1 },
          desc: lvl => `${lvl * 8}% de chance de tripler les points d'une touche.`,
          apply: (s, lvl) => { s.critChance += 0.08 * lvl; },
        },
        {
          id: 'onde', name: 'ONDE DE CHOC', max: 2, costs: [1700, 3800],
          requires: { frappe: 2 },
          desc: lvl => `L'impact touche aussi les ports voisins, à ${lvl === 1 ? '50' : '100'}% des points.`,
          apply: (s, lvl) => { s.splash = lvl === 1 ? 0.5 : 1; },
        },
      ],
    },
    {
      id: 'flux',
      name: 'FLUX',
      color: '#3cf0a0',
      blurb: 'Ce que les ports crachent, et à quelle vitesse.',
      nodes: [
        {
          id: 'cadence', name: 'CADENCE DE POP', max: 3, costs: [560, 1400, 3000],
          desc: lvl => `Les cibles arrivent ${lvl * 12}% plus vite.`,
          apply: (s, lvl) => { s.spawnScale *= Math.pow(0.88, lvl); },
        },
        {
          id: 'densite', name: 'DENSITÉ DE FLUX', max: 3, costs: [750, 1900, 3900],
          desc: lvl => `${BALANCE.baseMaxActive + lvl} cibles simultanées au lieu de ${BALANCE.baseMaxActive}.`,
          apply: (s, lvl) => { s.maxActive += lvl; },
        },
        {
          id: 'fenetre', name: 'FENÊTRE LONGUE', max: 2, costs: [640, 1650],
          desc: lvl => `Les cibles restent ${lvl * 18}% plus longtemps.`,
          apply: (s, lvl) => { s.ttlMult += 0.18 * lvl; },
        },
        {
          id: 'rarete', name: 'SIGNAL RARE', max: 3, costs: [820, 2000, 4300],
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
      nodes: [
        {
          id: 'tourelleG', name: 'TOURELLE BÂBORD', max: 3, costs: [1100, 2600, 5200],
          desc: lvl => `Tire sur la colonne de gauche toutes les ${(BALANCE.turretIntervalMs[lvl] / 1000).toFixed(1)} s.`,
          apply: (s, lvl) => { s.turretLeft = lvl; },
        },
        {
          id: 'tourelleD', name: 'TOURELLE TRIBORD', max: 3, costs: [1100, 2600, 5200],
          requires: { tourelleG: 1 },
          desc: lvl => `Tire sur la colonne de droite toutes les ${(BALANCE.turretIntervalMs[lvl] / 1000).toFixed(1)} s.`,
          apply: (s, lvl) => { s.turretRight = lvl; },
        },
        {
          id: 'ciblage', name: 'CIBLAGE SMART', max: 2, costs: [2200, 4700],
          requires: { tourelleG: 1 },
          desc: lvl => lvl === 1
            ? 'Les tourelles ne tirent plus sur les virus.'
            : 'Les tourelles évitent les virus et visent la cible la plus chère.',
          apply: (s, lvl) => { s.turretSmart = lvl; },
        },
        {
          id: 'surchauffe', name: 'SURCHAUFFE', max: 2, costs: [2800, 6000],
          requires: { tourelleG: 2 },
          desc: lvl => lvl === 1
            ? 'Les tirs de tourelle alimentent ton combo.'
            : 'Les tirs de tourelle alimentent le combo et marquent à plein tarif.',
          apply: (s, lvl) => { s.turretCombo = lvl; },
        },
      ],
    },
    {
      id: 'vital',
      name: 'VITAL',
      color: '#ffbe3c',
      blurb: 'Tenir plus longtemps, et payer moins cher.',
      nodes: [
        {
          id: 'vie', name: 'REDONDANCE', max: 3, costs: [900, 2400, 5000],
          desc: lvl => `${BALANCE.baseLives + lvl} vies par round au lieu de ${BALANCE.baseLives}.`,
          apply: (s, lvl) => { s.lives += lvl; },
        },
        {
          id: 'bouclier', name: 'PARE-FEU', max: 2, costs: [1300, 3200],
          desc: lvl => `${lvl === 1 ? 'Le premier virus' : 'Les deux premiers virus'} touché${lvl > 1 ? 's' : ''} du round ne coûte${lvl > 1 ? 'nt' : ''} pas de vie.`,
          apply: (s, lvl) => { s.virusShield += lvl; },
        },
        {
          id: 'negoce', name: 'NÉGOCIATION', max: 3, costs: [1900, 4500, 8500],
          desc: lvl => `Quota réduit de ${lvl * 6}%.`,
          apply: (s, lvl) => { s.quotaDiscount += 0.06 * lvl; },
        },
      ],
    },
  ];

  const NODES = new Map();
  for (const branch of TREE) {
    for (const node of branch.nodes) NODES.set(node.id, { ...node, branch });
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
      // On ne garde que des nœuds connus, bornés à leur max : une sauvegarde
      // d'une version précédente ne doit pas injecter de niveau fantôme.
      const tree = {};
      for (const [id, lvl] of Object.entries(save.tree ?? {})) {
        const node = NODES.get(id);
        if (!node) continue;
        const level = Math.floor(Number(lvl));
        if (Number.isFinite(level) && level > 0) tree[id] = Math.min(level, node.max);
      }
      save.tree = tree;
      return save;
    } catch (error) {
      console.warn('[Drone Quota] sauvegarde illisible, on repart de zéro :', error?.message ?? error);
      return emptySave();
    }
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
      turretLeft: 0,
      turretRight: 0,
      turretSmart: 0,
      turretCombo: 0,
      lives: BALANCE.baseLives,
      virusShield: 0,
      quotaDiscount: 0,
    };
    for (const branch of TREE) {
      for (const node of branch.nodes) {
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

  function nodeState(node, tree, bank) {
    const level = tree[node.id] ?? 0;
    if (level >= node.max) return { level, status: 'maxed', cost: null };
    for (const [reqId, reqLvl] of Object.entries(node.requires ?? {})) {
      if ((tree[reqId] ?? 0) < reqLvl) {
        return { level, status: 'locked', cost: node.costs[level], blockedBy: NODES.get(reqId), reqLvl };
      }
    }
    const cost = node.costs[level];
    return { level, status: bank >= cost ? 'buyable' : 'poor', cost };
  }

  function ownedNodeCount(tree) {
    return Object.values(tree).reduce((sum, lvl) => sum + lvl, 0);
  }

  // ── état ────────────────────────────────────────────────────────────────

  let save = loadSave();
  let stats = deriveStats(save.tree);

  const run = {
    active: false,
    round: 1,
    bank: 0,
    totalScore: 0,
  };

  const round = {
    running: false,
    endsAt: 0,
    lives: 0,
    combo: 1,
    maxCombo: 1,
    gain: 0,
    hits: 0,
    misses: 0,
    virusHits: 0,
    shieldLeft: 0,
    coolantUntil: 0,
    overclockUntil: 0,
    quota: 0,
    clock: null,
    spawnTimer: null,
    turretTimers: [],
  };

  const ports = [];

  // ── helpers DOM ─────────────────────────────────────────────────────────

  const $ = id => document.getElementById(id);
  const fmt = value => Math.round(value).toLocaleString('fr-FR');
  const hearts = n => n > 0 ? '♥'.repeat(n) : '—';

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

  /** @param mode 'shop' = achetable, 'readonly' = consultation depuis l'accueil. */
  function renderTree(container, mode) {
    const bank = mode === 'shop' ? run.bank : Infinity;
    container.innerHTML = '';

    for (const branch of TREE) {
      const box = document.createElement('div');
      box.className = 'branch';
      box.style.setProperty('--branch', branch.color);
      box.innerHTML = `<h3>${branch.name}</h3><p>${branch.blurb}</p>`;

      for (const node of branch.nodes) {
        const state = nodeState(node, save.tree, bank);
        const shownLevel = Math.max(1, state.level + (state.status === 'maxed' ? 0 : 1));
        const dots = '●'.repeat(state.level) + '○'.repeat(node.max - state.level);

        let footer;
        if (state.status === 'maxed') {
          footer = `<span class="node-cost">—</span><span class="node-state">MAX</span>`;
        } else if (state.status === 'locked') {
          footer = `<span class="node-cost">${fmt(state.cost)}</span>`
            + `<span class="node-state">REQUIERT ${state.blockedBy.name} ${state.reqLvl}</span>`;
        } else if (mode === 'readonly') {
          footer = `<span class="node-cost">${fmt(state.cost)}</span>`
            + `<span class="node-state">NIVEAU ${state.level} / ${node.max}</span>`;
        } else {
          footer = `<span class="node-cost">${fmt(state.cost)}</span>`
            + `<span class="node-state">${state.status === 'poor' ? 'BANQUE INSUFFISANTE' : 'ACHETER'}</span>`;
        }

        const button = document.createElement('button');
        button.type = 'button';
        button.className = `node ${state.status}${mode === 'readonly' ? ' readonly' : ''}`;
        button.innerHTML = `
          <span class="node-head">
            <span class="node-name">${node.name}</span>
            <span class="node-dots">${dots}</span>
          </span>
          <span class="node-desc">${node.desc(shownLevel)}</span>
          <span class="node-foot">${footer}</span>`;

        if (mode === 'shop' && state.status === 'buyable') {
          button.addEventListener('click', () => buy(node));
        } else {
          button.disabled = mode === 'shop';
        }

        box.appendChild(button);
      }

      container.appendChild(box);
    }
  }

  function buy(node) {
    const state = nodeState(node, save.tree, run.bank);
    if (state.status !== 'buyable') return;
    run.bank -= state.cost;
    save.tree[node.id] = state.level + 1;
    persist();
    stats = deriveStats(save.tree);
    renderShop();
  }

  // ── atelier ─────────────────────────────────────────────────────────────

  function renderShop() {
    const next = quotaFor(run.round, stats);
    $('shop-next-round').textContent = run.round;
    $('shop-next-quota').textContent = fmt(next);
    $('shop-bank').textContent = fmt(run.bank);

    const warning = $('shop-warning');
    const short = next - run.bank;
    // Rouge = tu es sous la barre là, maintenant. Ambre = tu es au-dessus,
    // mais chaque achat t'en rapproche.
    if (short > 0) {
      warning.className = 'shop-warning danger';
      warning.innerHTML = `Il te manque <strong>${fmt(short)}</strong> pour le quota du round ${run.round}. `
        + `Tout ce que tu dépenses ici, il faudra le regagner sur les ports.`;
    } else {
      warning.className = 'shop-warning';
      warning.innerHTML = `Ta banque couvre le quota du round ${run.round} `
        + `(<strong>${fmt(next)}</strong>), avec ${fmt(-short)} d'avance. `
        + `Investir maintenant, c'est repasser sous la barre.`;
    }

    renderTree($('shop-tree'), 'shop');
  }

  // ── briefing ────────────────────────────────────────────────────────────

  function renderBrief() {
    const quota = quotaFor(run.round, stats);
    $('brief-round').textContent = run.round;
    $('brief-quota').textContent = fmt(quota);
    $('brief-bank').textContent = fmt(run.bank);
    $('brief-missing').textContent = fmt(Math.max(0, quota - run.bank));
    $('brief-lives').textContent = hearts(stats.lives);
    $('brief-duration').textContent = `${BALANCE.roundSeconds}s`;

    const owned = ownedNodeCount(save.tree);
    $('brief-hint').innerHTML = owned
      ? `Tu démarres avec <strong>${owned}</strong> niveau${owned > 1 ? 'x' : ''} d'arbre déjà acquis. `
        + `Le quota, lui, ne se souvient de rien.`
      : `Aucun nœud pour l'instant : encaisse le premier round, puis va dépenser à l'atelier.`;
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
        + `<span class="icon">⬡</span><span class="name">IDLE</span>`;
      const port = { index: i, el: button, target: null, ttlTimer: null };
      button.addEventListener('click', () => onPortClick(port));
      grid.appendChild(button);
      ports.push(port);
    }

    for (const side of ['flank-left', 'flank-right']) {
      $(side).innerHTML = '<b></b><b></b><b></b>';
    }
  }

  function clearPort(port) {
    if (port.ttlTimer) clearTimeout(port.ttlTimer);
    port.ttlTimer = null;
    port.target = null;
    port.el.className = 'port';
    port.el.querySelector('.icon').textContent = '⬡';
    port.el.querySelector('.name').textContent = 'IDLE';
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

  // ── round ───────────────────────────────────────────────────────────────

  function startRound() {
    round.quota = quotaFor(run.round, stats);
    round.lives = stats.lives;
    round.combo = 1;
    round.maxCombo = 1;
    round.gain = 0;
    round.hits = 0;
    round.misses = 0;
    round.virusHits = 0;
    round.shieldLeft = stats.virusShield;
    round.coolantUntil = 0;
    round.overclockUntil = 0;

    buildGrid();
    updateHud();
    setMsg('Frappe tout ce qui bouge.', '');
    show('scr-round');

    countdown(() => {
      round.running = true;
      round.endsAt = performance.now() + BALANCE.roundSeconds * 1000;
      round.clock = setInterval(tick, 100);
      scheduleSpawn();
      armTurrets();
    });
  }

  function countdown(done) {
    const steps = ['3', '2', '1', 'GO'];
    let i = 0;
    const node = document.createElement('div');
    node.className = 'countdown';
    document.body.appendChild(node);

    const step = () => {
      if (i >= steps.length) {
        node.remove();
        done();
        return;
      }
      node.textContent = steps[i++];
      node.style.animation = 'none';
      void node.offsetWidth;
      node.style.animation = '';
      setTimeout(step, 480);
    };
    step();
  }

  function scheduleSpawn() {
    if (!round.running) return;

    const free = ports.filter(p => !p.target);
    const activeCount = ports.length - free.length;
    if (free.length && activeCount < stats.maxActive) {
      spawn(free[Math.floor(Math.random() * free.length)]);
    }

    const slow = performance.now() < round.coolantUntil ? BALANCE.coolantSlowFactor : 1;
    const delay = (BALANCE.spawnBaseMs * stats.spawnScale + Math.random() * BALANCE.spawnVarianceMs) * slow;
    round.spawnTimer = setTimeout(scheduleSpawn, delay);
  }

  function spawn(port) {
    const type = weightedPick(TARGETS, t => t.id === 'core' ? t.weight * stats.coreWeightMult : t.weight);
    port.target = type;
    port.el.className = `port up ${type.id}`;
    port.el.querySelector('.icon').textContent = type.icon;
    port.el.querySelector('.name').textContent = type.name;

    const ttl = type.ttl * stats.ttlMult;
    port.ttlTimer = setTimeout(() => escape(port), ttl);
  }

  function escape(port) {
    if (!port.target) return;
    const positive = port.target.pts > 0;
    clearPort(port);
    if (!positive) return;
    round.combo = 1;
    port.el.classList.add('gone');
    setTimeout(() => port.el.classList.remove('gone'), 200);
    updateHud();
  }

  function onPortClick(port) {
    if (!round.running) return;

    if (!port.target) {
      // Frapper dans le vide casse le combo : sans ça, le spam de clics est
      // toujours la stratégie optimale.
      round.misses += 1;
      round.combo = 1;
      popText(port, 'RATÉ', 'neg');
      setMsg('Coup dans le vide — combo perdu.', 'bad');
      updateHud();
      return;
    }

    const type = port.target;

    if (type.effect) {
      applyEffect(type.effect);
      round.combo = Math.min(stats.comboCap, round.combo + 1);
      round.maxCombo = Math.max(round.maxCombo, round.combo);
      popText(port, type.effect === 'coolant' ? 'FLUX -' : 'POINTS ×2', 'turret');
      flashPort(port, 'hit');
      updateHud();
      return;
    }

    if (type.pts < 0) {
      hitVirus(port, type);
      return;
    }

    scoreHit(port, type, 1, false);
    // L'onde part avant l'incrément : les éclats appartiennent à la frappe qui
    // les a produits, ils ne doivent pas encaisser le combo qu'elle vient de
    // gagner.
    if (stats.splash > 0) splash(port);

    round.hits += 1;
    round.combo = Math.min(stats.comboCap, round.combo + 1);
    round.maxCombo = Math.max(round.maxCombo, round.combo);
    updateHud();
  }

  function splash(origin) {
    const col = origin.index % COLS;
    const neighbours = [];
    if (col > 0) neighbours.push(ports[origin.index - 1]);
    if (col < COLS - 1) neighbours.push(ports[origin.index + 1]);

    for (const port of neighbours) {
      // L'onde ne déclenche pas les bonus et ne fait pas exploser les virus :
      // sinon le nœud se retourne contre son acheteur.
      if (!port.target || port.target.pts <= 0 || port.target.effect) continue;
      scoreHit(port, port.target, stats.splash, false);
    }
  }

  /** Marque une touche et vide le port. `share` < 1 pour l'onde de choc. */
  function scoreHit(port, type, share, viaTurret) {
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

    popText(port, `+${fmt(points)}`, crit ? 'crit' : viaTurret ? 'turret' : '');
    flashPort(port, viaTurret ? 'turret-hit' : 'hit');
  }

  function hitVirus(port, type) {
    round.virusHits += 1;
    const shielded = round.shieldLeft > 0;
    if (shielded) round.shieldLeft -= 1;
    else round.lives -= 1;

    const malus = Math.max(1, Math.round(Math.abs(type.pts) * stats.pointMult));
    run.bank = Math.max(0, run.bank - malus);
    round.gain -= malus;
    round.combo = 1;

    popText(port, shielded ? 'PARE-FEU' : `-${fmt(malus)}`, 'neg');
    flashPort(port, 'bad');
    setMsg(
      shielded ? 'Virus absorbé par le pare-feu.' : `Virus — ${round.lives} vie${round.lives > 1 ? 's' : ''} restante${round.lives > 1 ? 's' : ''}.`,
      'bad',
    );
    updateHud();

    if (round.lives <= 0) endRound('vies');
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
      const interval = BALANCE.turretIntervalMs[side.level];
      round.turretTimers.push(setInterval(() => fireTurret(side), interval));
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
    if (!round.running) return;

    let candidates = ports.filter(p => p.target && p.index % COLS === side.col && !p.target.effect);
    if (stats.turretSmart >= 1) candidates = candidates.filter(p => p.target.pts > 0);
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

    if (target.target.pts < 0) {
      // Tourelle aveugle : elle peut se prendre un virus. Ça coûte des points,
      // jamais une vie — une tourelle ne doit pas tuer son propriétaire.
      const malus = Math.max(1, Math.round(Math.abs(target.target.pts) * 0.5));
      run.bank = Math.max(0, run.bank - malus);
      round.gain -= malus;
      popText(target, `-${fmt(malus)}`, 'neg');
      flashPort(target, 'bad');
      updateHud();
      return;
    }

    scoreHit(target, target.target, 1, true);
    if (stats.turretCombo) {
      round.combo = Math.min(stats.comboCap, round.combo + 1);
      round.maxCombo = Math.max(round.maxCombo, round.combo);
    }
    updateHud();
  }

  // ── horloge et HUD ──────────────────────────────────────────────────────

  function tick() {
    if (!round.running) return;
    const left = Math.max(0, round.endsAt - performance.now()) / 1000;

    $('hud-time').textContent = Math.ceil(left);
    $('hud-time').classList.toggle('urgent', left <= 6);
    const fill = $('time-fill');
    fill.style.transform = `scaleX(${left / BALANCE.roundSeconds})`;
    fill.classList.toggle('urgent', left <= 6);

    updateEffectPills();
    if (left <= 0) endRound('temps');
  }

  function updateHud() {
    $('hud-round').textContent = run.round;
    $('hud-bank').textContent = `${fmt(run.bank)} / ${fmt(round.quota)}`;
    $('hud-lives').textContent = hearts(round.lives);
    $('hud-lives').classList.toggle('urgent', round.lives <= 1);

    const combo = $('hud-combo');
    combo.textContent = `×${round.combo}`;
    combo.classList.toggle('combo-hot', round.combo >= stats.comboCap);

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
    if (round.clock) clearInterval(round.clock);
    round.clock = null;
    if (round.spawnTimer) clearTimeout(round.spawnTimer);
    round.spawnTimer = null;
    disarmTurrets();
    ports.forEach(clearPort);
  }

  function endRound(cause) {
    if (!round.running) return;
    stopRound();

    const paid = run.bank >= round.quota;
    if (paid) {
      run.bank -= round.quota;
      setMsg(
        `Quota réglé — ${fmt(round.quota)} prélevés, il reste ${fmt(run.bank)} en banque.`,
        'good',
      );
      if (run.round > save.bestRound) {
        save.bestRound = run.round;
        persist();
      }
      run.round += 1;
      setTimeout(() => { renderShop(); show('scr-shop'); }, 1500);
      return;
    }

    setMsg(
      cause === 'vies'
        ? `Ports verrouillés — plus de vies, et il manquait ${fmt(round.quota - run.bank)}.`
        : `Temps écoulé — il manquait ${fmt(round.quota - run.bank)}.`,
      'bad',
    );
    setTimeout(() => gameOver(cause), 1500);
  }

  function gameOver(cause) {
    const missing = Math.max(0, round.quota - run.bank);
    run.active = false;

    save.runs += 1;
    if (run.totalScore > save.bestScore) save.bestScore = run.totalScore;
    persist();

    $('over-kicker').textContent = cause === 'vies' ? 'TROIS VIRUS DE TROP' : 'QUOTA NON RÉGLÉ';
    $('over-round').textContent = `ROUND ${run.round}`;
    $('over-missing').textContent = fmt(missing);
    $('over-score').textContent = fmt(run.totalScore);
    $('over-best').textContent = save.bestRound ? `#${save.bestRound}` : '—';
    $('over-nodes').textContent = fmt(ownedNodeCount(save.tree));

    const owned = ownedNodeCount(save.tree);
    $('over-hint').innerHTML = owned
      ? `L'arbre est <strong>conservé</strong> : la prochaine run repart avec ${owned} niveau${owned > 1 ? 'x' : ''} acquis, banque à zéro.`
      : `L'arbre est permanent — la prochaine run gardera tout ce que tu achètes à l'atelier.`;

    renderMenu();
    show('scr-over');
  }

  // ── run ─────────────────────────────────────────────────────────────────

  function newRun() {
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
  $('btn-next-round').addEventListener('click', startRound);

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

  window.addEventListener('beforeunload', stopRound);

  renderMenu();

  // Couture de mise au point : vérifier la courbe de quota, l'effet des nœuds
  // et les chemins pilotés par minuteur (virus, tourelles) sans avoir à jouer
  // vingt rounds à la main. `forceSpawn` et `fireTurretNow` court-circuitent
  // uniquement l'attente, jamais les règles.
  window.__droneQuota = {
    BALANCE, TARGETS, TREE, NODES, ports,
    quotaFor, deriveStats, run, round,
    get save() { return save; },

    forceSpawn(index, typeId) {
      const port = ports[index];
      const type = TARGETS.find(t => t.id === typeId);
      if (!port || !type) return null;
      clearPort(port);
      port.target = type;
      port.el.className = `port up ${type.id}`;
      port.el.querySelector('.icon').textContent = type.icon;
      port.el.querySelector('.name').textContent = type.name;
      return type.id;
    },

    fireTurretNow(sideIndex) {
      const side = turretSides()[sideIndex];
      if (!side || side.level <= 0) return false;
      fireTurret(side);
      return true;
    },
  };
})();
