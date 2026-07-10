'use client'
import { useState, useRef, useCallback } from 'react'

const TEXTS = [
  "Le soleil se lève à l'est et se couche à l'ouest chaque jour sans exception.",
  "La programmation est l'art de dire à un ordinateur ce qu'il doit faire.",
  "Les étoiles brillent dans le ciel nocturne et guident les navigateurs depuis des siècles.",
  "Chaque erreur est une opportunité d'apprendre quelque chose de nouveau et d'important.",
  "La vitesse de frappe s'améliore avec la pratique régulière et la concentration totale.",
  "Le renard brun rapide saute par-dessus le chien paresseux qui sommeille tranquillement.",
]

export default function TypingGame() {
  const [phase, setPhase] = useState<'idle' | 'playing' | 'done'>('idle')
  const [text, setText] = useState('')
  const [typed, setTyped] = useState('')
  const [startTime, setStartTime] = useState(0)
  const [wpm, setWpm] = useState(0)
  const [accuracy, setAccuracy] = useState(0)
  const [history, setHistory] = useState<{ wpm: number; acc: number }[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const start = useCallback(() => {
    const t = TEXTS[Math.floor(Math.random() * TEXTS.length)]
    setText(t)
    setTyped('')
    setPhase('playing')
    setStartTime(0)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (startTime === 0) setStartTime(performance.now())
    setTyped(val)

    if (val === text) {
      const elapsed = (performance.now() - startTime) / 1000 / 60
      const words = text.trim().split(' ').length
      const calcWpm = Math.round(words / elapsed)
      let correct = 0
      for (let i = 0; i < val.length; i++) if (val[i] === text[i]) correct++
      const acc = Math.round((correct / text.length) * 100)
      setWpm(calcWpm)
      setAccuracy(acc)
      setHistory(prev => [...prev, { wpm: calcWpm, acc }].slice(-10))
      setPhase('done')
    }
  }, [text, startTime])

  const renderText = () => {
    return text.split('').map((char, i) => {
      let color = 'var(--muted)'
      if (i < typed.length) color = typed[i] === char ? 'var(--success)' : 'var(--danger)'
      const cursor = i === typed.length
      return (
        <span key={i} style={{ color, borderBottom: cursor ? '2px solid var(--accent)' : 'none' }}>
          {char}
        </span>
      )
    })
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">⌨️ Typing Speed</h1>
        <p className="mt-2" style={{ color: 'var(--muted)' }}>Recopie le texte le plus vite possible.</p>
      </div>

      {phase === 'idle' && (
        <div className="card p-8 text-center cursor-pointer hover:border-[var(--accent)] transition-colors" onClick={start}>
          <span className="text-xl font-semibold" style={{ color: 'var(--accent)' }}>Clique pour commencer</span>
        </div>
      )}

      {phase === 'playing' && (
        <div className="flex flex-col gap-4">
          <div className="card p-6 text-lg leading-relaxed font-mono tracking-wide">
            {renderText()}
          </div>
          <input
            ref={inputRef}
            value={typed}
            onChange={handleInput}
            className="card px-4 py-3 text-base font-mono outline-none w-full"
            style={{ caretColor: 'var(--accent)', background: 'var(--surface)' }}
            placeholder="Commence à taper..."
            autoComplete="off"
            spellCheck={false}
          />
          <div className="text-sm" style={{ color: 'var(--muted)' }}>
            {typed.length} / {text.length} caractères
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="card p-6 text-center">
              <div className="text-4xl font-bold" style={{ color: 'var(--accent)' }}>{wpm}</div>
              <div className="text-sm mt-1" style={{ color: 'var(--muted)' }}>WPM</div>
            </div>
            <div className="card p-6 text-center">
              <div className="text-4xl font-bold" style={{ color: accuracy >= 90 ? 'var(--success)' : 'var(--warning)' }}>{accuracy}%</div>
              <div className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Précision</div>
            </div>
          </div>
          <button onClick={start} className="px-6 py-2 rounded-lg font-semibold transition-opacity hover:opacity-80"
            style={{ background: 'var(--accent)', color: '#fff' }}>
            Nouveau texte
          </button>
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-6 card p-4">
          <div className="text-xs mb-2" style={{ color: 'var(--muted)' }}>Historique</div>
          <div className="flex gap-2 flex-wrap">
            {history.map((r, i) => (
              <span key={i} className="text-sm px-2 py-1 rounded" style={{ background: 'var(--surface2)' }}>
                {r.wpm} WPM · {r.acc}%
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
