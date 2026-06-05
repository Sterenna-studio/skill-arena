'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navbar() {
  const path = usePathname()

  return (
    <nav style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
         className="flex items-center justify-between px-6 py-4">
      <Link href="/" className="text-xl font-bold tracking-tight" style={{ color: 'var(--accent)' }}>
        ⚔️ Skill Arena
      </Link>
      <div className="flex gap-6 text-sm" style={{ color: 'var(--muted)' }}>
        <Link href="/" className={path === '/' ? 'text-white font-medium' : 'hover:text-white transition-colors'}>
          Accueil
        </Link>
        <Link href="/leaderboard" className={path === '/leaderboard' ? 'text-white font-medium' : 'hover:text-white transition-colors'}>
          Classement
        </Link>
      </div>
    </nav>
  )
}
