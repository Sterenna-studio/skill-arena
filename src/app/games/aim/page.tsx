'use client'
import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import Target from '@/components/games/aim/Target'

type Mode = 'classic' | 'moving' | 'bait' | 'numbered' | 'color'
type Phase = 'idle' | 'playing' | 'done'

interface T {
  id: number
  x: number
  y: number
  size: number
  vx: number
  vy: number
  kind: 'normal' | 'bait'
  number?: number
  color?: string
}

const DURATION = 30

const PALETTE = [
  { name: 'rouge',  value: '#ef4444' },
  { name: 'bleu',   value: '#3b82f6' },
  { name: 'vert',   value: '#22c55e' },
  { name: 'jaune',  value: '#f59e0b' },
  { name: 'violet', value: '#a855f7' },
]

const MODES: { id: Mode; level: number; name: string; icon: string; desc: string; metric: string }[] = [
  { id: 'classic',  level: 1, name: 'Classique',  icon: '🎯', desc: 'Frappe les cibles le plus vite possible', metric: 'cibles' },
  { id: 'moving',   level: 2, name: 'Mouvantes',  icon: '🏃', desc: 'Les cibles se déplacent et rebondissent', metric: 'cibles' },
  { id: 'bait',     level: 3, name: 'Pièges',     icon: '🚫', desc: 'Évite les cibles rouges (✕)', metric: 'cibles' },
  { id: 'numbered', level: 4, name: 'Séquence',   icon: '🔢', desc: 'Frappe les cibles dans l\'ordre 1 → 5', metric: 'séquences' },
  { id: 'color',    level: 5, name: 'Couleurs',   icon: '🌈', desc: 'Respecte l\'ordre de couleurs affiché', metric: 'séquences' },
]

const NUMBERED_N = 5

