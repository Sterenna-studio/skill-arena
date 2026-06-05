'use client'
import { useState, useRef, useEffect, useCallback } from 'react'

interface Props { onScore: (ms: number) => void }

const DURATION = 5000

export default function LastStand({ onScore }: Props) {
  const [progress, setProgress] = useState(100)
  const [done, setDone] = useState(false)
  const [result, setResult] = useState<number | null>(null)
  const [failed, setFailed] = useState(false)
  const startRef = useRef(performance.now())
  const rafRef = useRef<number>(0)
  const doneRef = useRef(false)

  useEffect(() => {
    const tick = () => {
      const elapsed = performance.now() - startRef.current
      const remaining = Math.max(0, 100 - (elapsed / DURATION) * 100)
      setProgress(remaining)
      if (remaining <= 0 && !doneRef.current) {
        doneRef.current = true
        setFailed(true)
        setDone(true)
        onScore(0) // missed = 0ms (worst)
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [onScore])

  const handleClick = useCallback(() => {
    if (doneRef.current) return
    doneRef.current = true
    cancelAnimationFrame(rafRef.current)
    const elapsed = Math.round(performance.now() - startRef.current)
    const remaining = Math.max(0, DURATION - elapsed)
    setResult(remaining)
    setDone(true)
    onScore(remaining) // higher = better (waited longer)
  }, [onScore])

  const barColor = progress > 40 ? 'var(--success)' : progress > 15 ? 'var(--warning)' : 'var(--danger)'

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center text-sm" style={{ color: 'var(--muted)' }}>
        ⏳ Attends le plus longtemps possible sans laisser la barre se vider
      </div>

      <div className="card p-6 flex flex-col gap-4">
        <div className="text-xs" style={{ color: 'var(--muted)' }}>Temps restant</div>
        <div className="w-full rounded-full overflow-hidden" style={{ height: 24, background: 'var(--surface2)' }}>
          <div
            className="h-full rounded-full transition-none"
            style={{ width: `${progress}%`, background: barColor }}
          />
        </div>
        <div className="text-right text-sm tabular-nums" style={{ color: barColor }}>
          {((progress / 100) * DURATION / 1000).toFixed(2)}s
        </div>
      </div>

      <button
        onClick={handleClick}
        disabled={done}
        className="w-full py-6 rounded-2xl text-2xl font-bold select-none transition-opacity hover:opacity-80"
        style={{
          background: done ? 'var(--surface2)' : 'var(--danger)',
          color: '#fff',
          border: '2px solid var(--border)',
          cursor: done ? 'default' : 'pointer'
        }}
      >
        {done
          ? failed
            ? '💀 Trop tard !'
            : `✋ Stoppé — ${result}ms restants`
          : 'STOP'}
      </button>

      {done && <p className="text-center text-sm" style={{ color: 'var(--muted)' }}>En attente des autres joueurs...</p>}
    </div>
  )
}
