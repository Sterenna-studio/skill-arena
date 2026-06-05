'use client'
import { useState, useRef, useCallback, useEffect } from 'react'

interface Target {
  id: number
  x: number
  y: number
  size: number
}

const GAME_DURATION = 30

function randTarget(id: number): Target {
  const size = 40 + Math.random() * 30
  return {
    id,
    x: size / 2 + Math.random() * (600 - size),
    y: size / 2 + Math.random() * (340 - size),
    size,
  }
}

export default function AimGame() {
  const [phase, setPhase] = useState<'idle' | 'playing' | 'done'>('idle')
  const [targets, setTargets] = useState<Target[]>([])
  const [hits, setHits] = useState(0)
  const [misses, setMisses] = useState(0)
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION)
  const [history, setHistory] = useState<{ hits: number; acc: number }[]>([])
  const idRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const spawnTargets = useCallback(() => {
    const count = 1 + Math.floor(Math.random() * 2)
    return Array.from({ length: count }, () => randTarget(++idRef.current))
  }, [])

  const start = useCallback(() => {
    setHits(0)
    setMisses(0)
    setTimeLeft(GAME_DURATION)
    setTargets(spawnTargets())
    setPhase('playing')
  }, [spawnTargets])

  useEffect(() => {
    if (phase !== 'playing') return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!)
          setPhase('done')
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current!)
  }, [phase])

  const hitTarget = useCallback((id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setHits(h => h + 1)
    setTargets(prev => {
      const next = prev.filter(t => t.id !== id)
      return next.length === 0 ? spawnTargets() : [...next, ...spawnTargets()].slice(0, 3)
    })
  }, [spawnTargets])

  const miss = useCallback(() => {
    if (phase === 'playing') setMisses(m => m + 1)
  }, [phase])

  useEffect(() => {
    if (phase === 'done') {
      setHistory(prev => {
        const total = hits + misses
        const acc = total > 0 ? Math.round((hits / total) * 100) : 0
        return [...prev, { hits, acc }].slice(-10)
      })
    }
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">🎯 Aim Trainer</h1>
          <p className="mt-1" style={{ color: 'var(--muted)' }}>Clique sur les cibles en {GAME_DURATION}s.</p>
        </div>
        {phase === 'playing' && (
          <div className="text-right">
            <div className="text-3xl font-bold" style={{ color: timeLeft <= 5 ? 'var(--danger)' : 'var(--accent)' }}>{timeLeft}s</div>
            <div className="text-sm" style={{ color: 'var(--muted)' }}>{hits} hits</div>
          </div>
        )}
      </div>

      {phase === 'idle' && (
        <div className="card flex items-center justify-center cursor-pointer hover:border-[var(--accent)] transition-colors"
             style={{ height: 340 }} onClick={start}>
          <span className="text-xl font-semibold" style={{ color: 'var(--accent)' }}>Clique pour commencer</span>
        </div>
      )}

      {phase === 'playing' && (
        <div className="relative rounded-xl overflow-hidden cursor-crosshair"
             style={{ height: 340, background: 'var(--surface2)', border: '1px solid var(--border)' }}
             onClick={miss}>
          {targets.map(t => (
            <button
              key={t.id}
              onClick={e => hitTarget(t.id, e)}
              style={{
                position: 'absolute',
                left: t.x - t.size / 2,
                top: t.y - t.size / 2,
                width: t.size,
                height: t.size,
                borderRadius: '50%',
                background: 'var(--accent)',
                boxShadow: '0 0 16px var(--accent-glow)',
                border: 'none',
                cursor: 'crosshair',
              }}
            />
          ))}
        </div>
      )}

      {phase === 'done' && (
        <div className="card p-8 text-center" style={{ height: 340, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <div className="text-5xl font-bold" style={{ color: 'var(--accent)' }}>{hits}</div>
          <div style={{ color: 'var(--muted)' }}>hits en {GAME_DURATION}s</div>
          <div className="text-sm" style={{ color: 'var(--muted)' }}>
            Précision : {hits + misses > 0 ? Math.round((hits / (hits + misses)) * 100) : 0}%
          </div>
          <button onClick={start}
            className="mt-4 px-6 py-2 rounded-lg font-semibold transition-opacity hover:opacity-80"
            style={{ background: 'var(--accent)', color: '#fff' }}>
            Rejouer
          </button>
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-6 card p-4">
          <div className="text-xs mb-2" style={{ color: 'var(--muted)' }}>Historique</div>
          <div className="flex gap-2 flex-wrap">
            {history.map((r, i) => (
              <span key={i} className="text-sm px-2 py-1 rounded" style={{ background: 'var(--surface2)' }}>
                {r.hits} hits · {r.acc}%
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
