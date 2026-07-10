export const gameState = {
  phase: 'menu',        // menu | run | room_clear | dead
  run: { sector: 1, room: 1, score: 0 },
  player: null,
  enemies: [],
  bullets: [],
  drops: [],
  particles: [],
  fragments: [],        // power-ups stackables actifs
  metaPassives: [],     // persistants entre runs
  juice: { shake: 0, flash: 0 },
  input: { keys: {}, mouse: { x: 0, y: 0, down: false } },
};

export function resetRun() {
  gameState.phase = 'run';
  gameState.run = { sector: 1, room: 1, score: 0 };
  gameState.fragments = [];
  gameState.player = {
    x: 320, y: 480,
    hp: 120, maxHp: 120,
    speed: 180,
    vx: 0, vy: 0,
    // dash
    dashCooldown: 0,
    dashing: 0,
    dashVx: 0,
    dashVy: 0,
    dashKey: false,
    // shoot
    shootCooldown: 0,
    shotCount: 0,
    surchargeTimer: 0,
    agent: 'MutenRock',
  };
  gameState.enemies = [];
  gameState.bullets = [];
  gameState.drops = [];
  gameState.particles = [];
}
