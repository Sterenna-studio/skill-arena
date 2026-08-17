import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'

export const metadata: Metadata = {
  title: 'Skill Arena',
  description: 'Teste tes capacités. Bats tes records. Défie la communauté.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <div className="starfield" aria-hidden="true" />
        <div className="scanlines" aria-hidden="true" />
        <Navbar />
        <main className="flex-1" style={{ position: 'relative', zIndex: 1 }}>{children}</main>
      </body>
    </html>
  )
}
