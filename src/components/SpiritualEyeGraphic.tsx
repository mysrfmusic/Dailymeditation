import React from 'react';

interface SpiritualEyeGraphicProps {
  className?: string;
  pulsePhase?: 'Inhale' | 'Hold' | 'Exhale' | 'Stillness';
  size?: number;
}

export const SpiritualEyeGraphic: React.FC<SpiritualEyeGraphicProps> = ({
  className = 'w-64 h-64',
  pulsePhase = 'Stillness',
  size = 240,
}) => {
  // Breathing scale for dynamic meditation
  const scaleClass =
    pulsePhase === 'Inhale'
      ? 'scale-105 transition-transform duration-1000'
      : pulsePhase === 'Hold'
      ? 'scale-100 transition-transform duration-500'
      : pulsePhase === 'Exhale'
      ? 'scale-95 transition-transform duration-1000'
      : 'scale-100';

  return (
    <div className={`relative flex items-center justify-center ${className} ${scaleClass}`}>
      <svg
        viewBox="0 0 240 240"
        className="w-full h-full drop-shadow-2xl select-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Outer Golden Halo Gradient matching photo */}
          <radialGradient id="goldenHaloGrad" cx="50%" cy="50%" r="50%">
            <stop offset="68%" stopColor="#ffd700" />
            <stop offset="82%" stopColor="#ffea66" />
            <stop offset="92%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </radialGradient>

          {/* Golden Flame Border Gradient */}
          <linearGradient id="goldFlameBorder" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffe600" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>

          {/* Deep Sapphire Blue Tunnel Gradient matching photo */}
          <radialGradient id="sapphireTunnelGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#4361ee" />
            <stop offset="25%" stopColor="#2541db" />
            <stop offset="55%" stopColor="#152fb3" />
            <stop offset="85%" stopColor="#0b1b70" />
            <stop offset="100%" stopColor="#061045" />
          </radialGradient>

          {/* Center White Star Glow Filter */}
          <filter id="starGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Golden Halo Outer Glow */}
          <filter id="haloGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 1. Outer Golden Flame / Rays Aura */}
        <circle cx="120" cy="120" r="114" fill="none" stroke="url(#goldFlameBorder)" strokeWidth="6" opacity="0.6" filter="url(#haloGlow)" />
        <circle cx="120" cy="120" r="108" fill="url(#goldenHaloGrad)" filter="url(#haloGlow)" />

        {/* Outer Golden Ring Flame Ornament detail from photo */}
        <circle
          cx="120"
          cy="120"
          r="92"
          fill="none"
          stroke="#ffe600"
          strokeWidth="3.5"
          strokeDasharray="8 4"
          opacity="0.85"
        />

        {/* 2. Inner Opal Sapphire Blue Tunnel */}
        <circle cx="120" cy="120" r="86" fill="url(#sapphireTunnelGrad)" />

        {/* Subtle celestial depth rings */}
        <circle cx="120" cy="120" r="62" fill="none" stroke="#60a5fa" strokeWidth="1" opacity="0.25" />
        <circle cx="120" cy="120" r="38" fill="none" stroke="#93c5fd" strokeWidth="1" opacity="0.4" />

        {/* 3. Center Brilliant Radiant 5-Pointed White-Silver Star */}
        <g filter="url(#starGlow)">
          {/* Subtle star aura circle */}
          <circle cx="120" cy="120" r="16" fill="#ffffff" opacity="0.25" />
          {/* Five-pointed Star: center at (120, 120), outer radius 14, inner radius 6 */}
          <polygon
            points="
              120,105 
              124,116 
              135,116 
              126,123 
              129,134 
              120,127 
              111,134 
              114,123 
              105,116 
              116,116
            "
            fill="#ffffff"
            stroke="#e0f2fe"
            strokeWidth="0.8"
          />
        </g>
      </svg>
    </div>
  );
};
