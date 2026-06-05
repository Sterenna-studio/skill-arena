'use client'
import { useState, useRef, useCallback } from 'react'

interface Props { onScore: (ms: number) => void }

type Phase = 'waiting' | 'ready' | 'done'

export default function ReactionRace({ onScore }: Props) {
  const [phase, setPhase] = useState<Phase>('waiting')
  const [ms, setMs] = useState<number | null>(null)
  const [tooEarly, setTooEarly] = useState(false)
  const startRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-start on mount
  useCallback(() => {
    const delay = 1500 + Math.random() * 3000
    timerRef.current = setTimeout(() => {
      setPhase('ready')
      startRef.current = performance.now()
    }, delay)
  }, [])()

  const handleClick = useCallback(() => {
    if (phase === 'waiting') {
      if (timerRef.current) clearTimeout(timerRef.current)
      setTooEarly(true)
      setPhase('done')
      onScore(9999)
      return
    }
    if (phase === 'ready') {
      const elapsed = Math.round(performance.now() - startRef.current)
      setMs(elapsed)
      setPhase('done')
      onScore(elapsed)
    }
  }, [phase, onScore])

  const bg = phase === 'ready' ? 'var(--success)' : '#1a1a2e'

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center text-sm mb-2" style={{ color: 'var(--muted)' }}>
        ⚡ Clique dès que le fond devient vert !
      </div>
      <button
        onClick={handleClick}
        disabled={phase === 'done'}
        className="w-full rounded-2xl flex items-center justify-center text-2xl font-bold select-none transition-colors"
        style={{ background: bg, height: 260, border: '2px solid var(--border)', cursor: phase === 'done' ? 'default' : 'pointer' }}
      >
        {phase === 'waiting' && <span style={{ color: 'var(--muted)' }}>Attends...</span>}
        {phase === 'ready' && <span style={{ color: '#fff' }}>CLIQUE !</span>}
        {phase === 'done' && (
          <span style={{ color: tooEarly ? 'var(--danger)' : 'var(--success)' }}>
            {tooEarly ? '💀 Trop tôt !' : `⚡ ${ms} ms`}
          </span>
        )}
      </button>
      {phase === 'done' && (
        <p className="text-center text-sm" style={{ color: 'var(--muted)' }}>
          En attente des autres joueurs...
        </p>
      )}
    </div>
  )
}
