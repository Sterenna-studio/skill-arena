import Link from 'next/link'
import { GAMES, CATEGORY_LABELS } from '@/lib/games'

const FULLGAMES = [
  {
    slug: 'dungeon-elf-sound',
    title: 'Dungeon Elf',
    desc: 'Action-RPG rétro — charge tes sorts, améliore ton équipement en boutique et enchaîne entraînements et chasses pour faire progresser ton mage. 3 versions jouables, sélecteur en jeu.',
    icon: '🧝',
    tag: 'ACTION RPG',
    tagColor: '--c-purple',
    external: '/arena/games/dungeon-elf-sound/',
  },
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
    external: '/arena/games/bzh-breach-storm/',
  },
  {
    slug: 'spirit-overdrive',
    title: 'Spirit Overdrive',
    desc: 'Course de garage en vue de dessus — dépasse tes adversaires sur des circuits néon à haute vitesse.',
    icon: '🏎️',
    tag: 'COURSE',
    tagColor: '--c-amber',
    external: '/arena/games/spirit-overdrive/',
  },
  {
    slug: 'bzh-nemeton-lockdown',
    title: 'BZH Nemeton Lockdown',
    desc: 'Infiltration et énigmes dans un sanctuaire celtique sous haute surveillance. Chaque salle est un défi.',
    icon: '🌿',
    tag: 'INFILTRATION',
    tagColor: '--c-primary',
    external: '/arena/games/bzh-nemeton-lockdown/',
  },
  {
    slug: 'lab-garden',
    title: 'Gold Garden Pro',
    desc: 'Farming cyberpunk — cultive tes graines, débloque des dimensions et récolte des fortunes.',
    icon: '🌱',
    tag: 'FARMING',
    tagColor: '--c-primary',
    external: '/arena/games/lab-garden/',
  },
  {
    slug: 'lab-roguelite',
    title: 'Cyber Cellules v3',
    desc: 'Roguelite cyberpunk — élimine des vagues d\'ennemis, récolte de l\'XP et affronte des boss.',
    icon: '🤖',
    tag: 'ROGUELITE',
    tagColor: '--c-cyan',
    external: '/arena/games/lab-roguelite/',
  },
  {
    slug: 'magnet-maze',
    title: 'Magnet Maze',
    desc: 'Coopération à deux écrans — guide l\'aimant pour révéler le fragment et ouvrir la sortie.',
    icon: '🧲',
    tag: 'COOP',
    tagColor: '--c-amber',
    external: '/arena/games/magnet-maze/',
  },
  {
    slug: 'escape-game-manager',
    title: 'Escape Game Manager',
    desc: 'Gère un escape game en temps réel — accueille les groupes, arbitre les salles, chouchoute la satisfaction et investis dans la boutique.',
    icon: '🗝️',
    tag: 'GESTION',
    tagColor: '--c-amber',
    external: '/arena/games/escape-game-manager/',
  },
  {
    slug: 'sniky',
    title: 'Sniky',
    desc: 'Infiltration biopunk en vue du dessus — repère les cônes de vision des drones, dash entre les patrouilles et vole un maximum de fragments.',
    icon: '🥷',
    tag: 'INFILTRATION',
    tagColor: '--c-purple',
    external: '/arena/games/sniky/',
  },
  {
    slug: 'tank-protocol',
    title: 'Tank Protocol',
    desc: 'Shooter de vagues — pilote ton tank, encaisse les assauts de drones et enchaîne les rounds au clavier ou à la manette.',
    icon: '🛡️',
    tag: 'SHOOTER',
    tagColor: '--c-red',
    external: '/arena/games/tank-protocol/',
  },
]

export default function HomePage() {
  const skillGames = GAMES.filter(g => g.available && !g.external)
  const comingGames = GAMES.filter(g => !g.available)
  const totalGames = FULLGAMES.length + skillGames.length + 5

  return (
    <>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* ── HERO / RETROSPACE DASHBOARD ── */}
        <section style={{ marginBottom: '3.5rem' }}>
          <div className="panel" style={{ padding: 'clamp(1.5rem, 1rem + 2vw, 2.75rem)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '2rem', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 380px' }}>
                <p className="section-label">// STERENNA STUDIO · NITRO PLATFORM</p>
                <h1 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(3rem, 1.6rem + 6vw, 6.5rem)',
                  color: 'var(--c-text)',
                  letterSpacing: '0.05em',
                  marginBottom: '0.75rem',
                }}>
                  SKILL <span style={{ color: 'var(--c-primary)', textShadow: '0 0 16px rgba(255,79,216,0.55), 0 0 34px rgba(41,227,255,0.20)' }}>ARENA</span>
                </h1>
                <p style={{ color: 'var(--c-text-muted)', maxWidth: '52ch', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                  Hub de jeux Sterenna Studio — teste tes skills, bats tes records, défie la communauté.
                </p>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <span className="pill"><span className="led on" /> SYSTEM ONLINE</span>
                  <span className="pill">NODE <b style={{ color: 'var(--c-text)', marginLeft: 4 }}>SKILL-ARENA</b></span>
                  <span className="pill">JEUX <b style={{ color: 'var(--c-cyan)', marginLeft: 4 }}>{totalGames}</b></span>
                </div>
              </div>
              <div className="orb hero-orb" aria-hidden="true" />
            </div>
          </div>
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
