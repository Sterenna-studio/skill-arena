const FRAGMENTS = [
  { id: 'ricochet',    label: 'Ricochet' },
  { id: 'perforation', label: 'Perforation' },
  { id: 'parasite',    label: 'Onde Parasite' },
  { id: 'surcharge',   label: 'Surcharge' },
  { id: 'replication', label: 'Réplication' },
  { id: 'virus',       label: 'Virus' },
  { id: 'echo',        label: 'Echo MiniStar' },
];

const PICKUP_R = 24;

export function spawnDrop(state, x, y) {
  const frag = FRAGMENTS[Math.floor(Math.random() * FRAGMENTS.length)];
  state.drops.push({ x, y, id: frag.id, label: frag.label });
}

export function updateDrops(state, dt) {
  const p = state.player;
  if (!p || state.phase === 'dead') return;

  for (let i = state.drops.length - 1; i >= 0; i--) {
    const d = state.drops[i];
    const dx = p.x - d.x, dy = p.y - d.y;
    if (dx * dx + dy * dy < PICKUP_R * PICKUP_R) {
      state.fragments.push({ id: d.id, label: d.label });
      state.drops.splice(i, 1);
    }
  }
}
