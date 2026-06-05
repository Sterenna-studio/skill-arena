'use client'
import { useState, useRef, useCallback } from 'react'

const TARGETS = [3, 5, 7, 10, 15, 20]

export default function TimeEstimatorGame() {
  const [phase, setPhase] = useState<'idle' | 'counting' | 'done'>('idle')
  const [target, setTarget] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [precision, setPrecision] = useState(0)
  const [history, setHistory] = useState<{ target: number; elapsed: number; prec: number }[]>([])
  const startRef = useRef(0)
  const rafRef = useRef<number>(0)
  const [display, setDisplay] = useState(0)

  const start = useCallback(() => {
    const t = TARGETS[Math.floor(Math.random() * TARGETS.length)]
    setTarget(t)
    setPhase('counting')
    startRef.current = performance.now()
    const tick = () => {
      setDisplay(Math.round((performance.now() - startRef.current) / 1000))
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  const stop = useCallback(() => {
    if (phase !== 'counting') return
    cancelAnimationFrame(rafRef.current)
    const ms = performance.now() - startRef.current
    const secs = ms / 1000
    const err = Math.abs(secs - target) / target
    const prec = Math.max(0, Math.round((1 - err) * 100))
    setElapsed(Math.round(secs * 10) / 10)
    setPrecision(prec)
    setHistory(prev => [...prev, { target, elapsed: Math.round(secs * 10) / 10, prec }].slice(-10))
    setPhase('done')
  }, [phase, target])

  const reset = useCallback(() => {
    setPhase('idle')
    setDisplay(0)
  }, [])

  const precColor = precision >= 90 ? 'var(--success)' : precision >= 70 ? 'var(--warning)' : 'var(--danger)'

  return (
    <div className="max-w-xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">⏱️ Time Estimator</h1>
        <p className="mt-2" style={{ color: 'var(--muted)' }}>
          Clique sur Stop quand tu penses que le temps demandé est écoulé.
        </p>
      </div>

      {phase === 'idle' && (
        <button onClick={start} className="w-full card p-8 text-center hover:border-[var(--accent)] transition-colors cursor-pointer">
          <span className="text-xl font-semibold" style={{ color: 'var(--accent)' }}>Clique pour commencer</span>
        </button>
      )}

      {phase === 'counting' && (
        <div className="flex flex-col gap-6 items-center">
          <div className="card p-8 text-center w-full">
            <div style={{ color: 'var(--muted)' }} className="text-sm mb-2">Objectif</div>
            <div className="text-5xl font-bold" style={{ color: 'var(--accent)' }}>{target}s</div>
          </div>
          <div className="text-2xl font-mono" style={{ color: 'var(--muted)' }}>{display}s</div>
          <button onClick={stop}
            className="px-10 py-4 rounded-xl text-xl font-bold transition-opacity hover:opacity-80"
            style={{ background: 'var(--danger)', color: '#fff' }}>
            STOP
          </button>
        </div>
      )}

      {phase === 'done' && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="card p-4 text-center">
              <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{target}s</div>
              <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Objectif</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-2xl font-bold">{elapsed}s</div>
              <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Ton temps</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-2xl font-bold" style={{ color: precColor }}>{precision}%</div>
              <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Précision</div>
            </div>
          </div>
          <div className="text-center text-sm" style={{ color: 'var(--muted)' }}>
            Écart : {Math.abs(elapsed - target).toFixed(1)}s {elapsed > target ? 'de trop' : 'trop tôt'}
          </div>
          <button onClick={reset} className="px-6 py-2 rounded-lg font-semibold transition-opacity hover:opacity-80 mt-2"
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
                {r.target}s → {r.elapsed}s · {r.prec}%
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
