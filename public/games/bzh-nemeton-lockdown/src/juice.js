export function updateJuice(state, dt) { state.juice.shake = Math.max(0, state.juice.shake - dt*8); state.juice.flash = Math.max(0, state.juice.flash - dt*6); }
