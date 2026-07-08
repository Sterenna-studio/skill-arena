import Link from 'next/link'
import { GAMES, CATEGORY_LABELS } from '@/lib/games'

const FULLGAMES = [
  {
    slug: 'mg-airship',
    title: 'MG Airship',
    desc: 'Pilote ton dirigeable steampunk — abats tes ennemis, collecte des engrenages et améliore ton navire.',
    icon: '🚢',
    tag: 'ARCADE',
    tagColor: '--c-amber',
    external: '/arena/MG_airship.html',
  },
  {
    slug: 'bzh-breach-storm',
    title: 'BZH Breach Storm',
    desc: 'Roguelite de tir top-down — explore des salles procédurales, bats des boss, collecte des fragments de pouvoir.',
    icon: '🌩️',
    tag: 'ROGUELITE',
    tagColor: '--c-cyan',
    external: '/arena/games/bzh-breach-storm/bzh-breach-storm/',
  },
  {
    slug: 'spirit-overdrive',
    title: 'Spirit Overdrive',
    desc: 'Course de garage en vue de dessus — dépasse tes adversaires sur des circuits néon à haute vitesse.',
    icon: '🏎️',
    tag: 'COURSE',
    tagColor: '--c-amber',
    external: '/arena/games/spirit-overdrive/spirit-overdrive/',
  },
  {
    slug: 'bzh-nemeton-lockdown',
    title: 'BZH Nemeton Lockdown',
    desc: 'Infiltration et énigmes dans un sanctuaire celtique sous haute surveillance. Chaque salle est un défi.',
    icon: '🌿',
    tag: 'INFILTRATION',
    tagColor: '--c-primary',
    external: '/arena/games/bzh-nemeton-lockdown/bzh-nemeton-lockdown/',
  },
]

