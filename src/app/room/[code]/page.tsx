'use client'
import { use } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRoom } from '@/hooks/useRoom'
import RoomLobby from '@/components/room/RoomLobby'
import RoomCountdown from '@/components/room/RoomCountdown'
import RoomResults from '@/components/room/RoomResults'
import ReactionRace from '@/components/games/mp/ReactionRace'
import FakeOut from '@/components/games/mp/FakeOut'
import LastStand from '@/components/games/mp/LastStand'
import RhythmDuel from '@/components/games/mp/RhythmDuel'
import ChainReaction from '@/components/games/mp/ChainReaction'

const GAME_COMPONENTS: Record<string, React.ComponentType<{ onScore: (s: number) => void }>> = {
  'reaction-race': ReactionRace,
  'fake-out': FakeOut,
  'last-stand': LastStand,
  'rhythm-duel': RhythmDuel,
  'chain-reaction': ChainReaction,
}

export default function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const searchParams = useSearchParams()
  const gameSlug = searchParams.get('game') ?? 'reaction-race'

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
        <RoomLobby
          room={room}
          me={me}
          isHost={isHost}
          allReady={allReady}
          onReady={setReady}
          onStart={startCountdown}
        />
      )}

      {room.phase === 'countdown' && <RoomCountdown countdown={room.countdown} />}

      {room.phase === 'playing' && GameComponent && (
        <GameComponent onScore={submitScore} />
      )}

      {room.phase === 'results' && (
        <RoomResults room={room} me={me} gameSlug={gameSlug} />
      )}
    </div>
  )
}
