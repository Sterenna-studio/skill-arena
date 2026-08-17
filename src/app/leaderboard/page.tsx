export default function LeaderboardPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <p className="section-label">// CLASSEMENT GLOBAL</p>
      <h1 className="text-3xl font-bold mb-2">🏆 Classement</h1>
      <p style={{ color: 'var(--muted)' }} className="mb-8">
        Les classements globaux arriveront avec la connexion des comptes Supabase.
      </p>
      <div className="card p-8 text-center" style={{ color: 'var(--muted)' }}>
        <div className="text-4xl mb-4">🔒</div>
        <div className="font-semibold">Classements bientôt disponibles</div>
        <div className="text-sm mt-2">Configure Supabase dans <code>.env.local</code> pour activer les scores en ligne.</div>
      </div>
    </div>
  )
}
