'use client'
import { useState, useRef, useEffect, useCallback } from 'react'

interface Props { onScore: (ms: number) => void }

type Signal = 'green' | 'red' | null

export default function FakeOut({ onScore }: Props) {
  const [signal, setSignal] = useState<Signal>(null)
  const [done, setDone] = useState(false)
  const [penalty, setPenalty] = useState(0)
  const [hits, setHits] = useState(0)
  const totalPenaltyRef = useRef(0)
  const hitsRef = useRef(0)
  const roundRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const ROUNDS = 8

  const nextSignal = useCallback(() => {
    if (roundRef.current >= ROUNDS) {
      setDone(true)
      // score = total penalty (lower is better)
      onScore(totalPenaltyRef.current)
      return
    }
    setSignal(null)
    const delay = 600 + Math.random() * 1200
    timerRef.current = setTimeout(() => {
      const isGreen = Math.random() > 0.35
      setSignal(isGreen ? 'green' : 'red')
      roundRef.current++
      // Auto-advance after 1.2s if no click
      timerRef.current = setTimeout(() => {
        if (isGreen) {
          // missed green = +300ms penalty
          totalPenaltyRef.current += 300
          setPenalty(p => p + 300)
        }
        nextSignal()
      }, 1200)
    }, delay)
  }, [onScore])

  useEffect(() => {
    nextSignal()
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [nextSignal])

  const handleClick = useCallback(() => {
    if (done || signal === null) return
    if (timerRef.current) clearTimeout(timerRef.current)
    if (signal === 'red') {
      totalPenaltyRef.current += 200
      setPenalty(p => p + 200)
    } else {
      hitsRef.current++
      setHits(h => h + 1)
    }
    nextSignal()
  }, [done, signal, nextSignal])

  const bg = signal === 'green' ? 'var(--success)' : signal === 'red' ? 'var(--danger)' : 'var(--surface2)'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between text-sm mb-1" style={{ color: 'var(--muted)' }}>
        <span>🟢 Vert = cliquer · 🔴 Rouge = ne pas cliquer</span>
        <span>Tour {Math.min(roundRef.current, ROUNDS)}/{ROUNDS}</span>
      </div>
      <button
        onClick={handleClick}
        disabled={done}
        className="w-full rounded-2xl flex items-center justify-center text-3xl font-bold select-none transition-colors"
        style={{ background: bg, height: 260, border: '2px solid var(--border)', cursor: done ? 'default' : 'pointer' }}
      >
        {done
          ? <span style={{ color: 'var(--text)' }}>✅ Terminé — {totalPenaltyRef.current}ms pénalité</span>
          : signal === null
            ? <span style={{ color: 'var(--muted)' }}>Attends...</span>
            : <span style={{ color: '#fff' }}>{signal === 'green' ? 'CLIQUE !' : 'NE CLIQUE PAS !'}</span>
        }
      </button>
      <div className="flex gap-4 text-sm" style={{ color: 'var(--muted)' }}>
        <span>✅ Hits : {hits}</span>
        <span>⚠️ Pénalité : {penalty}ms</span>
      </div>
      {done && <p className="text-center text-sm" style={{ color: 'var(--muted)' }}>En attente des autres joueurs...</p>}
    </div>
  )
}
