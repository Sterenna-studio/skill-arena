import Link from 'next/link'
import { GAMES, CATEGORY_LABELS } from '@/lib/games'

export default function HomePage() {
  const available = GAMES.filter(g => g.available)
  const coming = GAMES.filter(g => !g.available)

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="text-center mb-14">
        <h1 className="text-5xl font-bold mb-4 tracking-tight">
          Skill <span style={{ color: 'var(--accent)' }}>Arena</span>
        </h1>
        <p style={{ color: 'var(--muted)' }} className="text-lg">
          Teste tes capacités. Bats tes records. Défie la communauté.
        </p>
      </div>

      <h2 className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--muted)' }}>
        Mini-jeux disponibles
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
        {available.map(game => {
          const inner = (
            <>
              <div className="flex items-center justify-between">
                <span className="text-3xl">{game.icon}</span>
                <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'var(--surface2)', color: 'var(--muted)' }}>
                  {CATEGORY_LABELS[game.category]}
                </span>
              </div>
              <div>
                <div className="font-semibold group-hover:text-[var(--accent)] transition-colors">{game.title}</div>
                <div className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{game.description}</div>
              </div>
              <div className="text-xs mt-auto pt-2" style={{ color: 'var(--accent)', borderTop: '1px solid var(--border)' }}>
                {game.external ? 'Jouer ↗' : `Score en ${game.unit} →`}
              </div>
            </>
          )
          const cls = "card p-5 flex flex-col gap-3 hover:border-[var(--accent)] transition-colors group"
          // Jeux externes (statiques, hors /arena) → <a> brut pour bypass le basePath Next.js
          return game.external ? (
            <a key={game.slug} href={game.external} className={cls}>{inner}</a>
          ) : (
            <Link key={game.slug} href={`/games/${game.slug}`} className={cls}>{inner}</Link>
          )
        })}
      </div>

      <h2 className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--muted)' }}>
        Arcade & Casino
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        {[
          { icon: '🔨', title: 'Whack-a-Mole',  desc: 'Frappe les taupes le plus vite possible.' },
          { icon: '📈', title: 'Crash',          desc: 'Cashout avant que le multiplicateur explose.' },
          { icon: '🎰', title: 'Slot Machine',   desc: 'Tente ta chance sur les rouleaux.' },
          { icon: '🏎️', title: 'Neon Racer',     desc: 'Course en néon — évite les obstacles.' },
        ].map(g => (
          <Link key={g.title} href="/arcade"
            className="card p-5 flex flex-col gap-3 hover:border-[var(--accent)] transition-colors group">
            <span className="text-3xl">{g.icon}</span>
            <div>
              <div className="font-semibold group-hover:text-[var(--accent)] transition-colors">{g.title}</div>
              <div className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{g.desc}</div>
            </div>
          </Link>
        ))}
      </div>

      {coming.length > 0 && (
        <>
          <h2 className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--muted)' }}>
            Prochainement
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-50">
            {coming.map(game => (
              <div key={game.slug} className="card p-5 flex flex-col gap-3 cursor-not-allowed">
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{game.icon}</span>
                  <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'var(--surface2)', color: 'var(--muted)' }}>
                    {CATEGORY_LABELS[game.category]}
                  </span>
                </div>
                <div>
                  <div className="font-semibold">{game.title}</div>
                  <div className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{game.description}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
