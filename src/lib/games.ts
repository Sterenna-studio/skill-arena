export interface GameMeta {
  slug: string
  title: string
  description: string
  icon: string
  category: 'reflexes' | 'precision' | 'memory' | 'perception' | 'typing' | 'arcade'
  unit: string
  higherIsBetter: boolean
  available: boolean
  /** Lien absolu (hors basePath /arena) vers un jeu statique externe de l'écosystème */
  external?: string
}

export const GAMES: GameMeta[] = [
  {
    slug: 'titan-rocket-run',
    title: 'Titan Rocket Run',
    description: 'Cours, saute depuis la rampe et va le plus loin possible.',
    icon: '🚀',
    category: 'arcade',
    unit: 'distance',
    higherIsBetter: true,
    available: true,
    external: '/titan-rocket-run/',
  },
  {
    slug: 'reaction',
    title: 'Reaction Time',
    description: 'Clique dès que le signal apparaît. Teste tes réflexes purs.',
    icon: '⚡',
    category: 'reflexes',
    unit: 'ms',
    higherIsBetter: false,
    available: true,
  },
  {
    slug: 'aim',
    title: 'Aim Trainer',
    description: 'Clique sur le maximum de cibles en 30 secondes.',
    icon: '🎯',
    category: 'precision',
    unit: 'hits',
    higherIsBetter: true,
    available: true,
  },
  {
    slug: 'typing',
    title: 'Typing Speed',
    description: 'Recopie le texte le plus vite possible. Score en WPM.',
    icon: '⌨️',
    category: 'typing',
    unit: 'WPM',
    higherIsBetter: true,
    available: true,
  },
  {
    slug: 'time-estimator',
    title: 'Time Estimator',
    description: 'Arrête le chrono quand tu penses que le temps demandé est écoulé.',
    icon: '⏱️',
    category: 'perception',
    unit: '% précision',
    higherIsBetter: true,
    available: true,
  },
  {
    slug: 'counter',
    title: 'Object Counter',
    description: 'Compte le nombre exact d\'objets affichés à l\'écran.',
    icon: '🔢',
    category: 'perception',
    unit: '% précision',
    higherIsBetter: true,
    available: true,
  },
  {
    slug: 'number-memory',
    title: 'Number Memory',
    description: 'Mémorise des séquences de chiffres de plus en plus longues.',
    icon: '🧠',
    category: 'memory',
    unit: 'niveau',
    higherIsBetter: true,
    available: false,
  },
  {
    slug: 'chiffer',
    title: 'Calcul Mental',
    description: 'Résous un maximum d\'opérations simples en 60 secondes.',
    icon: '🧮',
    category: 'memory',
    unit: 'bonnes réponses',
    higherIsBetter: true,
    available: false,
  },
]

export const CATEGORY_LABELS: Record<GameMeta['category'], string> = {
  reflexes: 'Réflexes',
  precision: 'Précision',
  memory: 'Mémoire',
  perception: 'Perception',
  typing: 'Frappe',
  arcade: 'Arcade',
}
