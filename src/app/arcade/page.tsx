export default function ArcadePage() {
  return (
    <div style={{ height: 'calc(100dvh - 65px)' }}>
      <iframe
        src="/arena/arcade-casino/"
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        title="Star Arcade"
        allow="fullscreen"
      />
    </div>
  )
}
