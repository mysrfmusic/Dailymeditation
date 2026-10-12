import { AppTheme } from '../types/meditation';

export interface ThemeConfig {
  id: AppTheme;
  name: string;
  subtitle: string;
  badge: string;
  bgClass: string;
  headerBg: string;
  cardDefault: string;
  cardSelected: string;
  controlPanelBg: string;
  startButton: string;
  textPrimary: string;
  textSecondary: string;
  textAccent: string;
  borderColor: string;
}

export const THEMES: Record<AppTheme, ThemeConfig> = {
  spiritual_eye: {
    id: 'spiritual_eye',
    name: 'Spiritual Eye (Kutastha)',
    subtitle: 'Golden Halo, Sapphire Tunnel & Silver Star',
    badge: '⭐',
    bgClass: 'theme-spiritual-eye-bg',
    headerBg: 'bg-[#081347]/90 backdrop-blur-md border-[#ffd700]/40',
    cardDefault:
      'bg-[#0f2382]/85 hover:bg-[#1531ab]/90 text-[#fffbeb] border-2 border-[#ffd700]/60 shadow-lg shadow-blue-950/70 hover:border-[#ffd700] hover:shadow-amber-400/20',
    cardSelected:
      'bg-gradient-to-br from-[#ffd700] via-[#f59e0b] to-[#d97706] text-[#06103b] border-2 border-white shadow-2xl shadow-amber-500/50 ring-2 ring-[#ffd700]',
    controlPanelBg:
      'bg-gradient-to-b from-[#0f2382] via-[#0b1c68] to-[#06113d] border-2 border-[#ffd700]/60 shadow-2xl text-amber-50',
    startButton:
      'bg-gradient-to-r from-[#ffe033] via-[#ffc400] to-[#f59e0b] hover:from-[#ffeb66] hover:to-[#ffd133] text-[#06103b] font-black shadow-xl shadow-amber-400/40 border-2 border-white/90',
    textPrimary: 'text-[#fffbeb]',
    textSecondary: 'text-[#ffd700]/85',
    textAccent: 'text-[#ffd700]',
    borderColor: 'border-[#ffd700]/40',
  },
  celestial_twilight: {
    id: 'celestial_twilight',
    name: 'Celestial Twilight',
    subtitle: 'Deep Meditative Sapphire & Gold',
    badge: '🌌',
    bgClass: 'theme-celestial-bg',
    headerBg: 'bg-[#0f172a]/85 backdrop-blur-md border-[#334155]/60',
    cardDefault:
      'bg-[#1e293b]/85 hover:bg-[#334155]/90 text-[#f1f5f9] border border-[#38bdf8]/25 shadow-md shadow-slate-950/40 hover:border-[#38bdf8]/50',
    cardSelected:
      'bg-gradient-to-br from-[#1e3a8a] to-[#0f172a] text-[#f8fafc] border-2 border-[#38bdf8] shadow-lg shadow-blue-900/50 ring-2 ring-[#38bdf8]/40',
    controlPanelBg:
      'bg-gradient-to-b from-[#1e293b] to-[#0f172a] border border-[#38bdf8]/30 shadow-2xl text-slate-100',
    startButton:
      'bg-gradient-to-r from-[#38bdf8] to-[#0284c7] hover:from-[#60a5fa] hover:to-[#2563eb] text-white font-extrabold shadow-lg shadow-sky-500/30 border border-sky-300/40',
    textPrimary: 'text-slate-100',
    textSecondary: 'text-slate-400',
    textAccent: 'text-[#38bdf8]',
    borderColor: 'border-slate-700/60',
  },
  sacred_temple: {
    id: 'sacred_temple',
    name: 'Sacred Temple',
    subtitle: 'Sandalwood & Burnished Gold',
    badge: '🛕',
    bgClass: 'theme-temple-bg',
    headerBg: 'bg-[#2a0e14]/90 backdrop-blur-md border-[#7a222f]/50',
    cardDefault:
      'bg-[#3b141c]/90 hover:bg-[#4d1a24] text-[#faecc8] border border-[#d4af37]/35 shadow-md shadow-black/40 hover:border-[#d4af37]/70',
    cardSelected:
      'bg-gradient-to-br from-[#6b1624] to-[#360810] text-[#fff7df] border-2 border-[#d4af37] shadow-xl shadow-red-950/60 ring-2 ring-[#d4af37]/50',
    controlPanelBg:
      'bg-gradient-to-b from-[#40121a] to-[#24060b] border border-[#d4af37]/40 shadow-2xl text-amber-50',
    startButton:
      'bg-gradient-to-r from-[#d4af37] via-[#e5c158] to-[#c99f28] hover:from-[#e5c158] hover:to-[#ffd86b] text-[#360810] font-extrabold shadow-lg shadow-amber-900/40 border border-amber-200/50',
    textPrimary: 'text-[#faecc8]',
    textSecondary: 'text-[#d6b98d]',
    textAccent: 'text-[#e5c158]',
    borderColor: 'border-[#d4af37]/30',
  },
  lotus_dawn: {
    id: 'lotus_dawn',
    name: 'Lotus Dawn',
    subtitle: 'Warm Amber & Rosy Sunrise',
    badge: '🪷',
    bgClass: 'theme-dawn-bg',
    headerBg: 'bg-[#291720]/90 backdrop-blur-md border-[#66334a]/50',
    cardDefault:
      'bg-[#381f2c]/85 hover:bg-[#4a2a3b] text-[#fce7f3] border border-[#fb7185]/30 shadow-md shadow-black/40 hover:border-[#fb7185]/60',
    cardSelected:
      'bg-gradient-to-br from-[#701a3d] to-[#3b0d1e] text-white border-2 border-[#fb7185] shadow-xl shadow-pink-950/60 ring-2 ring-[#fb7185]/50',
    controlPanelBg:
      'bg-gradient-to-b from-[#451f33] to-[#240e1b] border border-[#fb7185]/35 shadow-2xl text-pink-50',
    startButton:
      'bg-gradient-to-r from-[#fb7185] to-[#f43f5e] hover:from-[#fda4af] hover:to-[#fb7185] text-white font-extrabold shadow-lg shadow-rose-900/40 border border-rose-200/50',
    textPrimary: 'text-pink-100',
    textSecondary: 'text-pink-300/80',
    textAccent: 'text-[#fb7185]',
    borderColor: 'border-pink-900/40',
  },
  classic_saffron: {
    id: 'classic_saffron',
    name: 'Classic Saffron & Maroon',
    subtitle: 'SRF Traditional App Aesthetic',
    badge: '🏵️',
    bgClass: 'spiritual-bg-pattern',
    headerBg: 'bg-[#f8be14]/90 backdrop-blur-md border-[#7a1215]/30',
    cardDefault:
      'bg-[#f4b619] hover:bg-[#fabc26] text-[#781215] border-2 border-[#781215]/90 shadow-sm hover:border-[#781215]',
    cardSelected:
      'bg-[#7a1215] text-white border-2 border-[#52090c] shadow-md ring-2 ring-[#fab915]/50',
    controlPanelBg: 'bg-[#7a1215] border-2 border-[#54080a] text-white shadow-xl',
    startButton:
      'bg-[#f5b819] hover:bg-[#ffc526] text-[#781215] font-extrabold border-2 border-white/80 shadow-lg',
    textPrimary: 'text-[#7a1215]',
    textSecondary: 'text-[#7a1215]/80',
    textAccent: 'text-[#f5b819]',
    borderColor: 'border-[#7a1215]/20',
  },
};
