import type { RoomState, PlayerState } from '@/hooks/useRoom'
import Link from 'next/link'

interface Props {
  room: RoomState
  me: PlayerState | null
  gameSlug: string
}

const GAME_LABELS: Record<string, { unit: string; higherIsBetter: boolean }> = {
  'reaction-race': { unit: 'ms', higherIsBetter: false },
  'fake-out':      { unit: 'ms', higherIsBetter: false },
  'last-stand':    { unit: 'ms', higherIsBetter: true  },
  'rhythm-duel':   { unit: 'ms écart', higherIsBetter: false },
  'chain-reaction':{ unit: 'ms', higherIsBetter: false },
}

const MEDALS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣']

export default function RoomResults({ room, me, gameSlug }: Props) {
  const meta = GAME_LABELS[gameSlug] ?? { unit: 'pts', higherIsBetter: true }
  const players = Object.values(room.players)

  const sorted = [...players].sort((a, b) => {
    if (a.score === null) return 1
    if (b.score === null) return -1
    return meta.higherIsBetter ? b.score - a.score : a.score - b.score
  })

  const winner = sorted[0]
  const iWon = winner?.id === me?.id

  return (
    <div className="flex flex-col gap-6">
      <div className="card p-8 text-center">
        <div className="text-5xl mb-3">{iWon ? '🏆' : '💀'}</div>
        <div className="text-2xl font-bold" style={{ color: iWon ? 'var(--success)' : 'var(--danger)' }}>
          {iWon ? 'Tu as gagné !' : `${winner?.name ?? '???'} a gagné`}
        </div>
      </div>

      <div className="card p-4 flex flex-col gap-2">
        <div className="text-sm mb-2" style={{ color: 'var(--muted)' }}>Classement final</div>
        {sorted.map((p, i) => (
          <div key={p.id} className="flex items-center justify-between py-2"
               style={{ borderBottom: i < sorted.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div className="flex items-center gap-3">
              <span className="text-xl">{MEDALS[i]}</span>
              <span className="font-medium">{p.name}</span>
              {p.id === me?.id && (
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--surface2)', color: 'var(--muted)' }}>toi</span>
              )}
            </div>
            <span className="font-bold tabular-nums" style={{ color: 'var(--accent)' }}>
              {p.score !== null ? `${p.score} ${meta.unit}` : '—'}
            </span>
          </div>
        ))}
      </div>

      <Link href="/"
        className="py-3 rounded-xl font-semibold text-center transition-opacity hover:opacity-80"
        style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}>
        ← Retour à l'accueil
      </Link>
    </div>
  )
}
