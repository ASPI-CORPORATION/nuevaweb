/** Stylized Sol de Mayo: 16 alternating straight and flame rays around a disc. */
export function SolDeMayo({ className = '', color = '#F6B40E' }: { className?: string; color?: string }) {
  const rays = Array.from({ length: 16 }, (_, i) => i)
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <g fill={color}>
        {rays.map(i => {
          const angle = (i * 360) / 16
          return i % 2 === 0 ? (
            <path key={i} d="M50 2 L53.2 24 L46.8 24 Z" transform={`rotate(${angle} 50 50)`} />
          ) : (
            <path
              key={i}
              d="M50 8 C54 13 46 17 50 22 C53 24 47 25 50 26 L48 26 C45 22 52 18 48 13 C47 11 49 9 50 8 Z"
              transform={`rotate(${angle} 50 50)`}
            />
          )
        })}
        <circle cx="50" cy="50" r="22" />
      </g>
      <circle cx="50" cy="50" r="17.5" fill="none" stroke="#050A14" strokeOpacity="0.25" strokeWidth="1.2" />
    </svg>
  )
}

/** Celeste-white-celeste band, used as a thin decorative accent. */
export function FlagStripe({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-col ${className}`} aria-hidden="true">
      <span className="flex-1 bg-[#74ACDF]" />
      <span className="flex-1 bg-white" />
      <span className="flex-1 bg-[#74ACDF]" />
    </div>
  )
}
