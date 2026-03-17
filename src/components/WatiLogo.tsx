interface WatiLogoProps {
  size?: number;
  className?: string;
}

/**
 * Wati brand icon: A minimalist bowl with a sprout-leaf and a heart,
 * evoking health, organic nutrition, and self-care.
 */
export function WatiLogo({ size = 24, className = '' }: WatiLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background Badge - Mint Green now */}
      <rect
        width="48"
        height="48"
        rx="6"
        fill="var(--brand-mint, #74C69D)"
      />

      {/* Bowl Base - Forest Green for high contrast on Mint badge */}
      <path
        d="M10 24C10 24 10 38 24 38C38 38 38 24 38 24H10Z"
        fill="var(--brand-forest, #1B4332)"
      />
      
      {/* Liquid/Surface Line - Mint for contrast on Forest bowl */}
      <path
        d="M10 24H38"
        stroke="var(--brand-mint, #74C69D)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Rotating Sprout/Leaf Group - 30 degrees right */}
      <g transform="rotate(30, 24, 24)">
        {/* The Sprout/Leaf - Cream */}
        <path
          d="M24 24V14C24 14 24 6 34 6C34 6 28 6 24 12C20 6 14 6 14 6C24 6 24 14 24 14"
          fill="var(--brand-cream, #FDFCF8)"
        />
        
        {/* Stem of the leaf */}
        <path
          d="M24 24V14"
          stroke="var(--brand-cream, #FDFCF8)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>

      {/* Heart Detail - Cream (matches the leaf for visibility) */}
      <path
        d="M24 31C24 31 22 29 20.5 30C19 31 21 33.5 24 33.5C27 33.5 29 31 27.5 30C26 29 24 31 24 31Z"
        fill="var(--brand-cream, #FDFCF8)"
      />
    </svg>
  );
}
