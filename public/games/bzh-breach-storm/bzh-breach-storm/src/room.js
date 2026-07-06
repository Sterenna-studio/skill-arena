import { spawnEnemy } from './enemies.js';

const WAVE_TABLE = [
  // sector 1
  [{ shard: 3 },                               // room 1
   { shard: 3, proxy: 1 },                     // room 2
   { shard: 2, proxy: 1, sentinel: 1 }],       // room 3 (pre-boss)
  // sector 2
  [{ shard: 4, proxy: 1 },
   { shard: 3, sentinel: 2, knight: 1 },
   { shard: 2, proxy: 2, echo: 2 }],
  // sector 3
  [{ shard: 5, proxy: 2, knight: 1 },
   { shard: 4, sentinel: 2, echo: 2, knight: 1 },
   { shard: 3, proxy: 2, sentinel: 2, echo: 2, knight: 1 }],
];

export function startRoom(state) {
  state.enemies = [];
  state.drops   = [];
  state.bullets  = state.bullets.filter(b => !b.fromPlayer === false); // keep only player bullets? clear all
  state.bullets  = [];
  state.phase    = 'run';

  const sector = Math.min(state.run.sector - 1, WAVE_TABLE.length - 1);
  const room   = Math.min(state.run.room - 1,   WAVE_TABLE[sector].length - 1);
  const wave   = WAVE_TABLE[sector][room];

  for (const [type, count] of Object.entries(wave)) {
    for (let i = 0; i < count; i++) spawnEnemy(state, type);
  }
}
