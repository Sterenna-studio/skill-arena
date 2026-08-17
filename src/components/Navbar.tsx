'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/',           label: 'Accueil',     match: (p: string) => p === '/' },
  { href: '/room',       label: 'Multijoueur', match: (p: string) => p.startsWith('/room') },
  { href: '/leaderboard',label: 'Classement',  match: (p: string) => p === '/leaderboard' },
  { href: '/arcade',     label: 'Arcade',      match: (p: string) => p.startsWith('/arcade') },
]

export default function Navbar() {
  const path = usePathname()

  return (
    <nav
      className="flex items-center justify-between px-6 py-3 sticky top-0"
      style={{
        background: 'rgba(16, 10, 28, 0.72)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--border)',
        boxShadow: '0 1px 0 rgba(255,79,216,0.08), 0 12px 30px rgba(0,0,0,0.35)',
        zIndex: 20,
      }}
    >
      <Link
        href="/"
        className="font-display text-2xl tracking-widest"
        style={{
          fontFamily: 'var(--font-display)',
          color: 'var(--c-text)',
          letterSpacing: '0.08em',
          textShadow: '0 0 14px rgba(255,79,216,0.45), 0 0 26px rgba(41,227,255,0.20)',
        }}
      >
        ⚔️ SKILL <span style={{ color: 'var(--c-primary)' }}>ARENA</span>
      </Link>

      <div className="flex gap-1 text-xs">
        {LINKS.map(link => {
          const active = link.match(path)
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
              style={{
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: active ? 'var(--c-text)' : 'var(--c-text-muted)',
                background: active ? 'rgba(255,79,216,0.08)' : 'transparent',
                border: `1px solid ${active ? 'rgba(255,79,216,0.28)' : 'transparent'}`,
              }}
            >
              <span className={`led${active ? ' pink' : ''}`} style={!active ? { opacity: 0.35 } : undefined} />
              {link.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
