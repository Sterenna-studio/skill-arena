interface TargetProps {
  size: number
  kind?: 'normal' | 'bait'
  number?: number
  color?: string
}

/**
 * Cible SVG type "bullseye" (anneaux concentriques).
 * - kind 'bait'  : rouge avec un ✕ central (à éviter)
 * - number       : affiche un chiffre lisible au centre
 * - color        : surcharge la couleur des anneaux (mode séquence couleur)
 */
export default function Target({ size, kind = 'normal', number, color }: TargetProps) {
  const ring = kind === 'bait' ? '#ef4444' : (color ?? '#6c63ff')
  const light = '#f3f3fa'
  const showNumber = number != null

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ display: 'block', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,.45))' }}
    >
      <circle cx="50" cy="50" r="49" fill={ring} />
      <circle cx="50" cy="50" r="39" fill={light} />
      <circle cx="50" cy="50" r="29" fill={ring} />

      {showNumber ? (
        <>
          <circle cx="50" cy="50" r="21" fill={light} />
          <text
            x="50" y="52"
            textAnchor="middle" dominantBaseline="central"
            fontSize="30" fontWeight="900" fill="#0d0d0f"
            fontFamily="system-ui, sans-serif"
          >
            {number}
          </text>
        </>
      ) : (
        <>
          <circle cx="50" cy="50" r="17" fill={light} />
          <circle cx="50" cy="50" r="8" fill={ring} />
          {kind === 'bait' && (
            <text
              x="50" y="52"
              textAnchor="middle" dominantBaseline="central"
              fontSize="26" fontWeight="900" fill={light}
              fontFamily="system-ui, sans-serif"
            >
              ✕
            </text>
          )}
        </>
      )}
    </svg>
  )
}
