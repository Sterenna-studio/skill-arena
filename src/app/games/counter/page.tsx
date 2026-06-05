'use client'
import { useState, useCallback } from 'react'

interface Dot {
  id: number
  x: number
  y: number
  color: string
}

const COLORS = ['var(--accent)', 'var(--success)', 'var(--danger)', 'var(--warning)', '#ec4899', '#06b6d4']

function generateDots(count: number): Dot[] {
  const dots: Dot[] = []
  for (let i = 0; i < count; i++) {
    dots.push({
      id: i,
      x: 5 + Math.random() * 90,
      y: 5 + Math.random() * 90,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    })
  }
  return dots
}

const LEVELS = [
  { min: 5, max: 12 },
  { min: 10, max: 20 },
  { min: 18, max: 35 },
  { min: 30, max: 50 },
]

export default function CounterGame() {
  const [phase, setPhase] = useState<'idle' | 'showing' | 'answering' | 'done'>('idle')
  const [dots, setDots] = useState<Dot[]>([])
  const [answer, setAnswer] = useState('')
  const [correct, setCorrect] = useState(false)
  const [level, setLevel] = useState(0)
  const [score, setScore] = useState(0)
  const [round, setRound] = useState(0)
  const [history, setHistory] = useState<{ score: number; rounds: number }[]>([])
  const [showTime, setShowTime] = useState(2000)

  const startRound = useCallback((lvl: number) => {
    const { min, max } = LEVELS[Math.min(lvl, LEVELS.length - 1)]
    const count = min + Math.floor(Math.random() * (max - min + 1))
    const newDots = generateDots(count)
    setDots(newDots)
    setAnswer('')
    setPhase('showing')
    const time = Math.max(800, 2500 - lvl * 300)
    setShowTime(time)
    setTimeout(() => setPhase('answering'), time)
  }, [])

  const start = useCallback(() => {
    setScore(0)
    setRound(0)
    setLevel(0)
    startRound(0)
  }, [startRound])

  const submit = useCallback(() => {
    const guess = parseInt(answer)
    const isCorrect = guess === dots.length
    setCorrect(isCorrect)
    setPhase('done')
    if (isCorrect) {
      setScore(s => s + 1)
      setLevel(l => Math.min(l + 1, LEVELS.length - 1))
    } else {
      setLevel(0)
    }
    setRound(r => r + 1)
  }, [answer, dots.length])

  const next = useCallback(() => {
    if (round >= 9) {
      setHistory(prev => [...prev, { score, rounds: round + 1 }].slice(-10))
      setPhase('idle')
    } else {
      startRound(level)
    }
  }, [round, score, level, startRound])

  return (
    <div className="max-w-xl mx-auto px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">🔢 Object Counter</h1>
          <p className="mt-1" style={{ color: 'var(--muted)' }}>Compte les points affichés brièvement.</p>
        </div>
        {(phase === 'answering' || phase === 'done') && (
          <div className="text-right text-sm" style={{ color: 'var(--muted)' }}>
            Tour {round + 1}/10 · {score} corrects
          </div>
        )}
      </div>

      {phase === 'idle' && (
        <button onClick={start} className="w-full card p-8 text-center hover:border-[var(--accent)] transition-colors cursor-pointer">
          <span className="text-xl font-semibold" style={{ color: 'var(--accent)' }}>Clique pour commencer</span>
          {history.length > 0 && (
            <div className="text-sm mt-2" style={{ color: 'var(--muted)' }}>
              Meilleur : {Math.max(...history.map(h => h.score))}/10
            </div>
          )}
        </button>
      )}

      {phase === 'showing' && (
        <div className="relative rounded-xl overflow-hidden"
          style={{ height: 300, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
          {dots.map(d => (
            <div key={d.id} style={{
              position: 'absolute',
              left: `${d.x}%`,
              top: `${d.y}%`,
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: d.color,
              transform: 'translate(-50%, -50%)',
            }} />
          ))}
        </div>
      )}

      {phase === 'answering' && (
        <div className="flex flex-col gap-4">
          <div className="card p-6 text-center" style={{ height: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <div style={{ color: 'var(--muted)' }}>Combien de points as-tu vus ?</div>
            <input
              autoFocus
              type="number"
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && answer && submit()}
              className="text-center text-3xl font-bold outline-none rounded-lg px-4 py-2 w-32"
              style={{ background: 'var(--surface2)', border: '2px solid var(--accent)', color: 'var(--text)' }}
            />
            <button onClick={submit} disabled={!answer}
              className="px-8 py-2 rounded-lg font-semibold disabled:opacity-40 transition-opacity hover:opacity-80"
              style={{ background: 'var(--accent)', color: '#fff' }}>
              Valider
            </button>
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div className="card p-8 text-center flex flex-col gap-4" style={{ height: 300, justifyContent: 'center' }}>
          <div className="text-5xl">{correct ? '✅' : '❌'}</div>
          <div className="text-xl font-bold" style={{ color: correct ? 'var(--success)' : 'var(--danger)' }}>
            {correct ? 'Correct !' : `Raté — c'était ${dots.length}`}
          </div>
          <div style={{ color: 'var(--muted)' }} className="text-sm">
            {correct ? `Niveau monté → niveau ${Math.min(level, LEVELS.length - 1) + 1}` : 'Retour au niveau 1'}
          </div>
          <button onClick={next} className="px-6 py-2 rounded-lg font-semibold transition-opacity hover:opacity-80 mt-2"
            style={{ background: 'var(--accent)', color: '#fff' }}>
            {round >= 9 ? 'Voir les résultats' : 'Prochain tour'}
          </button>
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-6 card p-4">
          <div className="text-xs mb-2" style={{ color: 'var(--muted)' }}>Historique</div>
          <div className="flex gap-2 flex-wrap">
            {history.map((r, i) => (
              <span key={i} className="text-sm px-2 py-1 rounded" style={{ background: 'var(--surface2)' }}>
                {r.score}/{r.rounds}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
