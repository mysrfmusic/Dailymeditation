import React from 'react';

// Hand tap icon matching the screenshot top-left
export const TapIncrementIcon: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Touch target horizontal wave line */}
    <path d="M12 16h24" strokeWidth="2.5" strokeOpacity="0.8" />
    <circle cx="24" cy="16" r="4.5" strokeWidth="2" />
    {/* Hand finger reaching up */}
    <path d="M24 20v14" />
    <path d="M21 27v7a3 3 0 0 0 6 0v-7" />
    <path d="M17 31v3a3 3 0 0 0 6 0" />
    <path d="M31 31v3a3 3 0 0 1-6 0" />
    <path d="M21 34h6" />
  </svg>
);

// Japa Mala Beads in Hand matching the screenshot top-right
export const MalaBeadsIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Mala beads arc */}
    <circle cx="26" cy="12" r="2.2" fill="currentColor" />
    <circle cx="31" cy="14" r="2.2" fill="currentColor" />
    <circle cx="34" cy="18" r="2.2" fill="currentColor" />
    <circle cx="35" cy="23" r="2.2" fill="currentColor" />
    <circle cx="33" cy="28" r="2.2" fill="currentColor" />
    <circle cx="29" cy="31" r="2.2" fill="currentColor" />
    {/* Hand fingers clasping */}
    <path d="M15 28c0-3 3-5 7-5h5c3 0 5 2 5 5v5c0 4-3 7-7 7h-3c-4 0-7-3-7-7v-5z" />
    <path d="M18 20c0-3 2-5 5-5s5 2 5 5" />
    {/* Tassel */}
    <path d="M32 32l4 8" strokeWidth="2" />
    <path d="M34 31l2 9" strokeWidth="2" />
    <path d="M36 32l1 8" strokeWidth="2" />
  </svg>
);

// Sacred Lotus Flower icon
export const LotusIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M24 10c0 0-7 8-7 16 0 6 7 8 7 8s7-2 7-8c0-8-7-16-7-16z" />
    <path d="M24 34c-5 0-14-1-17-7-2-4 0-8 3-9 4-1 9 4 14 12" />
    <path d="M24 34c5 0 14-1 17-7 2-4 0-8-3-9-4-1-9 4-14 12" />
    <path d="M16 34c-4 3-8 4-11 3-3-1-3-5 0-8 3-3 8-1 11 3" />
    <path d="M32 34c4 3 8 4 11 3 3-1 3-5 0-8-3-3-8-1-11 3" />
    <path d="M20 37c2 2 4 3 4 3s2-1 4-3" />
  </svg>
);
