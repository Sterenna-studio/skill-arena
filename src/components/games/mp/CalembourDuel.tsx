'use client'
import { useState, useRef, useEffect, useCallback } from 'react'

// ── Web Speech API — minimal types ───────────────────────────────────────────
interface SpeechAlt { transcript: string }
interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<SpeechAlt>>
}
interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((e: SpeechRecognitionEventLike) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}
type SRConstructor = new () => SpeechRecognitionLike

function getSR(): SRConstructor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: SRConstructor; webkitSpeechRecognition?: SRConstructor }
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

// ── Phrases ──────────────────────────────────────────────────────────────────
const PHRASES = [
  'Cinq chiens chassent six chats.',
  'Le ver vert va vers le verre vert.',
  'Ton thé t\'a-t-il ôté ta toux ?',
  'Suis-je bien chez ce cher Serge ?',
  'La pie niche haut, l\'oie niche bas.',
  'Seize chaises sèchent.',
  'Que lit Lili sous ces lilas-là ?',
  'Didon dîna du dos d\'un dodu dindon.',
  'Trois tortues trottaient sur un trottoir très étroit.',
  'Natacha n\'attacha pas son chat Pacha.',
  'Je veux et j\'exige d\'exquises excuses.',
  'Fruits frais, fruits frits, fruits cuis.',
  'Un dragon gradé dégrade un gradé dragon.',
  'Blé bouilli, bouillie de blé bien bouillie.',
  'Piano ne se range pas dans le panier de Papa.',
]

const DURATION = 30 // secondes — plus court pour le duel
const THRESHOLD = 0.80

function normalize(s: string) {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ').trim()
}

