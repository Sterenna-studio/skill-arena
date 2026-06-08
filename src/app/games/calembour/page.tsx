'use client'
import { useState, useRef, useEffect, useCallback } from 'react'

// ── Web Speech API — typage minimal (non couvert par les lib DOM standard) ──────
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
  const w = window as unknown as {
    SpeechRecognition?: SRConstructor
    webkitSpeechRecognition?: SRConstructor
  }
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

// ── Virelangues (à dire sans erreur) ────────────────────────────────────────────
const PHRASES = [
  'Les chaussettes de l\'archiduchesse sont-elles sèches, archi-sèches ?',
  'Un chasseur sachant chasser doit savoir chasser sans son chien.',
  'Trois tortues trottaient sur un trottoir très étroit.',
  'Je veux et j\'exige d\'exquises excuses.',
  'Cinq chiens chassent six chats.',
  'Le ver vert va vers le verre vert.',
  'Natacha n\'attacha pas son chat Pacha qui s\'échappa.',
  'Ton thé t\'a-t-il ôté ta toux ?',
  'Suis-je bien chez ce cher Serge ?',
  'La pie niche haut, l\'oie niche bas.',
  'Fruits frais, fruits frits, fruits cuits, fruits crus.',
  'Si six scies scient six cyprès, six cents scies scient six cents cyprès.',
  'Didon dîna du dos d\'un dodu dindon.',
  'Six souris sous six lits sourient sans souci.',
  'Piano ne se range pas dans le panier de Papa.',
  'Tonton, ton thé t\'a-t-il ôté ta toux ?',
  'Un dragon gradé dégrade un gradé dragon.',
  'Seize chaises sèchent.',
  'Que lit Lili sous ces lilas-là ?',
  'Blé bouilli, bouillie de blé bien bouillie.',
]

