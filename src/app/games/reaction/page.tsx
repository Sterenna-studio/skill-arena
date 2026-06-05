'use client'
import { useState, useRef, useCallback } from 'react'

type Phase = 'idle' | 'waiting' | 'ready' | 'done'

export default function ReactionGame() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<number | null>(null)
  const [results, setResults] = useState<number[]>([])
  const [tooEarly, setTooEarly] = useState(false)
  const startRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const startRound = useCallback(() => {
    setTooEarly(false)
    setResult(null)
    setPhase('waiting')
    const delay = 1500 + Math.random() * 3000
    timerRef.current = setTimeout(() => {
      setPhase('ready')
      startRef.current = performance.now()
    }, delay)
  }, [])

  const handleClick = useCallback(() => {
    if (phase === 'idle' || phase === 'done') {
      startRound()
      return
    }
    if (phase === 'waiting') {
      if (timerRef.current) clearTimeout(timerRef.current)
      setTooEarly(true)
      setPhase('done')
      return
    }
    if (phase === 'ready') {
      const ms = Math.round(performance.now() - startRef.current)
      setResult(ms)
      setResults(prev => [...prev, ms].slice(-10))
      setPhase('done')
    }
  }, [phase, startRound])

  const avg = results.length > 0 ? Math.round(results.reduce((a, b) => a + b, 0) / results.length) : null
  const best = results.length > 0 ? Math.min(...results) : null

  const bg = phase === 'ready' ? 'var(--success)' : phase === 'waiting' ? '#1a1a2e' : 'var(--surface2)'
  const label =
    phase === 'idle' ? 'Clique pour commencer' :
    phase === 'waiting' ? 'Attends...' :
    phase === 'ready' ? 'CLIQUE !' :
    tooEarly ? 'Trop tôt ! Clique pour réessayer' :
    `${result} ms — Clique pour rejouer`

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">⚡ Reaction Time</h1>
        <p className="mt-2" style={{ color: 'var(--muted)' }}>
          Clique dès que le fond devient vert. Attention aux faux départs.
        </p>
      </div>

      <button
        onClick={handleClick}
        className="w-full rounded-2xl flex items-center justify-center text-2xl font-bold select-none cursor-pointer transition-all duration-100"
        style={{ background: bg, height: 260, border: '2px solid var(--border)' }}
      >
        <span style={{ color: phase === 'ready' ? '#fff' : 'var(--text)' }}>{label}</span>
      </button>

      {results.length > 0 && (
        <div className="mt-8 grid grid-cols-3 gap-4">
          {[
            { label: 'Dernier', value: `${result ?? results.at(-1)} ms` },
            { label: 'Moyenne', value: `${avg} ms` },
            { label: 'Meilleur', value: `${best} ms` },
          ].map(s => (
            <div key={s.label} className="card p-4 text-center">
              <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{s.value}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {results.length >= 3 && (
        <div className="mt-4 card p-4">
          <div className="text-xs mb-2" style={{ color: 'var(--muted)' }}>Historique (10 derniers)</div>
          <div className="flex gap-2 flex-wrap">
            {results.map((r, i) => (
              <span key={i} className="text-sm px-2 py-1 rounded" style={{ background: 'var(--surface2)' }}>{r}ms</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
