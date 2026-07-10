'use client'
import { useState, useRef, useEffect, useCallback } from 'react'

interface Props { onScore: (avgError: number) => void }

const BPM = 120
const BEAT_MS = (60 / BPM) * 1000
const BEATS = 8

export default function RhythmDuel({ onScore }: Props) {
  const [beat, setBeat] = useState(0)
  const [active, setActive] = useState(false)
  const [done, setDone] = useState(false)
  const [errors, setErrors] = useState<number[]>([])
  const [flash, setFlash] = useState(false)
  const beatTimesRef = useRef<number[]>([])
  const clickTimesRef = useRef<number[]>([])
  const startRef = useRef(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const finish = useCallback(() => {
    const beatTimes = beatTimesRef.current
    const clickTimes = clickTimesRef.current
    const errs: number[] = []
    beatTimes.forEach((bt, i) => {
      const ct = clickTimes[i]
      if (ct !== undefined) errs.push(Math.abs(ct - bt))
      else errs.push(BEAT_MS / 2) // missed beat = half-beat penalty
    })
    const avg = Math.round(errs.reduce((a, b) => a + b, 0) / errs.length)
    setErrors(errs)
    setDone(true)
    onScore(avg)
  }, [onScore])

  useEffect(() => {
    // Short delay then start metronome
    const t = setTimeout(() => {
      startRef.current = performance.now()
      setActive(true)
      let b = 0
      intervalRef.current = setInterval(() => {
        b++
        setBeat(b)
        beatTimesRef.current.push(performance.now())
        setFlash(true)
        setTimeout(() => setFlash(false), 80)
        if (b >= BEATS) {
          clearInterval(intervalRef.current!)
          setTimeout(() => finish(), 500)
        }
      }, BEAT_MS)
    }, 800)
    return () => { clearTimeout(t); if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [finish])

  const handleClick = useCallback(() => {
    if (!active || done) return
    clickTimesRef.current.push(performance.now())
  }, [active, done])

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center text-sm" style={{ color: 'var(--muted)' }}>
        🥁 {BPM} BPM — Clique sur chaque beat. Sois le plus précis possible.
      </div>

      <button
        onClick={handleClick}
        disabled={done || !active}
        className="w-full rounded-2xl flex flex-col items-center justify-center gap-3 select-none transition-colors"
        style={{
          background: flash ? 'var(--accent)' : 'var(--surface2)',
          height: 240,
          border: `2px solid ${flash ? 'var(--accent)' : 'var(--border)'}`,
          boxShadow: flash ? '0 0 30px var(--accent-glow)' : 'none',
          cursor: done ? 'default' : 'pointer',
          transition: 'background 0.05s, box-shadow 0.05s',
        }}
      >
        {!active && !done && <span style={{ color: 'var(--muted)' }}>Prépare-toi...</span>}
        {active && !done && (
          <>
            <span className="text-5xl font-black" style={{ color: flash ? '#fff' : 'var(--muted)' }}>
              {beat}/{BEATS}
            </span>
            <span className="text-sm" style={{ color: 'var(--muted)' }}>TAP !</span>
          </>
        )}
        {done && (
          <span className="text-xl font-bold" style={{ color: 'var(--success)' }}>
            ✅ Erreur moyenne : {errors.length > 0 ? Math.round(errors.reduce((a, b) => a + b, 0) / errors.length) : '?'}ms
          </span>
        )}
      </button>

      {active && !done && (
        <div className="flex gap-2 justify-center">
          {Array.from({ length: BEATS }).map((_, i) => (
            <div key={i} className="rounded-full transition-colors"
              style={{
                width: 12, height: 12,
                background: i < beat ? 'var(--accent)' : 'var(--surface2)',
                border: '1px solid var(--border)'
              }} />
          ))}
        </div>
      )}

      {done && <p className="text-center text-sm" style={{ color: 'var(--muted)' }}>En attente des autres joueurs...</p>}
    </div>
  )
}
