export default function ArcadePage() {
  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 60px)' }}>
      <div className="marquee-bar" style={{ margin: '0.75rem 1.25rem', flex: '0 0 auto' }}>
        <span className="led cyan" />
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', letterSpacing: '0.08em', color: 'var(--c-text)' }}>
          STAR ARCADE
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '0.7rem', letterSpacing: '0.06em', color: 'var(--c-text-faint)' }}>
          WHACK-A-MOLE · CRASH · SLOTS · NEON RACER
        </span>
      </div>
      <iframe
        src="/arena/arcade-casino/"
        style={{ width: '100%', flex: '1 1 auto', border: 'none', display: 'block' }}
        title="Star Arcade"
        allow="fullscreen"
      />
    </div>
  )
}