export default function HomePage() {
  const skillGames = GAMES.filter(g => g.available && !g.external)
  const comingGames = GAMES.filter(g => !g.available)

  return (
    <>
      <div className="scanlines" aria-hidden="true" />
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '3rem 1.5rem' }}>

        {/* ── HERO ── */}
        <section style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <p className="section-label">// STERENNA STUDIO · NITRO PLATFORM</p>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(3.5rem, 2rem + 6vw, 7rem)',
            color: 'var(--c-text)',
            letterSpacing: '0.05em',
            marginBottom: '1rem',
          }}>
            SKILL <span style={{ color: 'var(--c-primary)', textShadow: '0 0 20px rgba(57,255,20,0.6)' }}>ARENA</span>
          </h1>
          <p style={{ color: 'var(--c-text-muted)', maxWidth: '52ch', margin: '0 auto', lineHeight: 1.6 }}>
            Hub de jeux Sterenna Studio — teste tes skills, bats tes records, défie la communauté.
          </p>
        </section>

        {/* ── 01 · JEUX COMPLETS ── */}
        <section style={{ marginBottom: '4rem' }}>
          <p className="section-label">// 01 · JEUX COMPLETS</p>
          <h2 className="section-title">Jeux <span>BZH Chronicles</span></h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {FULLGAMES.map(game => (
              <a key={game.slug} href={game.external} style={{ textDecoration: 'none', display: 'block' }}>
                <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '2.5rem' }}>{game.icon}</span>
                    <span style={{
                      fontSize: '0.7rem',
                      fontFamily: 'var(--font-body)',
                      letterSpacing: '0.1em',
                      padding: '0.2rem 0.6rem',
                      border: `1px solid var(${game.tagColor})`,
                      color: `var(${game.tagColor})`,
                      borderRadius: 'var(--radius-sm)',
                    }}>{game.tag}</span>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--c-text)', marginBottom: '0.4rem' }}>
                      {game.title}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--c-text-muted)', lineHeight: 1.5 }}>{game.desc}</div>
                  </div>
                  <div style={{ marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--c-divider)', fontSize: '0.8rem', color: 'var(--c-primary)' }}>
                    JOUER ↗
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>

        <div className="hub-divider" />

        {/* ── 02 · MINI-JEUX SKILL ── */}
        <section style={{ marginBottom: '4rem' }}>
          <p className="section-label">// 02 · MINI-JEUX SKILL</p>
          <h2 className="section-title">Teste tes <span>capacités</span></h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
            {skillGames.map(game => (
              <Link key={game.slug} href={`/games/${game.slug}`} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '2rem' }}>{game.icon}</span>
                    <span style={{
                      fontSize: '0.65rem',
                      fontFamily: 'var(--font-body)',
                      letterSpacing: '0.08em',
                      padding: '0.15rem 0.5rem',
                      background: 'var(--c-surface-2)',
                      color: 'var(--c-text-muted)',
                      borderRadius: 'var(--radius-sm)',
                    }}>{CATEGORY_LABELS[game.category]}</span>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--c-text)', marginBottom: '0.3rem' }}>
                      {game.title}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--c-text-muted)', lineHeight: 1.5 }}>{game.description}</div>
                  </div>
                  <div style={{ marginTop: 'auto', paddingTop: '0.6rem', borderTop: '1px solid var(--c-divider)', fontSize: '0.75rem', color: 'var(--c-primary)' }}>
                    Score en {game.unit} →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <div className="hub-divider" />

        {/* ── 03 · ARCADE & CASINO ── */}
        <section style={{ marginBottom: '4rem' }}>
          <p className="section-label">// 03 · ARCADE & CASINO</p>
          <h2 className="section-title">Star <span>Arcade</span></h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
            {[
              { icon: '🚀', title: 'Titan Rocket Run', desc: 'Cours, saute et va le plus loin possible.', href: '/titan-rocket-run/', tag: 'RUNNER' },
              { icon: '🔨', title: 'Whack-a-Mole',     desc: 'Frappe les taupes le plus vite possible.', href: '/arcade', tag: 'ARCADE' },
              { icon: '📈', title: 'Crash',             desc: 'Cashout avant que le multiplicateur explose.', href: '/arcade', tag: 'CASINO' },
              { icon: '🎰', title: 'Slot Machine',      desc: 'Tente ta chance sur les rouleaux.', href: '/arcade', tag: 'CASINO' },
              { icon: '🏎️', title: 'Neon Racer',       desc: 'Course en néon — évite les obstacles.', href: '/arcade', tag: 'ARCADE' },
            ].map(g => (
              <a key={g.title} href={g.href} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '2rem' }}>{g.icon}</span>
                    <span style={{
                      fontSize: '0.65rem',
                      letterSpacing: '0.08em',
                      padding: '0.15rem 0.5rem',
                      border: '1px solid var(--c-amber)',
                      color: 'var(--c-amber)',
                      borderRadius: 'var(--radius-sm)',
                    }}>{g.tag}</span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--c-text)', marginBottom: '0.3rem' }}>{g.title}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--c-text-muted)' }}>{g.desc}</div>
                  <div style={{ marginTop: 'auto', paddingTop: '0.6rem', borderTop: '1px solid var(--c-divider)', fontSize: '0.75rem', color: 'var(--c-amber)' }}>
                    JOUER →
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>

        <div className="hub-divider" />

        {/* ── 04 · PROCHAINEMENT ── */}
        {comingGames.length > 0 && (
          <section style={{ marginBottom: '4rem', opacity: 0.45 }}>
            <p className="section-label">// 04 · EN DÉVELOPPEMENT</p>
            <h2 className="section-title">Prochainement</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
              {comingGames.map(game => (
                <div key={game.slug} className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', cursor: 'not-allowed' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '2rem' }}>{game.icon}</span>
                    <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', background: 'var(--c-surface-2)', color: 'var(--c-text-muted)', borderRadius: 'var(--radius-sm)' }}>
                      {CATEGORY_LABELS[game.category]}
                    </span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--c-text)' }}>{game.title}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--c-text-muted)' }}>{game.description}</div>
                  <div style={{ marginTop: 'auto', paddingTop: '0.6rem', borderTop: '1px solid var(--c-divider)', fontSize: '0.75rem', color: 'var(--c-text-faint)' }}>BIENTÔT</div>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer style={{ paddingTop: '2rem', borderTop: '1px solid var(--c-divider)', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--c-text-faint)' }}>
          <span>© 2026 STERENNA · Pierre H</span>
          <span>SKILL ARENA · v2.0</span>
        </footer>

      </div>
    </>
  )
}
