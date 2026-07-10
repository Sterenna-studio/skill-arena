'use client'
import { useState, useRef, useEffect, useCallback } from 'react'

interface Props { onScore: (ms: number) => void }

const COLORS = ['#6c63ff', '#22c55e', '#ef4444', '#f59e0b', '#06b6d4']
const CHAIN_LENGTH = 6
const WINDOW_MS = 600

interface Signal { color: string; id: number }

export default function ChainReaction({ onScore }: Props) {
  const [signals, setSignals] = useState<Signal[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [done, setDone] = useState(false)
  const [failed, setFailed] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const startRef = useRef<number>(0)
  const idxRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startChainRef = useRef<(chain: Signal[]) => void>(() => {})

  const generateChain = useCallback((): Signal[] =>
    Array.from({ length: CHAIN_LENGTH }, (_, i) => ({
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      id: i,
    })), [])

  const startChain = useCallback((chain: Signal[]) => {
    setCurrentIdx(0)
    idxRef.current = 0
    setFailed(false)
    setSignals(chain)
    startRef.current = performance.now()
    // auto-fail if no click in window
    timerRef.current = setTimeout(() => {
      setFailed(true)
      setAttempts(a => a + 1)
      // restart
      setTimeout(() => startChainRef.current(generateChain()), 600)
    }, WINDOW_MS)
  }, [generateChain])
  useEffect(() => { startChainRef.current = startChain }, [startChain])

  useEffect(() => {
    const chain = generateChain()
    setTimeout(() => startChain(chain), 400)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleClick = useCallback((colorIdx: number) => {
    if (done || signals.length === 0) return
    if (timerRef.current) clearTimeout(timerRef.current)

    const expected = signals[idxRef.current]?.color
    const clicked = COLORS[colorIdx]

    if (clicked !== expected) {
      setFailed(true)
      setAttempts(a => a + 1)
      setTimeout(() => startChain(generateChain()), 600)
      return
    }

    const next = idxRef.current + 1
    idxRef.current = next
    setCurrentIdx(next)

    if (next >= CHAIN_LENGTH) {
      const elapsed = Math.round(performance.now() - startRef.current)
      setDone(true)
      onScore(elapsed)
      return
    }

    timerRef.current = setTimeout(() => {
      setFailed(true)
      setAttempts(a => a + 1)
      setTimeout(() => startChain(generateChain()), 600)
    }, WINDOW_MS)
  }, [done, signals, onScore, startChain, generateChain])

  const current = signals[currentIdx]

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center text-sm" style={{ color: 'var(--muted)' }}>
        🔗 Clique sur la couleur indiquée dans l&apos;ordre — sans erreur !
      </div>

      {/* Signal actuel */}
      <div className="card flex items-center justify-center rounded-2xl"
           style={{ height: 120, background: failed ? '#2a1a1a' : 'var(--surface2)' }}>
        {signals.length > 0 && !done && (
          <div className="flex flex-col items-center gap-2">
            <div className="rounded-full" style={{
              width: 56, height: 56,
              background: current?.color ?? 'transparent',
              boxShadow: `0 0 20px ${current?.color}88`
            }} />
            <span className="text-xs" style={{ color: 'var(--muted)' }}>
              {failed ? '❌ Raté — nouvelle séquence...' : `${currentIdx + 1} / ${CHAIN_LENGTH}`}
            </span>
          </div>
        )}
        {done && (
          <span className="text-xl font-bold" style={{ color: 'var(--success)' }}>
            ✅ Terminé !
          </span>
        )}
      </div>

      {/* Boutons couleurs */}
      <div className="grid grid-cols-5 gap-3">
        {COLORS.map((color, i) => (
          <button key={i} onClick={() => handleClick(i)}
            disabled={done}
            className="rounded-xl transition-transform hover:scale-105 active:scale-95"
            style={{
              height: 64,
              background: color,
              boxShadow: `0 0 12px ${color}55`,
              border: 'none',
              cursor: done ? 'default' : 'pointer',
            }}
          />
        ))}
      </div>

      {/* Progression */}
      <div className="flex gap-2 justify-center">
        {Array.from({ length: CHAIN_LENGTH }).map((_, i) => (
          <div key={i} className="rounded-full transition-all"
            style={{
              width: 14, height: 14,
              background: i < currentIdx ? signals[i]?.color : 'var(--surface2)',
              border: `1px solid ${i === currentIdx ? 'var(--text)' : 'var(--border)'}`,
            }} />
        ))}
      </div>

      <div className="text-sm text-center" style={{ color: 'var(--muted)' }}>
        {attempts > 0 && `${attempts} essai${attempts > 1 ? 's' : ''} raté${attempts > 1 ? 's' : ''}`}
      </div>

      {done && <p className="text-center text-sm" style={{ color: 'var(--muted)' }}>En attente des autres joueurs...</p>}
    </div>
  )
}
