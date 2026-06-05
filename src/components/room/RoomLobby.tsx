import type { RoomState, PlayerState } from '@/hooks/useRoom'

interface Props {
  room: RoomState
  me: PlayerState | null
  isHost: boolean
  allReady: boolean
  onReady: () => void
  onStart: () => void
}

export default function RoomLobby({ room, me, isHost, allReady, onReady, onStart }: Props) {
  const players = Object.values(room.players)
  const meReady = me ? room.players[me.id]?.ready : false

  return (
    <div className="flex flex-col gap-6">
      <div className="card p-6">
        <div className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
          Joueurs ({players.length}/8)
        </div>
        <div className="flex flex-col gap-3">
          {players.map(p => (
            <div key={p.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{p.id === room.hostId ? '👑' : '🎮'}</span>
                <span className="font-medium">{p.name}</span>
                {p.id === me?.id && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--surface2)', color: 'var(--muted)' }}>
                    toi
                  </span>
                )}
              </div>
              <span style={{ color: p.ready ? 'var(--success)' : 'var(--muted)' }} className="text-sm font-medium">
                {p.ready ? '✓ Prêt' : 'En attente...'}
              </span>
            </div>
          ))}
          {players.length < 2 && (
            <div className="text-sm text-center py-4" style={{ color: 'var(--muted)', borderTop: '1px solid var(--border)', marginTop: 8 }}>
              En attente d'un autre joueur...
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        {!meReady && (
          <button onClick={onReady}
            className="flex-1 py-3 rounded-xl font-semibold transition-opacity hover:opacity-80"
            style={{ background: 'var(--surface2)', border: '1px solid var(--accent)', color: 'var(--accent)' }}>
            Je suis prêt
          </button>
        )}
        {isHost && allReady && (
          <button onClick={onStart}
            className="flex-1 py-3 rounded-xl font-semibold transition-opacity hover:opacity-80"
            style={{ background: 'var(--accent)', color: '#fff' }}>
            Lancer la partie ⚡
          </button>
        )}
        {isHost && !allReady && players.length >= 2 && (
          <div className="flex-1 py-3 text-center text-sm" style={{ color: 'var(--muted)' }}>
            Attends que tout le monde soit prêt
          </div>
        )}
      </div>
    </div>
  )
}