function wordAccuracy(target: string, heard: string): number {
  const tw = normalize(target).split(' ').filter(Boolean)
  const hw = normalize(heard).split(' ').filter(Boolean)
  if (!tw.length) return 0
  const pool = [...hw]
  let hit = 0
  for (const w of tw) {
    const idx = pool.indexOf(w)
    if (idx !== -1) { hit++; pool.splice(idx, 1) }
  }
  return hit / tw.length
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── Component ─────────────────────────────────────────────────────────────────
interface Props { onScore: (s: number) => void }

export default function CalembourDuel({ onScore }: Props) {
  const [supported] = useState(() => getSR() !== null)
  const [deck] = useState(() => shuffle(PHRASES))
  const [deckIdx, setDeckIdx] = useState(0)
  const [timeLeft, setTimeLeft] = useState(DURATION)
  const [score, setScore] = useState(0)
  const [listening, setListening] = useState(false)
  const [heard, setHeard] = useState('')
  const [flash, setFlash] = useState<'ok' | null>(null)
  const [done, setDone] = useState(false)
  const [micError, setMicError] = useState('')

  const scoreRef = useRef(0)
  const doneRef = useRef(false)
  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const deckIdxRef = useRef(0)
  const deckRef = useRef(deck)
  const startListenRef = useRef<() => void>(() => {})

  const stopRec = useCallback(() => {
    try { recRef.current?.abort() } catch { /* noop */ }
    recRef.current = null
    setListening(false)
  }, [])

  const endGame = useCallback(() => {
    doneRef.current = true
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    stopRec()
    setDone(true)
    onScore(scoreRef.current)
  }, [onScore, stopRec])

  // boucle d'écoute — se redémarre après chaque résultat ou erreur
  const startListen = useCallback(() => {
    const SR = getSR()
    if (!SR || doneRef.current) return
    const rec = new SR()
    recRef.current = rec
    rec.lang = 'fr-FR'
    rec.continuous = false
    rec.interimResults = false
    rec.maxAlternatives = 4
    setMicError('')

    rec.onresult = (e: SpeechRecognitionEventLike) => {
      if (doneRef.current) return
      const currentPhrase = deckRef.current[deckIdxRef.current % deckRef.current.length]
      let bestAcc = 0; let bestTxt = ''
      const alts = e.results[0]
      for (let i = 0; i < alts.length; i++) {
        const txt = alts[i].transcript
        const acc = wordAccuracy(currentPhrase, txt)
        if (acc > bestAcc) { bestAcc = acc; bestTxt = txt }
      }
      setHeard(bestTxt)
      if (bestAcc >= THRESHOLD) {
        scoreRef.current++
        setScore(scoreRef.current)
        setFlash('ok')
        setTimeout(() => setFlash(null), 500)
        deckIdxRef.current++
        setDeckIdx(deckIdxRef.current)
        setHeard('')
      }
    }

    rec.onerror = (e: { error: string }) => {
      setListening(false)
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setMicError('Micro refusé.')
        doneRef.current = true
        return
      }
      // no-speech ou autre : on relance
      if (!doneRef.current) setTimeout(() => startListenRef.current(), 150)
    }

    rec.onend = () => {
      setListening(false)
      if (!doneRef.current) setTimeout(() => startListenRef.current(), 100)
    }

    try { rec.start(); setListening(true) } catch { /* noop */ }
  }, [])
  useEffect(() => { startListenRef.current = startListen }, [startListen])

  // Démarrage auto au mount
  useEffect(() => {
    if (!supported) return

    // Timer
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { endGame(); return 0 }
        return t - 1
      })
    }, 1000)

    // Micro — déféré (pas d'appel setState synchrone dans le corps de l'effet)
    queueMicrotask(() => startListenRef.current())

    return () => {
      doneRef.current = true
      if (timerRef.current) clearInterval(timerRef.current)
      stopRec()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const currentPhrase = deck[deckIdx % deck.length]
  const progress = ((DURATION - timeLeft) / DURATION) * 100

  if (!supported) {
    return (
      <div className="card p-8 text-center">
        <p className="font-semibold" style={{ color: 'var(--danger)' }}>Navigateur non supporté</p>
        <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>
          Calembour nécessite Chrome ou Edge. Score : 0.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* HUD */}
      <div className="flex items-center justify-between text-sm" style={{ color: 'var(--muted)' }}>
        <span>🗣️ Lis la phrase à voix haute</span>
        <span style={{ color: timeLeft <= 8 ? 'var(--danger)' : 'inherit', fontWeight: timeLeft <= 8 ? 700 : 400 }}>
          ⏱️ {timeLeft}s
        </span>
      </div>

      {/* Barre de progression */}
      <div style={{ height: 4, background: 'var(--surface2)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 2,
          background: timeLeft <= 8 ? 'var(--danger)' : 'var(--accent)',
          width: `${progress}%`,
          transition: 'width 1s linear, background 0.3s',
        }} />
      </div>

      {/* Phrase */}
      <div
        className="card p-6 text-xl leading-relaxed text-center font-semibold select-none"
        style={{
          borderColor: flash === 'ok' ? 'var(--success)' : done ? 'var(--border)' : undefined,
          transition: 'border-color 0.2s',
          minHeight: 120,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {done ? (
          <span style={{ color: 'var(--accent)' }}>✅ {score} phrase{score > 1 ? 's' : ''} !</span>
        ) : flash === 'ok' ? (
          <span style={{ color: 'var(--success)', fontSize: '2rem' }}>✓</span>
        ) : currentPhrase}
      </div>

      {/* Micro + transcript */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm" style={{ color: listening ? 'var(--success)' : 'var(--muted)' }}>
          <span style={{ fontSize: '1.1rem' }}>🎙️</span>
          <span>{micError || (done ? 'Terminé' : listening ? 'Écoute…' : 'Rechargement…')}</span>
        </div>
        <div className="text-sm font-bold" style={{ color: 'var(--accent)' }}>
          ✅ {score}
        </div>
      </div>

      {heard && !done && (
        <div className="text-xs text-center" style={{ color: 'var(--muted)' }}>
          Entendu : « {heard} »
        </div>
      )}

      {done && (
        <p className="text-center text-sm" style={{ color: 'var(--muted)' }}>
          En attente des autres joueurs…
        </p>
      )}
    </div>
  )
}