const DURATION = 60
const MATCH_THRESHOLD = 0.85 // tolérance au bruit de reconnaissance

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '') // retire accents (propriété Unicode)
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Précision mot à mot (0–1) entre la cible et la transcription
function wordAccuracy(target: string, heard: string): number {
  const tw = normalize(target).split(' ').filter(Boolean)
  const hw = normalize(heard).split(' ').filter(Boolean)
  if (tw.length === 0) return 0
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

function getBest(): number {
  if (typeof window === 'undefined') return 0
  return Number(localStorage.getItem('calembour_best') ?? 0)
}
function setBest(val: number) {
  if (typeof window === 'undefined') return
  if (val > getBest()) localStorage.setItem('calembour_best', String(val))
}

type Phase = 'idle' | 'playing' | 'done'

export default function CalembourGame() {
  const [supported, setSupported] = useState<boolean | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [deck, setDeck] = useState<string[]>([])
  const [deckIdx, setDeckIdx] = useState(0)
  const [timeLeft, setTimeLeft] = useState(DURATION)
  const [score, setScore] = useState(0)
  const [listening, setListening] = useState(false)
  const [heard, setHeard] = useState('')
  const [feedback, setFeedback] = useState<'ok' | 'ko' | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [lastRecord, setLastRecord] = useState(false)

  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const scoreRef = useRef(0)

  // Détection capacité navigateur au montage (client uniquement). setState en
  // effect volontaire : évite un mismatch d'hydratation (le serveur statique
  // rend `supported = null`, le client résout après montage).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(getSR() !== null)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      try { recRef.current?.abort() } catch { /* noop */ }
    }
  }, [])

  const currentPhrase = deck[deckIdx % Math.max(1, deck.length)] ?? ''

  const endGame = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    try { recRef.current?.abort() } catch { /* noop */ }
    setListening(false)
    setLastRecord(scoreRef.current > getBest())
    setBest(scoreRef.current)
    setPhase('done')
  }, [])

  const start = useCallback(() => {
    if (getSR() === null) { setSupported(false); return }
    const d = shuffle(PHRASES)
    setDeck(d)
    setDeckIdx(0)
    setScore(0)
    scoreRef.current = 0
    setHeard('')
    setFeedback(null)
    setErrorMsg('')
    setTimeLeft(DURATION)
    setPhase('playing')
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { endGame(); return 0 }
        return t - 1
      })
    }, 1000)
  }, [endGame])

  const nextPhrase = useCallback(() => {
    setHeard('')
    setFeedback(null)
    setDeckIdx(i => i + 1)
  }, [])

  const listen = useCallback(() => {
    const SR = getSR()
    if (!SR || phase !== 'playing' || listening) return
    const rec = new SR()
    recRef.current = rec
    rec.lang = 'fr-FR'
    rec.continuous = false
    rec.interimResults = false
    rec.maxAlternatives = 4
    setHeard('')
    setFeedback(null)
    setErrorMsg('')

    rec.onresult = (e: SpeechRecognitionEventLike) => {
      const target = deck[deckIdx % Math.max(1, deck.length)] ?? ''
      let bestAcc = 0
      let bestTxt = ''
      const alts = e.results[0]
      for (let i = 0; i < alts.length; i++) {
        const txt = alts[i].transcript
        const acc = wordAccuracy(target, txt)
        if (acc > bestAcc) { bestAcc = acc; bestTxt = txt }
      }
      setHeard(bestTxt)
      if (bestAcc >= MATCH_THRESHOLD) {
        setFeedback('ok')
        setScore(s => { scoreRef.current = s + 1; return s + 1 })
        setTimeout(() => nextPhrase(), 700)
      } else {
        setFeedback('ko')
      }
    }
    rec.onerror = (e: { error: string }) => {
      setListening(false)
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setErrorMsg('Micro refusé. Autorise le microphone pour jouer.')
      } else if (e.error === 'no-speech') {
        setErrorMsg('Rien entendu — réessaie.')
      }
    }
    rec.onend = () => setListening(false)

    try {
      rec.start()
      setListening(true)
    } catch {
      setListening(false)
    }
  }, [phase, listening, deck, deckIdx, nextPhrase])

  // ── Rendu ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">🗣️ Calembour Vocal</h1>
        <p className="mt-2" style={{ color: 'var(--muted)' }}>
          Lis le virelangue à voix haute, sans erreur. Le micro valide ta diction.
        </p>
      </div>

      {supported === false && (
        <div className="card p-8 text-center">
          <div className="text-lg font-semibold" style={{ color: 'var(--danger)' }}>
            Navigateur non supporté
          </div>
          <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
            La reconnaissance vocale nécessite <b>Chrome</b> ou <b>Edge</b> (bureau ou Android).
            Safari et Firefox ne sont pas compatibles.
          </p>
        </div>
      )}

      {supported && phase === 'idle' && (
        <div
          className="card p-8 text-center cursor-pointer hover:border-[var(--accent)] transition-colors"
          onClick={start}
        >
          <span className="text-xl font-semibold" style={{ color: 'var(--accent)' }}>
            Clique pour commencer
          </span>
          <p className="mt-3 text-sm" style={{ color: 'var(--muted)' }}>
            {DURATION}s pour réussir un max de phrases. Le micro sera demandé.
          </p>
          {getBest() > 0 && (
            <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
              Record : <b style={{ color: 'var(--accent)' }}>{getBest()}</b> phrases
            </p>
          )}
        </div>
      )}

      {supported && phase === 'playing' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between text-sm" style={{ color: 'var(--muted)' }}>
            <span>⏱️ {timeLeft}s</span>
            <span>✅ {score} phrase{score > 1 ? 's' : ''}</span>
          </div>

          <div
            className="card p-6 text-xl leading-relaxed text-center font-semibold"
            style={{
              borderColor:
                feedback === 'ok' ? 'var(--success)'
                : feedback === 'ko' ? 'var(--danger)'
                : undefined,
            }}
          >
            {currentPhrase}
          </div>

          <button
            onClick={listen}
            disabled={listening}
            className="px-6 py-4 rounded-lg font-semibold transition-opacity hover:opacity-80 disabled:opacity-60"
            style={{ background: listening ? 'var(--danger)' : 'var(--accent)', color: '#fff' }}
          >
            {listening ? '🎙️ Écoute… parle maintenant' : '🎤 Appuie et lis la phrase'}
          </button>

          {heard && (
            <div className="card p-3 text-sm text-center">
              <span style={{ color: 'var(--muted)' }}>Entendu : </span>
              <span style={{ color: feedback === 'ok' ? 'var(--success)' : 'var(--danger)' }}>
                « {heard} »
              </span>
            </div>
          )}
          {feedback === 'ok' && (
            <div className="text-center text-sm" style={{ color: 'var(--success)' }}>Parfait ! ✅</div>
          )}
          {feedback === 'ko' && (
            <div className="flex gap-2 justify-center">
              <button onClick={listen} className="px-4 py-2 rounded-lg text-sm font-semibold"
                style={{ background: 'var(--surface2)' }}>
                🔁 Réessayer
              </button>
              <button onClick={nextPhrase} className="px-4 py-2 rounded-lg text-sm"
                style={{ background: 'var(--surface2)', color: 'var(--muted)' }}>
                ⏭️ Passer
              </button>
            </div>
          )}
          {errorMsg && (
            <div className="text-center text-sm" style={{ color: 'var(--warning)' }}>{errorMsg}</div>
          )}
        </div>
      )}

      {supported && phase === 'done' && (
        <div className="flex flex-col gap-4">
          <div className="card p-8 text-center">
            <div className="text-5xl font-bold" style={{ color: 'var(--accent)' }}>{score}</div>
            <div className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
              phrase{score > 1 ? 's' : ''} réussie{score > 1 ? 's' : ''} en {DURATION}s
            </div>
            {lastRecord && score > 0 && (
              <div className="mt-2 text-sm font-semibold" style={{ color: 'var(--success)' }}>
                🏆 Nouveau record !
              </div>
            )}
            <div className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
              Record : <b style={{ color: 'var(--accent)' }}>{getBest()}</b>
            </div>
          </div>
          <button onClick={start} className="px-6 py-2 rounded-lg font-semibold transition-opacity hover:opacity-80"
            style={{ background: 'var(--accent)', color: '#fff' }}>
            Rejouer
          </button>
        </div>
      )}
    </div>
  )
}
