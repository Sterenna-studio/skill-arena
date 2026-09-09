/**
 * Drone Quota — whack-a-mole roguelite à quotas.
 *
 * Structure : trois rounds cumulent une banque vers un objectif de manche,
 * réglé seulement après le troisième. Entre deux rounds il n'y a qu'un souffle,
 * et l'atelier n'ouvre qu'après une manche validée.
 * Pas de vies : la pression, c'est le temps et le quota. Se tromper coûte des
 * secondes, jamais un compteur de cœurs.
 *
 * La banque paie l'objectif *et* achète les nœuds persistants de l'arbre. Tout
 * le dilemme est là — investir, c'est reculer sur la facture suivante.
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
    hum() {}, setMuted() { return true; }, isMuted: () => true, unlock() {}, configureAudio() {},
    attach() {}, resize() {}, burst() {}, tracer() {}, shake() {}, clear() {},
    scar() {}, clearScars() {}, centerOf: () => ({ x: 0, y: 0 }), setReducedEffects() {},
  };
  const PREFS = window.DQPrefs ?? {
    get: () => ({ cursorMode: 'normal', aimResponsiveness: 7, audioEnabled: true, effectsEnabled: true, ambienceEnabled: true, masterVolume: 80, reducedEffects: false, tutorialSeen: false }),
    set(patch) { return { ...this.get(), ...patch }; },
    reset() { return this.get(); }, subscribe() {}, initCursor() {}, hideCursor() {},
  };

  const BALANCE = {
    roundSeconds: 26,
    roundsPerManche: 3,
    interludeMs: 4000,

    // Base issue du modèle historique de budget de frappes. Les trois paliers
    // sont maintenant regroupés sans changer leur somme, mais la nouvelle
    // charge progressive du BOOST impose de remesurer le rendement en partie.
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
    missTolerance: 5,
    boostHitBase: 20,
    boostScoreScale: 4,
    boostScoreCap: 34,

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

    // Progression prestige : constantes de structure, distinctes des taux
    // améliorés par l'arbre de score.
    startingBankPerPoint: 300,
    reconstructionRate: 0.6,
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

  // Vocabulaire court et cyclique : chaque frappe change de voix et de
  // silhouette typographique, sans dépendre d'une police ou d'un asset.
  const HIT_FEEDBACK = ['BIM !', 'TCHAK !', 'ZAP !', 'CLAC !', 'PAF !', 'PULSE !'];
  const MISS_FEEDBACK = ['FIOU !', 'ZIP !', 'OUPS !', 'PLOP !', 'FLOP !', 'FZZT !'];
  let feedbackWordIndex = 0;
  let feedbackStyleIndex = 0;

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
          id: 'combo', name: 'BOOST ÉTENDU', max: 3, costs: [440, 1100, 2400],
          tier: 2, lane: '1', requires: { frappe: 1 },
          desc: lvl => `BOOST plafonné à ×${BALANCE.baseComboCap + lvl * 2} au lieu de ×${BALANCE.baseComboCap}.`,
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
            ? 'Les tirs de tourelle alimentent ton BOOST.'
            : 'Les tirs de tourelle alimentent le BOOST et marquent à plein tarif.',
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

  // Les jetons équipent une forme de boucle, jamais un taux déjà amélioré par
  // l'arbre. Toutes les affectations sont librement réversibles depuis le menu.
  const PRESTIGE_STATS = [
    {
      id: 'chaineProfonde', name: 'CHAÎNE PROFONDE', max: 3, cost: 1,
      desc: '+1 coup de chaîne par point (5 → 8).',
      apply: (s, lvl) => { s.chainMax += lvl; },
    },
    {
      id: 'blindageLeger', name: 'BLINDAGE LÉGER', max: 2, cost: 1,
      desc: '-1 bouclier sur les blindés par point.',
      apply: (s, lvl) => { s.armoredShields -= lvl; },
    },
    {
      id: 'gardeLue', name: 'GARDE LUE', max: 2, cost: 1,
      desc: '+1 traversée du curseur de parade par point.',
      apply: (s, lvl) => { s.qteSweepLegs += lvl; },
    },
    {
      id: 'avance', name: 'AVANCE', max: 3, cost: 1,
      desc: `+${BALANCE.startingBankPerPoint} de banque au départ de la run par point.`,
      apply: (s, lvl) => { s.startingBank += BALANCE.startingBankPerPoint * lvl; },
    },
    {
      id: 'elan', name: 'ÉLAN', max: 1, cost: 1,
      desc: 'Chaque round démarre avec un BOOST ×2.',
      apply: (s, lvl) => { if (lvl) s.startingCombo = 2; },
    },
    {
      id: 'recuperation', name: 'RÉCUPÉRATION', max: 2, cost: 1,
      desc: '+5 % de crédit rendu par point (60 → 70 %).',
      apply: (s, lvl) => { s.reconstructionRate += 0.05 * lvl; },
    },
  ];

  const PRESTIGE_BUFFS = [
    {
      id: 'breche', name: 'BRÈCHE', cost: 1,
      advantage: 'Les blindés démarrent avec un bouclier en moins.',
      counterpart: 'Les CORE apparaissent deux fois moins souvent.',
      apply: s => { s.armoredShields -= 1; s.coreWeightMult *= 0.5; },
    },
    {
      id: 'surtension', name: 'SURTENSION', cost: 2,
      advantage: 'La chaîne monte au moins jusqu’à 7 coups.',
      counterpart: 'Chaque étourdissement dure 30 % moins longtemps.',
      apply: s => { s.chainMax = Math.max(s.chainMax, 7); s.stunMult *= 0.7; },
    },
    {
      id: 'respiration', name: 'RESPIRATION', cost: 2,
      advantage: '+4 secondes à chaque round.',
      counterpart: 'Le BOOST plafonne deux crans plus bas.',
      apply: s => { s.roundBonusSeconds += 4; s.comboCap = Math.max(2, s.comboCap - 2); },
    },
    {
      id: 'protocoleCalme', name: 'PROTOCOLE CALME', cost: 1,
      advantage: 'Les sentinelles n’apparaissent plus.',
      counterpart: 'Tous les paliers augmentent de 15 %.',
      apply: s => { s.noSentinelles = true; s.quotaMult *= 1.15; },
    },
    {
      id: 'premiereHeure', name: 'PREMIÈRE HEURE', cost: 2,
      advantage: 'Tous les points sont doublés pendant la manche 1.',
      counterpart: 'Les paliers augmentent de 10 % dès la manche 2.',
      apply: s => { s.firstMancheScoreMult = 2; s.lateQuotaMult *= 1.1; },
    },
    {
      id: 'surcharge', name: 'SURCHARGE', cost: 2,
      advantage: 'Deux cibles simultanées supplémentaires.',
      counterpart: 'La fenêtre de toutes les cibles diminue de 20 %.',
      apply: s => { s.maxActive += 2; s.ttlMult *= 0.8; },
    },
  ];

  const PRESTIGE_STAT_MAP = new Map(PRESTIGE_STATS.map(item => [item.id, item]));
  const PRESTIGE_BUFF_MAP = new Map(PRESTIGE_BUFFS.map(item => [item.id, item]));

  // ── sauvegarde ──────────────────────────────────────────────────────────

  function emptyLoadout() {
    return { stats: {}, buffs: [] };
  }

  function emptySave() {
    return {
      tree: {}, bestRound: 0, bestManche: 0, bestScore: 0, runs: 0,
      loadout: emptyLoadout(), credit: 0, prestiges: 0,
    };
  }

  function loadoutCost(loadout) {
    let total = 0;
    for (const [id, rawLevel] of Object.entries(loadout?.stats ?? {})) {
      const item = PRESTIGE_STAT_MAP.get(id);
      if (!item) continue;
      total += Math.min(item.max, Math.max(0, Math.floor(Number(rawLevel) || 0))) * item.cost;
    }
    const buffs = Array.isArray(loadout?.buffs) ? loadout.buffs : [];
    for (const id of new Set(buffs)) total += PRESTIGE_BUFF_MAP.get(id)?.cost ?? 0;
    return total;
  }

  function normalizeLoadout(rawLoadout, tokenBudget) {
    const normalized = emptyLoadout();
    let available = Math.max(0, Math.floor(tokenBudget));
    for (const item of PRESTIGE_STATS) {
      const wanted = Math.min(item.max, Math.max(0, Math.floor(Number(rawLoadout?.stats?.[item.id]) || 0)));
      const level = Math.min(wanted, Math.floor(available / item.cost));
      if (level > 0) normalized.stats[item.id] = level;
      available -= level * item.cost;
    }
    const wantedBuffs = new Set(Array.isArray(rawLoadout?.buffs) ? rawLoadout.buffs : []);
    for (const item of PRESTIGE_BUFFS) {
      if (!wantedBuffs.has(item.id) || available < item.cost) continue;
      normalized.buffs.push(item.id);
      available -= item.cost;
    }
    return normalized;
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
      const bestRound = Math.max(0, Math.floor(Number(save.bestRound) || 0));
      const inheritedManche = Math.floor(bestRound / BALANCE.roundsPerManche);
      save.bestRound = bestRound;
      save.bestManche = Math.max(inheritedManche, Math.floor(Number(save.bestManche) || 0));
      save.bestScore = Math.max(0, Math.floor(Number(save.bestScore) || 0));
      save.runs = Math.max(0, Math.floor(Number(save.runs) || 0));
      save.credit = Math.max(0, Math.floor(Number(save.credit) || 0));
      save.prestiges = Math.max(0, Math.floor(Number(save.prestiges) || 0));
      save.loadout = normalizeLoadout(save.loadout, save.bestManche);
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

  function deriveStats(tree, loadout = emptyLoadout()) {
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
      chainMax: BALANCE.chainMax,
      armoredShields: TARGETS.find(target => target.id === 'blinde').shield,
      qteSweepLegs: BALANCE.qteSweepLegs,
      startingBank: 0,
      startingCombo: 1,
      reconstructionRate: BALANCE.reconstructionRate,
      noSentinelles: false,
      quotaMult: 1,
      lateQuotaMult: 1,
      firstMancheScoreMult: 1,
    };
    for (const branch of TREE) {
      for (const node of allBranchNodes(branch)) {
        const lvl = tree[node.id] ?? 0;
        if (lvl > 0) node.apply(stats, lvl);
      }
    }
    for (const item of PRESTIGE_STATS) {
      const level = Math.min(item.max, Math.max(0, Math.floor(Number(loadout?.stats?.[item.id]) || 0)));
      if (level > 0) item.apply(stats, level);
    }
    const buffs = Array.isArray(loadout?.buffs) ? loadout.buffs : [];
    for (const id of new Set(buffs)) PRESTIGE_BUFF_MAP.get(id)?.apply(stats);
    // BLINDAGE LÉGER et BRÈCHE se cumulent : à investissement maximal, le
    // blindé peut réellement démarrer ouvert plutôt que neutraliser le buff.
    stats.armoredShields = Math.max(0, Math.round(stats.armoredShields));
    stats.qteSweepLegs = Math.max(2, Math.round(stats.qteSweepLegs));
    return stats;
  }

  function quotaFor(round, stats) {
    const raw = BALANCE.quotaBase * Math.pow(BALANCE.quotaGrowth, round - 1);
    const discount = stats ? stats.quotaDiscount : 0;
    const baseMultiplier = stats?.quotaMult ?? 1;
    const lateMultiplier = mancheOf(round) >= 2 ? (stats?.lateQuotaMult ?? 1) : 1;
    return Math.max(1, Math.round(raw * (1 - Math.min(0.6, discount)) * baseMultiplier * lateMultiplier));
  }

  function roundSecondsFor(stats) {
    return BALANCE.roundSeconds + (stats?.roundBonusSeconds ?? 0);
  }

  const mancheOf = r => Math.floor((r - 1) / BALANCE.roundsPerManche) + 1;
  const stepInManche = r => ((r - 1) % BALANCE.roundsPerManche) + 1;
  const isMancheEnd = r => stepInManche(r) === BALANCE.roundsPerManche;
  function mancheQuotaFor(roundNumber, currentStats) {
    const firstRound = roundNumber - stepInManche(roundNumber) + 1;
    let total = 0;
    for (let offset = 0; offset < BALANCE.roundsPerManche; offset++) {
      total += quotaFor(firstRound + offset, currentStats);
    }
    return total;
  }

  function recordClearedRound(roundNumber) {
    let changed = false;
    if (roundNumber > save.bestRound) {
      save.bestRound = roundNumber;
      changed = true;
    }
    if (isMancheEnd(roundNumber)) {
      const completedManche = mancheOf(roundNumber);
      if (completedManche > save.bestManche) {
        save.bestManche = completedManche;
        changed = true;
      }
    }
    return changed;
  }

  function branchInvestment(branch, tree) {
    return allBranchNodes(branch).reduce((sum, node) => sum + (tree[node.id] ?? 0), 0);
  }

  function branchDepth(branch, tree) {
    return branch.nodes.reduce((depth, node) => (
      (tree[node.id] ?? 0) > 0 ? Math.max(depth, node.tier ?? 1) : depth
    ), 0);
  }

  function unlockCheck(node, tree) {
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
    return { open: true };
  }

  function nodeState(node, tree, bank, credit = 0) {
    const level = tree[node.id] ?? 0;
    if (level >= node.max) return { level, status: 'maxed', cost: null };
    const gate = unlockCheck(node, tree);
    if (!gate.open) return { level, status: 'hidden', cost: node.costs[level], gate };
    const cost = node.costs[level];
    return { level, status: bank + credit >= cost ? 'buyable' : 'poor', cost };
  }

  function ownedNodeCount(tree) {
    return Object.values(tree).reduce((sum, lvl) => sum + lvl, 0);
  }

  function treeInvestedScore(tree) {
    let total = 0;
    for (const node of NODES.values()) {
      const level = Math.min(node.max, Math.max(0, Math.floor(Number(tree[node.id]) || 0)));
      total += node.costs.slice(0, level).reduce((sum, cost) => sum + cost, 0);
    }
    return total;
  }

  function tokenSummary(source = save) {
    const total = Math.max(0, Math.floor(Number(source.bestManche) || 0));
    const spent = loadoutCost(source.loadout);
    return { total, spent, available: Math.max(0, total - spent) };
  }

  // ── état ────────────────────────────────────────────────────────────────

  let save = loadSave();
  let stats = deriveStats(save.tree, save.loadout);
  let preferences = PREFS.get();
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
    boostCharge: 0,
    missStreak: 0,
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
    PREFS.hideCursor();
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
    const tokens = tokenSummary();
    $('menu-best-round').textContent = save.bestRound ? `#${save.bestRound}` : '—';
    $('menu-best-score').textContent = save.bestScore ? fmt(save.bestScore) : '—';
    $('menu-runs').textContent = fmt(save.runs);
    $('menu-nodes').textContent = fmt(ownedNodeCount(save.tree));
    $('menu-credit').textContent = fmt(save.credit);
    $('menu-tokens').textContent = `${tokens.available} / ${tokens.total}`;
  }

  // ── aide et préférences ────────────────────────────────────────────────

  const TUTORIAL_PANELS = [
    {
      symbol: '③',
      title: 'UNE MANCHE, TROIS ROUNDS',
      copy: 'Ta banque s’accumule pendant <strong>trois rounds complets</strong>. Tu ne peux pas perdre avant la facture de fin de manche : regarde l’objectif global et rattrape ton retard au round suivant.',
    },
    {
      symbol: '⚡',
      title: 'REFRAPPE LES CIBLES SONNÉES',
      copy: 'Une touche laisse la cible dans son puits. Son cadre jaune et sa jauge indiquent exactement le temps restant : <strong>refrappe avant qu’elle ne reparte</strong> pour augmenter sa valeur.',
    },
    {
      symbol: '×5',
      title: 'FAIS MONTER LE BOOST',
      copy: 'Les touches et leur score remplissent le BOOST. Un clic vide affiche un raté mais ne casse rien tout seul : il faut <strong>cinq ratés consécutifs</strong> pour dissiper la jauge et le multiplicateur.',
    },
  ];

  let tutorialIndex = 0;
  let tutorialStartsRun = false;
  let settingsReturnScreen = 'scr-menu';

  function activeScreenId() {
    return document.querySelector('.screen.active')?.id ?? 'scr-menu';
  }

  function renderTutorial() {
    const panel = TUTORIAL_PANELS[tutorialIndex];
    $('tutorial-step').textContent = `${tutorialIndex + 1} / ${TUTORIAL_PANELS.length}`;
    $('tutorial-symbol').textContent = panel.symbol;
    $('tutorial-title').textContent = panel.title;
    $('tutorial-copy').innerHTML = panel.copy;
    $('btn-tutorial-next').textContent = tutorialIndex === TUTORIAL_PANELS.length - 1
      ? (tutorialStartsRun ? 'LANCER LA RUN →' : 'FERMER')
      : 'SUIVANT →';
  }

  function openTutorial(startsRun = false) {
    tutorialIndex = 0;
    tutorialStartsRun = startsRun;
    renderTutorial();
    $('tutorial').hidden = false;
    $('btn-tutorial-next').focus();
  }

  function closeTutorial(startRunAfter = false) {
    $('tutorial').hidden = true;
    preferences = PREFS.set({ tutorialSeen: true });
    const shouldStart = startRunAfter && tutorialStartsRun;
    tutorialStartsRun = false;
    if (shouldStart) newRun();
  }

  function nextTutorialPanel() {
    if (tutorialIndex < TUTORIAL_PANELS.length - 1) {
      tutorialIndex += 1;
      renderTutorial();
      return;
    }
    closeTutorial(true);
  }

  function requestRun() {
    if (!preferences.tutorialSeen) openTutorial(true);
    else newRun();
  }

  function paintMute() {
    const muted = !preferences.audioEnabled;
    const button = $('btn-mute');
    button.textContent = muted ? '🔇' : '🔊';
    button.setAttribute('aria-pressed', String(muted));
    button.title = muted ? 'Rétablir le son' : 'Couper le son';
  }

  function renderSettings() {
    document.querySelectorAll('[data-cursor-mode]').forEach(button => {
      const active = button.dataset.cursorMode === preferences.cursorMode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    $('cfg-aim').value = preferences.aimResponsiveness;
    $('cfg-aim').disabled = preferences.cursorMode !== 'weapon';
    $('cfg-aim').closest('.range-setting').classList.toggle('disabled', preferences.cursorMode !== 'weapon');
    $('cfg-aim-value').textContent = `${preferences.aimResponsiveness} / 10`;
    $('cfg-audio').checked = preferences.audioEnabled;
    $('cfg-effects').checked = preferences.effectsEnabled;
    $('cfg-ambience').checked = preferences.ambienceEnabled;
    $('cfg-volume').value = preferences.masterVolume;
    $('cfg-volume-value').textContent = `${preferences.masterVolume} %`;
    $('cfg-reduced').checked = preferences.reducedEffects;
  }

  function applyPreferences(nextPreferences) {
    preferences = nextPreferences;
    document.body.classList.toggle('reduce-effects', preferences.reducedEffects);
    FX.configureAudio({
      effectsEnabled: preferences.effectsEnabled,
      ambienceEnabled: preferences.ambienceEnabled,
      masterVolume: preferences.masterVolume / 100,
    });
    FX.setMuted(!preferences.audioEnabled);
    FX.setReducedEffects(preferences.reducedEffects);
    if (round.running) FX.hum(preferences.audioEnabled && preferences.ambienceEnabled);
    renderSettings();
    paintMute();
  }

  function openSettings() {
    const current = activeScreenId();
    if (current === 'scr-round') {
      setMsg('Les réglages complets sont disponibles entre deux rounds. Le bouton son reste actif.', '');
      return;
    }
    settingsReturnScreen = current === 'scr-settings' ? 'scr-menu' : current;
    renderSettings();
    show('scr-settings');
  }

  function closeSettings() {
    show(settingsReturnScreen);
  }

  // ── prestige : affectation libre entre deux runs ───────────────────────

  function setStatPoint(id, delta) {
    const item = PRESTIGE_STAT_MAP.get(id);
    if (!item || !Number.isInteger(delta) || Math.abs(delta) !== 1) return false;
    const current = save.loadout.stats[id] ?? 0;
    const next = Math.max(0, Math.min(item.max, current + delta));
    if (next === current) return false;
    if (delta > 0 && tokenSummary().available < item.cost) return false;
    if (next > 0) save.loadout.stats[id] = next;
    else delete save.loadout.stats[id];
    stats = deriveStats(save.tree, save.loadout);
    persist();
    FX.sfx.tick();
    renderMenu();
    renderPrestige();
    return true;
  }

  function togglePrestigeBuff(id) {
    const item = PRESTIGE_BUFF_MAP.get(id);
    if (!item) return false;
    const equipped = save.loadout.buffs.includes(id);
    if (!equipped && tokenSummary().available < item.cost) return false;
    save.loadout.buffs = equipped
      ? save.loadout.buffs.filter(buffId => buffId !== id)
      : [...save.loadout.buffs, id];
    stats = deriveStats(save.tree, save.loadout);
    persist();
    FX.sfx.tick();
    renderMenu();
    renderPrestige();
    return true;
  }

  function clearLoadout() {
    if (loadoutCost(save.loadout) === 0) return false;
    save.loadout = emptyLoadout();
    stats = deriveStats(save.tree, save.loadout);
    persist();
    FX.sfx.tick();
    renderMenu();
    renderPrestige();
    return true;
  }

  function renderPrestige() {
    const tokens = tokenSummary();
    $('prestige-available').textContent = tokens.available;
    $('prestige-total').textContent = tokens.total;
    $('prestige-credit').textContent = fmt(save.credit);
    $('prestige-count').textContent = fmt(save.prestiges);
    $('prestige-guide').textContent = tokens.total < 2
      ? 'Chaque nouvelle manche record accorde un jeton. Atteins la fin d’une manche pour étoffer ce panneau.'
      : 'Chaque nouvelle manche record accorde un jeton supplémentaire. Réaffecte librement ta configuration avant une run.';

    const statList = $('prestige-stats');
    statList.innerHTML = '';
    for (const item of PRESTIGE_STATS) {
      const level = save.loadout.stats[item.id] ?? 0;
      const row = document.createElement('article');
      row.className = 'prestige-stat';
      row.dataset.stat = item.id;
      row.innerHTML = `
        <div class="prestige-copy">
          <strong>${item.name}</strong>
          <span>${item.desc}</span>
        </div>
        <span class="prestige-dots" aria-label="${level} point${level > 1 ? 's' : ''} sur ${item.max}">${'●'.repeat(level)}${'○'.repeat(item.max - level)}</span>
        <span class="prestige-cost">${item.cost} JETON</span>`;

      const controls = document.createElement('span');
      controls.className = 'prestige-stepper';
      const minus = document.createElement('button');
      minus.type = 'button';
      minus.textContent = '−';
      minus.setAttribute('aria-label', `Retirer un point de ${item.name}`);
      minus.disabled = level === 0;
      minus.addEventListener('click', () => setStatPoint(item.id, -1));
      const plus = document.createElement('button');
      plus.type = 'button';
      plus.textContent = '+';
      plus.setAttribute('aria-label', `Ajouter un point à ${item.name}`);
      plus.disabled = level >= item.max || tokens.available < item.cost;
      plus.addEventListener('click', () => setStatPoint(item.id, 1));
      controls.append(minus, plus);
      row.appendChild(controls);
      statList.appendChild(row);
    }

    const buffList = $('prestige-buffs');
    buffList.innerHTML = '';
    for (const item of PRESTIGE_BUFFS) {
      const equipped = save.loadout.buffs.includes(item.id);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `prestige-buff${equipped ? ' equipped' : ''}`;
      button.dataset.buff = item.id;
      button.setAttribute('aria-pressed', String(equipped));
      button.disabled = !equipped && tokens.available < item.cost;
      button.innerHTML = `
        <span class="prestige-buff-head"><strong>${item.name}</strong><b>${equipped ? '✓ ÉQUIPÉ' : `${item.cost} JETON${item.cost > 1 ? 'S' : ''}`}</b></span>
        <span class="buff-effect advantage"><i>AVANTAGE</i>${item.advantage}</span>
        <span class="buff-effect counterpart"><i>CONTREPARTIE</i>${item.counterpart}</span>`;
      button.addEventListener('click', () => togglePrestigeBuff(item.id));
      buffList.appendChild(button);
    }
    $('btn-clear-loadout').disabled = tokens.spent === 0;
  }

  function renderTreeReset() {
    const invested = treeInvestedScore(save.tree);
    const returned = Math.floor(invested * stats.reconstructionRate);
    const percent = Math.round(stats.reconstructionRate * 100);
    $('tree-invested').textContent = fmt(invested);
    $('tree-refund').textContent = fmt(returned);
    $('tree-refund-rate').textContent = `${percent} %`;
    $('tree-credit').textContent = fmt(save.credit);
    $('btn-reset-tree').disabled = invested === 0;
  }

  function resetTree() {
    const invested = treeInvestedScore(save.tree);
    if (invested <= 0) return false;
    const returned = Math.floor(invested * stats.reconstructionRate);
    const lost = invested - returned;
    const message = `Réinitialiser tout l’arbre ?\n\n${fmt(returned)} seront versés au crédit de reconstruction et ${fmt(lost)} seront perdus. Les jetons, records et buffs équipés restent intacts.`;
    if (!window.confirm(message)) return false;
    save.tree = {};
    save.credit += returned;
    save.prestiges += 1;
    stats = deriveStats(save.tree, save.loadout);
    persist();
    FX.sfx.buy();
    renderMenu();
    renderTree($('tree-view'), 'readonly');
    renderTreeReset();
    return true;
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
    if (node.unlock?.depth) parts.push(`profondeur ${node.unlock.depth}`);
    if (node.unlock?.invested) parts.push(`${node.unlock.invested} niveaux investis`);
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
    const credit = mode === 'shop' ? save.credit : 0;
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
        const state = nodeState(node, save.tree, bank, credit);
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
          specialties.appendChild(nodeButton(node, nodeState(node, save.tree, bank, credit), mode, true));
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
    const state = nodeState(node, save.tree, run.bank, save.credit);
    if (state.status !== 'buyable') return;
    const creditSpent = Math.min(save.credit, state.cost);
    save.credit -= creditSpent;
    run.bank -= state.cost - creditSpent;
    save.tree[node.id] = state.level + 1;
    shopDirty = true;
    stats = deriveStats(save.tree, save.loadout);
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
    shopSnapshot = { tree: { ...save.tree }, bank: run.bank, credit: save.credit };
    shopDirty = false;
    renderShop();
    show('scr-shop');
  }

  function cancelShopPurchases() {
    if (!shopSnapshot) return false;
    save.tree = { ...shopSnapshot.tree };
    run.bank = shopSnapshot.bank;
    save.credit = shopSnapshot.credit;
    stats = deriveStats(save.tree, save.loadout);
    shopDirty = false;
    renderShop();
    return true;
  }

  function discardShopChanges() {
    if (!shopSnapshot) return;
    save.tree = { ...shopSnapshot.tree };
    run.bank = shopSnapshot.bank;
    save.credit = shopSnapshot.credit;
    stats = deriveStats(save.tree, save.loadout);
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
    const next = mancheQuotaFor(run.round, stats);
    $('shop-next-round').textContent = run.round;
    $('shop-next-manche').textContent = mancheOf(run.round);
    $('shop-next-quota').textContent = fmt(next);
    $('shop-bank').textContent = fmt(run.bank);
    $('shop-credit').textContent = fmt(save.credit);

    const warning = $('shop-warning');
    const short = next - run.bank;
    // Rouge = tu es sous la barre là, maintenant. Ambre = tu es au-dessus,
    // mais chaque achat t'en rapproche.
    if (short > 0) {
      warning.className = 'shop-warning danger';
      warning.innerHTML = `Il te manque <strong>${fmt(short)}</strong> pour l’objectif cumulé de la manche ${mancheOf(run.round)}. `
        + 'Tu disposeras de trois rounds pour le regagner sur les ports.';
    } else {
      warning.className = 'shop-warning';
      warning.innerHTML = `Ta banque couvre l’objectif de la manche ${mancheOf(run.round)} `
        + `(<strong>${fmt(next)}</strong>), avec ${fmt(-short)} d'avance. `
        + 'Investir maintenant, c\'est repasser sous la barre.';
    }
    if (save.credit > 0) {
      warning.innerHTML += ` <strong>${fmt(save.credit)}</strong> de crédit seront consommés avant la banque et ne peuvent jamais payer cet objectif.`;
    }

    renderTree($('shop-tree'), 'shop');
    $('btn-cancel-shop').disabled = !shopDirty;
    $('shop-transaction').textContent = shopDirty
      ? 'Achats en attente — valide la manche suivante pour les conserver.'
      : 'Aucun achat en attente.';
  }

  // ── briefing ────────────────────────────────────────────────────────────

  function renderBrief() {
    const quota = mancheQuotaFor(run.round, stats);
    $('brief-round').textContent = run.round;
    $('brief-manche').textContent = `MANCHE ${mancheOf(run.round)} · ROUND ${stepInManche(run.round)}/${BALANCE.roundsPerManche}`;
    $('brief-quota').textContent = fmt(quota);
    $('brief-bank').textContent = fmt(run.bank);
    $('brief-missing').textContent = fmt(Math.max(0, quota - run.bank));
    $('brief-duration').textContent = `${roundSecondsFor(stats)}s`;

    const owned = ownedNodeCount(save.tree);
    const safety = '<strong>Aucune défaite avant le round 3/3.</strong> La banque et le retard sont conservés entre les rounds de cette manche. ';
    $('brief-hint').innerHTML = owned
      ? safety + `Tu démarres aussi avec ${owned} niveau${owned > 1 ? 'x' : ''} d'arbre acquis.`
      : safety + 'Remplis l’objectif cumulé pour ouvrir ton premier atelier.';
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
      button.setAttribute('aria-label', `Port ${i + 1}, vide`);
      button.innerHTML = `<span class="id">P${String(i + 1).padStart(2, '0')}</span>`
        + '<span class="socket"><span class="shaft"></span>'
        + '<span class="riser"><span class="icon"></span></span></span>'
        + '<span class="shieldbar" aria-hidden="true"></span>'
        + '<span class="stun-state" aria-hidden="true"><b>SONNÉ</b><i></i></span>'
        + '<span class="scars"></span><span class="name">IDLE</span>';
      const port = {
        index: i, el: button, target: null,
        ttlTimer: null, ttlLeft: 0, ttlArmedAt: 0,
        stunTimer: null, chain: 0, shieldLeft: 0, shieldMax: 0,
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
    port.shieldMax = 0;
    port.el.className = 'port';
    port.el.querySelector('.icon').textContent = '';
    port.el.querySelector('.name').textContent = 'IDLE';
    port.el.setAttribute('aria-label', `Port ${port.index + 1}, vide`);
    port.el.style.removeProperty('--shield');
  }

  function nextFeedback(words) {
    const word = words[feedbackWordIndex % words.length];
    feedbackWordIndex += 1;
    return word;
  }

  /**
   * Affiche un retour au-dessus de la grille, donc hors du puits qui masque
   * volontairement ses débords. `voice` active la grande onomatopée ; `text`
   * reste l'information utile (score, série de ratés, bonus).
   */
  function popText(port, text, kind = '', voice = '') {
    const pop = document.createElement('span');
    pop.className = `pop ${kind}`.trim();

    if (voice) {
      pop.classList.add('voiced', `voice-${feedbackStyleIndex % 4}`);
      feedbackStyleIndex += 1;

      const shout = document.createElement('b');
      const detail = document.createElement('small');
      shout.textContent = voice;
      detail.textContent = text;
      pop.append(shout, detail);
    } else {
      pop.textContent = text;
    }

    const arena = $('arena');
    const arenaRect = arena.getBoundingClientRect();
    const portRect = port.el.getBoundingClientRect();
    const halfWidth = voice ? Math.min(64, arenaRect.width / 3) : 36;
    const centerX = portRect.left - arenaRect.left + portRect.width / 2;
    pop.style.left = `${Math.max(halfWidth, Math.min(arenaRect.width - halfWidth, centerX))}px`;
    pop.style.top = `${portRect.top - arenaRect.top + portRect.height * 0.48}px`;
    arena.appendChild(pop);
    setTimeout(() => pop.remove(), voice ? 680 : 430);
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
    round.quota = mancheQuotaFor(run.round, stats);
    round.seconds = roundSecondsFor(stats);
    round.combo = stats.startingCombo;
    round.maxCombo = stats.startingCombo;
    round.boostCharge = 0;
    round.missStreak = 0;
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
    setMsg(`Round ${stepInManche(run.round)}/3 — construis la banque, aucun échec avant la fin de manche.`, '');
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
    port.shieldMax = type.id === 'blinde' ? stats.armoredShields : (type.shield ?? 0);
    port.shieldLeft = port.shieldMax;
    port.el.className = `port up ${type.id}`;
    port.el.querySelector('.icon').textContent = type.icon;
    port.el.querySelector('.name').textContent = type.name;
    port.el.setAttribute('aria-label', `Port ${port.index + 1}, ${type.name}`);
    if (port.shieldLeft) paintShield(port);
  }

  function spawn(port) {
    const targets = stats.noSentinelles ? TARGETS.filter(target => target.id !== 'sentinelle') : TARGETS;
    const type = weightedPick(targets, t => t.id === 'core' ? t.weight * stats.coreWeightMult : t.weight);
    dressPort(port, type);
    armTtl(port, type.ttl * stats.ttlMult);
  }

  function paintShield(port) {
    const total = port.shieldMax;
    port.el.style.setProperty('--shield', total ? port.shieldLeft / total : 0);
    port.el.classList.toggle('shielded', port.shieldLeft > 0);
  }

  function escape(port) {
    if (!port.target) return;
    const scoring = port.target.pts > 0 && !port.target.effect;
    clearPort(port);
    if (!scoring) return;
    port.el.classList.add('gone');
    setTimeout(() => port.el.classList.remove('gone'), 240);
    FX.sfx.escape();
    setMsg('Cible échappée — ton BOOST reste intact.', '');
  }

  // ── frappe ──────────────────────────────────────────────────────────────

  function chargeBoost(points, port, fixedGain = null) {
    round.missStreak = 0;
    if (round.combo >= stats.comboCap) {
      round.boostCharge = 100;
      return;
    }

    const scoreGain = Math.min(BALANCE.boostScoreCap, Math.sqrt(Math.max(0, points)) * BALANCE.boostScoreScale);
    round.boostCharge += fixedGain ?? (BALANCE.boostHitBase + scoreGain);
    let surged = false;
    while (round.boostCharge >= 100 && round.combo < stats.comboCap) {
      round.boostCharge -= 100;
      round.combo += 1;
      round.maxCombo = Math.max(round.maxCombo, round.combo);
      surged = true;
    }
    if (round.combo >= stats.comboCap) round.boostCharge = 100;
    if (surged) {
      popText(port, `BOOST ×${round.combo}`, 'crit');
      const meter = $('boost-meter');
      meter.classList.remove('surge');
      void meter.offsetWidth;
      meter.classList.add('surge');
      setTimeout(() => meter.classList.remove('surge'), 320);
    }
  }

  function registerMiss(port) {
    round.misses += 1;
    round.missStreak += 1;
    const remaining = BALANCE.missTolerance - round.missStreak;
    popText(
      port,
      `RATÉ ${round.missStreak}/${BALANCE.missTolerance}`,
      'neg',
      nextFeedback(MISS_FEEDBACK),
    );
    FX.sfx.miss(panOf(port));

    if (remaining > 0) {
      setMsg(`Coup vide sans pénalité — encore ${remaining} avant de perdre le BOOST.`, '');
      updateHud();
      return;
    }

    round.combo = 1;
    round.boostCharge = 0;
    round.missStreak = 0;
    setMsg(`${BALANCE.missTolerance} ratés de suite — BOOST dissipé.`, 'bad');
    FX.scar(port.el, 'miss');
    FX.shake(cabinet(), 4);
    updateHud();
  }

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
      // Un clic imprécis informe sans punir. Seule une série de ratés dissipe
      // le boost, ce qui laisse de la marge au tactile sans rendre le spam roi.
      registerMiss(port);
      return;
    }

    const type = port.target;

    if (type.effect) {
      applyEffect(type.effect);
      round.hits += 1;
      chargeBoost(0, port, 24);
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
      popText(port, broken ? 'BRISÉ' : `${port.shieldLeft}/${port.shieldMax}`, broken ? 'crit' : 'turret');
      FX.burst(port.el, broken ? 'crit' : 'turret', broken ? 1.3 : 0.7);
      broken ? FX.sfx.crit(panOf(port)) : FX.sfx.shield(panOf(port));
      FX.shake(cabinet(), broken ? 6 : 3);
      FX.scar(port.el, 'hit');
      stunTarget(port, BALANCE.shieldStunMs);
      round.hits += 1;
      chargeBoost(0, port, 12);
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

    const points = scoreHit(port, type, chainMult * kindMult, false, { keep: true, chainIndex });

    // L'onde part avant l'incrément de combo : les éclats appartiennent à la
    // frappe qui les a produits, ils ne doivent pas encaisser le combo qu'elle
    // vient de gagner. Et seulement au premier coup, sinon une chaîne arrose
    // les voisins cinq fois.
    if (stats.splash > 0 && chainIndex === 0) splash(port);

    round.hits += 1;
    port.chain += 1;
    round.chainBest = Math.max(round.chainBest, port.chain);
    chargeBoost(points, port);

    if (port.chain >= stats.chainMax) {
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
    port.el.style.setProperty('--stun-ms', `${Math.round(duration)}ms`);
    port.el.classList.remove('stunned');
    void port.el.offsetWidth;
    port.el.classList.add('stunned');
    port.el.setAttribute('aria-label', `Port ${port.index + 1}, ${port.target.name} sonné, refrappe maintenant`);
    const stunLabel = port.el.querySelector('.stun-state b');
    if (stunLabel) stunLabel.textContent = `SONNÉ ${(duration / 1000).toFixed(1)}s`;
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
    if (mancheOf(run.round) === 1) points *= stats.firstMancheScoreMult;
    if (overclock) points *= 2;
    if (crit) points *= stats.critMult;
    if (viaTurret) points *= stats.turretCombo >= 2 ? 1 : BALANCE.turretPointShare;
    points = Math.max(1, Math.round(points));

    run.bank += points;
    run.totalScore += points;
    round.gain += points;

    const suffix = chainIndex > 0 ? ` ×${(1 + chainIndex * BALANCE.chainStep).toFixed(1)}` : '';
    const voice = !viaTurret && keep ? nextFeedback(HIT_FEEDBACK) : '';
    popText(port, `+${fmt(points)}${suffix}`, crit ? 'crit' : viaTurret ? 'turret' : '', voice);

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
    return points;
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
    const legs = stats.qteSweepLegs;
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
      popText(target, target.shieldLeft === 0 ? 'BRISÉ' : `${target.shieldLeft}/${target.shieldMax}`, 'turret');
      FX.burst(target.el, 'turret', 0.7);
      stunTarget(target, BALANCE.shieldStunMs);
      return;
    }

    const points = scoreHit(target, target.target, 1, true, { keep: false });
    if (stats.turretCombo) {
      const playerMisses = round.missStreak;
      chargeBoost(points, target, stats.turretCombo >= 2 ? 45 : 28);
      round.missStreak = playerMisses;
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
    $('boost-mult').textContent = `×${round.combo}`;

    const heat = Math.max(0, Math.min(1, (round.combo - 1) / Math.max(1, stats.comboCap - 1)));
    cabinet()?.style.setProperty('--combo-heat', heat.toFixed(3));
    cabinet()?.setAttribute('data-boost-tier', String(round.combo));

    const boostRatio = round.combo >= stats.comboCap ? 1 : Math.max(0, Math.min(1, round.boostCharge / 100));
    $('boost-fill').style.width = `${boostRatio * 100}%`;
    $('boost-label').textContent = round.combo >= stats.comboCap
      ? 'PUISSANCE MAXIMALE'
      : `PROCHAINE PUISSANCE · ${Math.floor(boostRatio * 100)} %`;
    const misses = round.missStreak;
    const remaining = BALANCE.missTolerance - misses;
    $('miss-label').textContent = misses
      ? `${misses}/${BALANCE.missTolerance} RATÉS · ENCORE ${remaining}`
      : `${BALANCE.missTolerance} RATÉS TOLÉRÉS`;
    $('boost-meter').classList.toggle('warning', misses >= Math.ceil(BALANCE.missTolerance / 2));

    const ratio = Math.min(1, run.bank / round.quota);
    $('quota-fill').style.width = `${ratio * 100}%`;
    $('quota-label').textContent = `OBJECTIF MANCHE · ${Math.floor(ratio * 100)} %`;
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

    const finishedManche = isMancheEnd(run.round);
    if (!finishedManche) {
      const completedStep = stepInManche(run.round);
      if (recordClearedRound(run.round)) persist();
      setMsg(`Round ${completedStep}/3 terminé — ${fmt(run.bank)} en banque, aucune défaite possible ici.`, 'good');
      run.round += 1;
      setTimeout(showInterlude, 1100);
      return;
    }

    if (run.bank < round.quota) {
      setMsg(`Objectif de manche manqué — il manquait ${fmt(round.quota - run.bank)}.`, 'bad');
      FX.sfx.failed();
      FX.shake(cabinet(), 13);
      setTimeout(gameOver, 1500);
      return;
    }

    run.bank -= round.quota;
    setMsg(`Manche validée — ${fmt(round.quota)} prélevés, il reste ${fmt(run.bank)} en banque.`, 'good');
    FX.sfx.paid();
    if (recordClearedRound(run.round)) persist();
    run.round += 1;

    setTimeout(enterShop, 1500);
  }

  /**
   * Souffle entre deux rounds d'une même manche : quelques secondes, pas
   * d'atelier. Ça enchaîne tout seul, ou tout de suite si le joueur clique.
   */
  function showInterlude() {
    const quota = mancheQuotaFor(run.round, stats);
    const short = Math.max(0, quota - run.bank);

    $('inter-title').textContent = `ROUND ${stepInManche(run.round)} / ${BALANCE.roundsPerManche}`;
    $('inter-manche').textContent = `MANCHE ${mancheOf(run.round)}`;
    $('inter-quota').textContent = fmt(quota);
    $('inter-bank').textContent = fmt(run.bank);
    $('inter-missing').textContent = fmt(short);
    $('inter-note').textContent = short > 0
      ? `Il te manque ${fmt(short)}, mais la run continue : verdict seulement après le round 3.`
      : 'Objectif déjà couvert : tout ce que tu produis maintenant restera pour l\'atelier.';

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

    $('over-kicker').textContent = 'OBJECTIF DE MANCHE NON ATTEINT';
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
    stats = deriveStats(save.tree, save.loadout);
    run.active = true;
    run.round = 1;
    run.bank = stats.startingBank;
    run.totalScore = 0;
    renderBrief();
    show('scr-brief');
  }

  // ── câblage ─────────────────────────────────────────────────────────────

  $('btn-play').addEventListener('click', requestRun);
  $('btn-retry').addEventListener('click', requestRun);
  $('btn-help').addEventListener('click', () => openTutorial(false));
  $('btn-start-round').addEventListener('click', startRound);
  $('btn-next-round').addEventListener('click', validateShop);
  $('btn-cancel-shop').addEventListener('click', cancelShopPurchases);
  $('btn-inter-go').addEventListener('click', goNextRound);
  $('qte').addEventListener('click', attemptQte);

  $('btn-view-tree').addEventListener('click', () => {
    renderTree($('tree-view'), 'readonly');
    renderTreeReset();
    show('scr-tree');
  });
  $('btn-tree-back').addEventListener('click', () => show('scr-menu'));
  $('btn-reset-tree').addEventListener('click', resetTree);
  $('btn-prestige').addEventListener('click', () => {
    renderPrestige();
    show('scr-prestige');
  });
  $('btn-prestige-back').addEventListener('click', () => show('scr-menu'));
  $('btn-clear-loadout').addEventListener('click', clearLoadout);
  $('btn-home').addEventListener('click', () => { renderMenu(); show('scr-menu'); });
  $('btn-settings').addEventListener('click', openSettings);
  $('btn-settings-back').addEventListener('click', closeSettings);
  $('btn-replay-help').addEventListener('click', () => openTutorial(false));
  $('btn-tutorial-next').addEventListener('click', nextTutorialPanel);
  $('btn-tutorial-skip').addEventListener('click', () => closeTutorial(true));
  document.querySelectorAll('[data-cursor-mode]').forEach(button => {
    button.addEventListener('click', () => PREFS.set({ cursorMode: button.dataset.cursorMode }));
  });
  $('cfg-aim').addEventListener('input', event => PREFS.set({ aimResponsiveness: event.target.value }));
  $('cfg-audio').addEventListener('change', event => PREFS.set({ audioEnabled: event.target.checked }));
  $('cfg-effects').addEventListener('change', event => PREFS.set({ effectsEnabled: event.target.checked }));
  $('cfg-ambience').addEventListener('change', event => PREFS.set({ ambienceEnabled: event.target.checked }));
  $('cfg-volume').addEventListener('input', event => PREFS.set({ masterVolume: event.target.value }));
  $('cfg-reduced').addEventListener('change', event => PREFS.set({ reducedEffects: event.target.checked }));
  $('btn-reset-settings').addEventListener('click', () => PREFS.reset());

  $('btn-wipe').addEventListener('click', () => {
    if (!window.confirm('Effacer toute la progression : arbre, jetons, loadout, crédit, records et compteur de runs ?')) return;
    save = emptySave();
    stats = deriveStats(save.tree, save.loadout);
    persist();
    renderMenu();
  });

  // Barre d'espace pendant un duel : le clavier doit pouvoir parer aussi.
  window.addEventListener('keydown', event => {
    if (event.code === 'Escape' && !$('tutorial').hidden) {
      closeTutorial(false);
      return;
    }
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

  PREFS.initCursor($('weapon-cursor'));
  PREFS.subscribe(applyPreferences);
  applyPreferences(preferences);

  $('btn-mute').addEventListener('click', () => {
    const next = PREFS.set({ audioEnabled: !preferences.audioEnabled });
    if (next.audioEnabled) {
      FX.unlock();
      FX.sfx.tick();
      if (round.running && next.ambienceEnabled) FX.hum(true);
    }
  });

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
    BALANCE, TARGETS, TREE, NODES, PRESTIGE_STATS, PRESTIGE_BUFFS, ports,
    quotaFor, mancheQuotaFor, deriveStats, roundSecondsFor, mancheOf, stepInManche, isMancheEnd,
    normalizeTree, branchInvestment, branchDepth, unlockCheck, nodeState,
    renderTree, enterShop, cancelShopPurchases, validateShop, discardShopChanges,
    emptyLoadout, normalizeLoadout, loadoutCost, tokenSummary, treeInvestedScore,
    recordClearedRound, setStatPoint, togglePrestigeBuff, clearLoadout,
    renderPrestige, renderTreeReset, resetTree, chargeBoost, registerMiss,
    popText, nextHitFeedback: () => nextFeedback(HIT_FEEDBACK),
    nextMissFeedback: () => nextFeedback(MISS_FEEDBACK),
    openTutorial, openSettings, updateHud, endRound, startRound, newRun,
    run, round,
    get save() { return save; },
    get stats() { return stats; },
    get preferences() { return preferences; },
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