function rand(min: number, max: number) {
  return min + Math.random() * (max - min)
}
function shuffle<X>(arr: X[]): X[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function getBest(mode: Mode): number {
  if (typeof window === 'undefined') return 0
  return Number(localStorage.getItem(`aim_best_${mode}`) ?? 0)
}
function setBest(mode: Mode, val: number) {
  if (typeof window === 'undefined') return
  if (val > getBest(mode)) localStorage.setItem(`aim_best_${mode}`, String(val))
}

export default function AimGame() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [mode, setMode] = useState<Mode>('classic')
  const [targets, setTargets] = useState<T[]>([])
  const [timeLeft, setTimeLeft] = useState(DURATION)
  const [score, setScore] = useState(0)        // hits (classic/moving/bait) ou séquences (numbered/color)
  const [mistakes, setMistakes] = useState(0)
  const [misses, setMisses] = useState(0)
  const [wrongFlash, setWrongFlash] = useState(false)
  const [bestNow, setBestNow] = useState(0)

  // Séquence numérotée
  const [nextNumber, setNextNumber] = useState(1)
  const nextRef = useRef(1)
  // Séquence couleur
  const [colorOrder, setColorOrder] = useState<{ name: string; value: string }[]>([])
  const [colorIdx, setColorIdx] = useState(0)
  const colorIdxRef = useRef(0)
  const colorOrderRef = useRef<{ name: string; value: string }[]>([])

  const fieldRef = useRef<HTMLDivElement>(null)
  const dimsRef = useRef({ w: 640, h: 400 })
  const idRef = useRef(0)

  // ── Mesure du terrain (responsive) ──────────────────────────────
  useLayoutEffect(() => {
    const el = fieldRef.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      dimsRef.current = { w: r.width, h: r.height }
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ── Placement sans chevauchement ────────────────────────────────
  const placePos = useCallback((size: number, others: T[]) => {
    const { w, h } = dimsRef.current
    for (let i = 0; i < 30; i++) {
      const x = rand(size / 2, w - size / 2)
      const y = rand(size / 2, h - size / 2)
      if (others.every(o => Math.hypot(o.x - x, o.y - y) > (o.size + size) / 2 + 8)) {
        return { x, y }
      }
    }
    return { x: rand(size / 2, w - size / 2), y: rand(size / 2, h - size / 2) }
  }, [])

  const makeTarget = useCallback((opts: Partial<T> & { moving?: boolean }, others: T[] = []): T => {
    const size = opts.size ?? rand(46, 70)
    const { x, y } = placePos(size, others)
    return {
      id: ++idRef.current,
      x, y, size,
      vx: opts.moving ? rand(-160, 160) : 0,
      vy: opts.moving ? rand(-160, 160) : 0,
      kind: opts.kind ?? 'normal',
      number: opts.number,
      color: opts.color,
    }
  }, [placePos])

  // ── Génération d'un set selon le mode ───────────────────────────
  const spawnSet = useCallback((m: Mode, roundsDone = 0): T[] => {
    if (m === 'classic') return [makeTarget({ size: rand(46, 66) })]
    if (m === 'moving') {
      const out: T[] = []
      for (let i = 0; i < 2; i++) out.push(makeTarget({ moving: true, size: rand(48, 64) }, out))
      return out
    }
    if (m === 'bait') {
      const n = 2 + Math.floor(Math.random() * 2)
      const out: T[] = []
      for (let i = 0; i < n; i++) {
        out.push(makeTarget({ kind: Math.random() < 0.4 ? 'bait' : 'normal', size: rand(46, 62) }, out))
      }
      if (!out.some(t => t.kind === 'normal')) out[0].kind = 'normal'
      return out
    }
    if (m === 'numbered') {
      const out: T[] = []
      for (let n = 1; n <= NUMBERED_N; n++) out.push(makeTarget({ number: n, size: 58 }, out))
      return shuffle(out)
    }
    // color
    const len = Math.min(3 + Math.floor(roundsDone / 2), 5)
    const order = shuffle(PALETTE).slice(0, len)
    colorOrderRef.current = order
    setColorOrder(order)
    colorIdxRef.current = 0
    setColorIdx(0)
    const out: T[] = []
    shuffle(order).forEach(c => out.push(makeTarget({ color: c.value, size: 56 }, out)))
    return out
  }, [makeTarget])

  // ── Démarrer une partie ─────────────────────────────────────────
  const start = useCallback((m: Mode) => {
    setMode(m)
    setScore(0)
    setMistakes(0)
    setMisses(0)
    setTimeLeft(DURATION)
    nextRef.current = 1
    setNextNumber(1)
    setBestNow(getBest(m))
    setPhase('playing')
    // attendre le mount du terrain pour mesurer
    requestAnimationFrame(() => setTargets(spawnSet(m, 0)))
  }, [spawnSet])

  const endGame = useCallback(() => {
    setPhase('done')
    setTargets([])
    setScore(s => { setBest(mode, s); return s })
  }, [mode])

  // ── Timer ───────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(id); endGame(); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [phase, endGame])

  // ── Animation des cibles mouvantes ──────────────────────────────
  useEffect(() => {
    if (phase !== 'playing' || mode !== 'moving') return
    let last = performance.now()
    let raf = 0
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const { w, h } = dimsRef.current
      setTargets(prev => prev.map(t => {
        let { x, y, vx, vy } = t
        const r = t.size / 2
        x += vx * dt; y += vy * dt
        if (x < r) { x = r; vx = Math.abs(vx) }
        if (x > w - r) { x = w - r; vx = -Math.abs(vx) }
        if (y < r) { y = r; vy = Math.abs(vy) }
        if (y > h - r) { y = h - r; vy = -Math.abs(vy) }
        return { ...t, x, y, vx, vy }
      }))
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [phase, mode])

  const flashWrong = useCallback(() => {
    setWrongFlash(true)
    setTimeout(() => setWrongFlash(false), 160)
  }, [])

  // ── Clic sur une cible ──────────────────────────────────────────
  const hit = useCallback((t: T, e: React.MouseEvent) => {
    e.stopPropagation()
    if (phase !== 'playing') return

    if (mode === 'classic' || mode === 'moving') {
      setScore(s => s + 1)
      setTargets(prev => {
        const rest = prev.filter(x => x.id !== t.id)
        return [...rest, ...spawnSet(mode)]
      })
      return
    }

    if (mode === 'bait') {
      if (t.kind === 'bait') {
        setMistakes(m => m + 1)
        setScore(s => Math.max(0, s - 1))
        flashWrong()
      } else {
        setScore(s => s + 1)
      }
      setTargets(prev => {
        const rest = prev.filter(x => x.id !== t.id)
        return rest.length === 0 ? spawnSet('bait') : rest
      })
      return
    }

    if (mode === 'numbered') {
      if (t.number === nextRef.current) {
        const newNext = nextRef.current + 1
        setTargets(prev => prev.filter(x => x.id !== t.id))
        if (newNext > NUMBERED_N) {
          nextRef.current = 1
          setNextNumber(1)
          setScore(s => s + 1) // séquence complète
          setTargets(spawnSet('numbered'))
        } else {
          nextRef.current = newNext
          setNextNumber(newNext)
        }
      } else {
        setMistakes(m => m + 1)
        flashWrong()
      }
      return
    }

    if (mode === 'color') {
      const expected = colorOrderRef.current[colorIdxRef.current]?.value
      if (t.color === expected) {
        const newIdx = colorIdxRef.current + 1
        setTargets(prev => prev.filter(x => x.id !== t.id))
        if (newIdx >= colorOrderRef.current.length) {
          setScore(s => {
            const ns = s + 1
            setTargets(spawnSet('color', ns)) // difficulté progressive
            return ns
          })
        } else {
          colorIdxRef.current = newIdx
          setColorIdx(newIdx)
        }
      } else {
        setMistakes(m => m + 1)
        flashWrong()
      }
      return
    }
  }, [phase, mode, spawnSet, flashWrong])

  const onMissBackground = useCallback(() => {
    if (phase === 'playing') setMisses(m => m + 1)
  }, [phase])

  const currentMode = MODES.find(m => m.id === mode)!
  const accuracy = (() => {
    const total = score + mistakes + misses
    return total > 0 ? Math.round((score / total) * 100) : 0
  })()

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">🎯 Aim Trainer</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
            {phase === 'playing' ? currentMode.desc : '5 niveaux progressifs — choisis ton défi.'}
          </p>
        </div>
        {phase === 'playing' && (
          <div className="flex gap-4 items-center">
            <Stat label="Temps" value={`${timeLeft}s`} danger={timeLeft <= 5} />
            <Stat label={currentMode.metric} value={String(score)} accent />
          </div>
        )}
      </div>

      {/* Bandeau séquence (modes numbered / color) */}
      {phase === 'playing' && mode === 'numbered' && (
        <div className="mb-3 text-sm card px-4 py-2 inline-flex items-center gap-2">
          <span style={{ color: 'var(--muted)' }}>Prochaine cible :</span>
          <span className="font-bold text-lg" style={{ color: 'var(--accent)' }}>{nextNumber}</span>
          <span style={{ color: 'var(--muted)' }}>/ {NUMBERED_N}</span>
        </div>
      )}
      {phase === 'playing' && mode === 'color' && (
        <div className="mb-3 card px-4 py-2 flex items-center gap-2 flex-wrap">
          <span className="text-sm" style={{ color: 'var(--muted)' }}>Ordre :</span>
          {colorOrder.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              <span style={{
                width: 22, height: 22, borderRadius: '50%', background: c.value, display: 'inline-block',
                outline: i === colorIdx ? '3px solid var(--text)' : 'none',
                opacity: i < colorIdx ? 0.3 : 1,
              }} />
              {i < colorOrder.length - 1 && <span style={{ color: 'var(--muted)' }}>›</span>}
            </span>
          ))}
        </div>
      )}

      {/* Terrain de jeu */}
      <div
        ref={fieldRef}
        onClick={onMissBackground}
        className="relative rounded-xl overflow-hidden select-none"
        style={{
          height: 400,
          background: 'var(--surface2)',
          border: `2px solid ${wrongFlash ? 'var(--danger)' : 'var(--border)'}`,
          cursor: phase === 'playing' ? 'crosshair' : 'default',
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          transition: 'border-color 0.1s',
        }}
      >
        {phase === 'playing' && targets.map(t => (
          <button
            key={t.id}
            onClick={e => hit(t, e)}
            className="absolute p-0 border-0 bg-transparent"
            style={{ left: t.x - t.size / 2, top: t.y - t.size / 2, cursor: 'crosshair' }}
            aria-label={t.kind === 'bait' ? 'piège' : 'cible'}
          >
            <Target size={t.size} kind={t.kind} number={t.number} color={t.color} />
          </button>
        ))}

        {/* Overlay sélection de mode */}
        {phase === 'idle' && (
          <div className="absolute inset-0 p-5 overflow-auto" style={{ background: 'rgba(13,13,15,0.55)' }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {MODES.map(m => (
                <button key={m.id} onClick={() => start(m.id)}
                  className="card p-4 text-left flex items-center gap-3 hover:border-[var(--accent)] transition-colors">
                  <span className="text-3xl">{m.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-1.5 py-0.5 rounded font-semibold"
                        style={{ background: 'var(--accent)', color: '#fff' }}>N{m.level}</span>
                      <span className="font-semibold">{m.name}</span>
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{m.desc}</div>
                  </div>
                  {getBest(m.id) > 0 && (
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>🏆 {getBest(m.id)}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Overlay résultats */}
        {phase === 'done' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"
               style={{ background: 'rgba(13,13,15,0.85)' }}>
            <div className="text-sm uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
              {currentMode.icon} {currentMode.name}
            </div>
            <div className="text-6xl font-black" style={{ color: 'var(--accent)' }}>{score}</div>
            <div style={{ color: 'var(--muted)' }}>{currentMode.metric}</div>
            <div className="flex gap-6 text-sm mt-1" style={{ color: 'var(--muted)' }}>
              <span>Précision {accuracy}%</span>
              {mistakes > 0 && <span>Erreurs {mistakes}</span>}
              <span>🏆 Record {Math.max(bestNow, score)}</span>
            </div>
            <div className="flex gap-3 mt-3">
              <button onClick={() => start(mode)}
                className="px-6 py-2 rounded-lg font-semibold transition-opacity hover:opacity-80"
                style={{ background: 'var(--accent)', color: '#fff' }}>
                Rejouer
              </button>
              <button onClick={() => setPhase('idle')}
                className="px-6 py-2 rounded-lg font-semibold transition-opacity hover:opacity-80"
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                Changer de niveau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stats live secondaires */}
      {phase === 'playing' && (
        <div className="mt-3 flex gap-4 text-sm" style={{ color: 'var(--muted)' }}>
          <span>Précision : {accuracy}%</span>
          {(mode === 'bait' || mode === 'numbered' || mode === 'color') && <span>Erreurs : {mistakes}</span>}
          <span>Ratés : {misses}</span>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, accent, danger }: { label: string; value: string; accent?: boolean; danger?: boolean }) {
  return (
    <div className="text-right">
      <div className="text-2xl font-bold tabular-nums"
        style={{ color: danger ? 'var(--danger)' : accent ? 'var(--accent)' : 'var(--text)' }}>
        {value}
      </div>
      <div className="text-xs" style={{ color: 'var(--muted)' }}>{label}</div>
    </div>
  )
}
