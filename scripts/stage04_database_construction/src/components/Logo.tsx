export default function Logo({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="leafGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2d7680" stopOpacity="0.9"/>
          <stop offset="100%" stopColor="#379499" stopOpacity="0.7"/>
        </linearGradient>
        <linearGradient id="dnaGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#cfa057"/>
          <stop offset="100%" stopColor="#b8843e"/>
        </linearGradient>
        <linearGradient id="bgCircle" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f9f7f3" stopOpacity="0.4"/>
          <stop offset="100%" stopColor="#e9dccb" stopOpacity="0.3"/>
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <circle cx="50" cy="40" r="34" fill="url(#bgCircle)"/>

      <path d="M 50 20 Q 45 25, 45 35 Q 45 45, 50 50 Q 48 48, 45 45 Q 40 40, 40 35 Q 40 28, 45 23 Z"
            fill="url(#leafGrad)" filter="url(#glow)"/>
      <path d="M 50 20 Q 55 25, 55 35 Q 55 45, 50 50 Q 52 48, 55 45 Q 60 40, 60 35 Q 60 28, 55 23 Z"
            fill="url(#leafGrad)" filter="url(#glow)"/>

      <path d="M 38 32 Q 40 30, 45 32" stroke="#e8d5a9" strokeWidth="0.8" opacity="0.7"/>
      <path d="M 39 38 Q 42 36, 46 38" stroke="#e8d5a9" strokeWidth="0.8" opacity="0.7"/>

      <g opacity="0.9">
        <path d="M 50 25 C 52 26, 54 24, 56 25 C 58 26, 60 24, 62 25 C 64 26, 66 24, 68 25"
              stroke="url(#dnaGrad)" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
        <path d="M 50 45 C 52 44, 54 46, 56 45 C 58 44, 60 46, 62 45 C 64 44, 66 46, 68 45"
              stroke="url(#dnaGrad)" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
        <line x1="52" y1="25" x2="52" y2="45" stroke="#dbc4a8" strokeWidth="0.6" opacity="0.6"/>
        <line x1="56" y1="25" x2="56" y2="45" stroke="#dbc4a8" strokeWidth="0.6" opacity="0.6"/>
        <line x1="60" y1="25" x2="60" y2="45" stroke="#dbc4a8" strokeWidth="0.6" opacity="0.6"/>
        <line x1="64" y1="25" x2="64" y2="45" stroke="#dbc4a8" strokeWidth="0.6" opacity="0.6"/>
      </g>

      <path d="M 35 48 Q 40 52, 50 52 Q 60 52, 65 48" stroke="#9a6835" strokeWidth="1.5"
            fill="none" opacity="0.4" strokeLinecap="round"/>

      <circle cx="28" cy="30" r="2" fill="#b8843e" opacity="0.6"/>
      <circle cx="72" cy="34" r="2" fill="#b8843e" opacity="0.6"/>
      <circle cx="32" cy="50" r="1.5" fill="#cfa057" opacity="0.5"/>
      <circle cx="68" cy="52" r="1.5" fill="#cfa057" opacity="0.5"/>

      <text x="88" y="32" fontFamily="Merriweather, serif" fontSize="20" fontWeight="700" fill="#5f4e3d" letterSpacing="1">
        ALGERIA
      </text>
      <text x="88" y="52" fontFamily="Merriweather, serif" fontSize="20" fontWeight="700" fill="#8d7659" letterSpacing="0.5">
        PHYTO-CHEM
      </text>
      <text x="88" y="64" fontFamily="Inter, sans-serif" fontSize="9" fill="#a89170" letterSpacing="0.5">
        Chemogenomic Portal
      </text>
    </svg>
  );
}
