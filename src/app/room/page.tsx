'use client'
import { useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useRoom } from '@/hooks/useRoom'
import RoomLobby from '@/components/room/RoomLobby'
import RoomCountdown from '@/components/room/RoomCountdown'
import RoomResults from '@/components/room/RoomResults'
import ReactionRace from '@/components/games/mp/ReactionRace'
import FakeOut from '@/components/games/mp/FakeOut'
import LastStand from '@/components/games/mp/LastStand'
import RhythmDuel from '@/components/games/mp/RhythmDuel'
import ChainReaction from '@/components/games/mp/ChainReaction'
import CalembourDuel from '@/components/games/mp/CalembourDuel'

const MP_GAMES = [
  { slug: 'reaction-race',   title: 'Reaction Race',   icon: '⚡', desc: 'Le plus rapide gagne' },
  { slug: 'fake-out',        title: 'Fake Out',        icon: '🎭', desc: 'Vert = cliquer, rouge = non' },
  { slug: 'last-stand',      title: 'Last Stand',      icon: '⏳', desc: 'Tiens le plus longtemps' },
  { slug: 'rhythm-duel',     title: 'Rhythm Duel',     icon: '🥁', desc: 'Le plus précis sur le beat' },
  { slug: 'chain-reaction',  title: 'Chain Reaction',  icon: '🔗', desc: 'Séquence de couleurs rapide' },
  { slug: 'calembour-duel',  title: 'Calembour Duel',  icon: '🗣️', desc: 'Plus de virelangues en 30s' },
]

const GAME_COMPONENTS: Record<string, React.ComponentType<{ onScore: (s: number) => void }>> = {
  'reaction-race':  ReactionRace,
  'fake-out':       FakeOut,
  'last-stand':     LastStand,
  'rhythm-duel':    RhythmDuel,
  'chain-reaction': ChainReaction,
  'calembour-duel': CalembourDuel,
}

function randomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

function RoomContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const code = searchParams.get('code')
  const gameSlug = searchParams.get('game') ?? 'reaction-race'
  const [selectedGame, setSelectedGame] = useState('reaction-race')
  const [joinCode, setJoinCode] = useState('')

  const createRoom = useCallback(() => {
    const newCode = randomCode()
    router.push(`/room?code=${newCode}&game=${selectedGame}`)
  }, [router, selectedGame])

  const joinRoom = useCallback(() => {
    const c = joinCode.trim().toUpperCase()
    if (c.length < 4) return
    router.push(`/room?code=${c}&game=${selectedGame}`)
  }, [router, joinCode, selectedGame])

  // Dans une room
  if (code) {
    return <ActiveRoom code={code} gameSlug={gameSlug} />
  }

  // Lobby d'accueil
  return (
    <div className="max-w-xl mx-auto px-6 py-12">
      <div className="mb-10 text-center">
        <p className="section-label" style={{ textAlign: 'center' }}>// DUELS TEMPS RÉEL</p>
        <h1 className="text-4xl font-bold mb-2">🎮 Multijoueur</h1>
        <p style={{ color: 'var(--muted)' }}>Crée ou rejoins une room privée.</p>
      </div>

      <div className="mb-8">
        <div className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>
          Choisir le jeu
        </div>
        <div className="flex flex-col gap-2">
          {MP_GAMES.map(g => (
            <button key={g.slug}
              onClick={() => setSelectedGame(g.slug)}
              className="flex items-center gap-4 p-3 rounded-xl text-left transition-colors"
              style={{
                background: selectedGame === g.slug ? 'var(--surface2)' : 'transparent',
                border: `1px solid ${selectedGame === g.slug ? 'var(--accent)' : 'var(--border)'}`,
              }}>
              <span className="text-2xl">{g.icon}</span>
              <div>
                <div className="font-medium">{g.title}</div>
                <div className="text-xs" style={{ color: 'var(--muted)' }}>{g.desc}</div>
              </div>
              {selectedGame === g.slug && (
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: 'var(--accent)', color: '#fff' }}>✓</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <button onClick={createRoom}
          className="w-full py-4 rounded-xl font-bold text-lg transition-opacity hover:opacity-80"
          style={{ background: 'var(--accent)', color: '#fff' }}>
          ✨ Créer une room
        </button>

        <div className="flex items-center gap-2">
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span className="text-sm" style={{ color: 'var(--muted)' }}>ou rejoindre</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        <div className="flex gap-2">
          <input
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && joinRoom()}
            placeholder="Code de room (ex: TIGER7)"
            maxLength={8}
            className="flex-1 px-4 py-3 rounded-xl font-mono uppercase outline-none"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              letterSpacing: '0.15em',
            }}
          />
          <button onClick={joinRoom}
            disabled={joinCode.length < 4}
            className="px-5 py-3 rounded-xl font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}>
            Rejoindre
          </button>
        </div>
      </div>
    </div>
  )
}

function ActiveRoom({ code, gameSlug }: { code: string; gameSlug: string }) {
  const { room, me, isHost, allReady, setReady, startCountdown, submitScore } = useRoom(code, gameSlug)
  const GameComponent = GAME_COMPONENTS[gameSlug]

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Room <span style={{ color: 'var(--accent)' }}>{code}</span></h1>
        <button
          onClick={() => navigator.clipboard.writeText(window.location.href)}
          className="text-sm px-3 py-1 rounded-lg transition-opacity hover:opacity-70"
          style={{ background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
          Copier le lien
        </button>
      </div>

      {room.phase === 'lobby' && (
        <RoomLobby room={room} me={me} isHost={isHost} allReady={allReady} onReady={setReady} onStart={startCountdown} />
      )}
      {room.phase === 'countdown' && <RoomCountdown countdown={room.countdown} />}
      {room.phase === 'playing' && GameComponent && <GameComponent onScore={submitScore} />}
      {room.phase === 'results' && <RoomResults room={room} me={me} gameSlug={gameSlug} />}
    </div>
  )
}

export default function RoomPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen" style={{ color: 'var(--muted)' }}>Chargement...</div>}>
      <RoomContent />
    </Suspense>
  )
}
