export default function RoomCountdown({ countdown }: { countdown: number }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4" style={{ minHeight: 300 }}>
      <div className="text-sm uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
        La partie commence dans
      </div>
      <div className="text-9xl font-black" style={{ color: 'var(--accent)', lineHeight: 1 }}>
        {countdown}
      </div>
    </div>
  )
}
