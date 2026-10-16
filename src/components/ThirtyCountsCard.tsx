import React, { useState } from 'react';
import { MeditationStageConfig } from '../types/meditation';
import { ThemeConfig } from '../utils/theme';
import { Play, Plus, Sparkles, Wind, Zap, Bell, Check, RotateCcw } from 'lucide-react';
import { MalaBeadsIcon } from './Icons';
import { createThirtyCountsStage } from '../data/stages';

interface ThirtyCountsCardProps {
  theme: ThemeConfig;
  onStartIndependent: (stage: MeditationStageConfig) => void;
  onAddToRoutine: (stage: MeditationStageConfig) => void;
  isInRoutine?: boolean;
}

export type ThirtyCountsMode = 'recharging' | 'pranayama' | 'japa';

export const ThirtyCountsCard: React.FC<ThirtyCountsCardProps> = ({
  theme,
  onStartIndependent,
  onAddToRoutine,
  isInRoutine = false,
}) => {
  const [mode, setMode] = useState<ThirtyCountsMode>('recharging');
  const [breathPattern, setBreathPattern] = useState({ inhale: 10, hold: 3, exhale: 10 });
  const [chimeEveryCount, setChimeEveryCount] = useState(true);
  const [addedMessage, setAddedMessage] = useState<string | null>(null);

  const secPerCycle =
    mode === 'pranayama'
      ? breathPattern.inhale + breathPattern.hold + breathPattern.exhale
      : mode === 'recharging'
      ? 6
      : 4;

  const estimatedMinutes = Math.max(2, Math.round((30 * secPerCycle) / 60));

  const handleStart = () => {
    const stage = createThirtyCountsStage(`thirty_counts_${Date.now()}`, mode, breathPattern);
    stage.isCountBased = true;
    stage.kriyaCount = 30;
    stage.secondsPerKriya = secPerCycle;
    stage.minutes = estimatedMinutes;
    onStartIndependent(stage);
  };

  const handleAdd = () => {
    const stage = createThirtyCountsStage(`thirty_counts_${Date.now()}`, mode, breathPattern);
    stage.isCountBased = true;
    stage.kriyaCount = 30;
    stage.secondsPerKriya = secPerCycle;
    stage.minutes = estimatedMinutes;
    onAddToRoutine(stage);
    setAddedMessage('30 Counts added to Routine sequence!');
    setTimeout(() => setAddedMessage(null), 2500);
  };

  return (
    <div className="w-full bg-gradient-to-br from-slate-900/95 via-indigo-950/70 to-slate-900/95 border-2 border-amber-400/40 rounded-3xl p-3.5 sm:p-4 text-white shadow-xl backdrop-blur-md relative overflow-hidden">
      {/* Golden halo glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-2xl bg-gradient-to-br from-amber-400/25 to-amber-500/10 text-amber-300 border border-amber-400/40 shadow-inner">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold font-spiritual text-amber-200 tracking-wide">
                30 Counts Independent Practice
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 font-bold uppercase tracking-wider">
                Independent
              </span>
            </div>
            <p className="text-[11px] text-slate-300/80">
              Paramahansa Yogananda 30-Part Body Recharging, Pranayama, or Japa Beads
            </p>
          </div>
        </div>

        <span className="text-[11px] font-bold text-amber-300 bg-black/40 px-2 py-1 rounded-full border border-white/10 whitespace-nowrap">
          ~{estimatedMinutes} min
        </span>
      </div>

      {/* Mode Switcher */}
      <div className="grid grid-cols-3 gap-1.5 mt-3 bg-black/40 p-1 rounded-2xl border border-white/10">
        <button
          type="button"
          onClick={() => setMode('recharging')}
          className={`py-1.5 px-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer border ${
            mode === 'recharging'
              ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md font-extrabold'
              : 'text-slate-300 hover:text-white border-transparent'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>30-Part Recharging</span>
        </button>

        <button
          type="button"
          onClick={() => setMode('pranayama')}
          className={`py-1.5 px-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer border ${
            mode === 'pranayama'
              ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md font-extrabold'
              : 'text-slate-300 hover:text-white border-transparent'
          }`}
        >
          <Wind className="w-3.5 h-3.5" />
          <span>30 Pranayama</span>
        </button>

        <button
          type="button"
          onClick={() => setMode('japa')}
          className={`py-1.5 px-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer border ${
            mode === 'japa'
              ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md font-extrabold'
              : 'text-slate-300 hover:text-white border-transparent'
          }`}
        >
          <MalaBeadsIcon className="w-3.5 h-3.5" />
          <span>30 AUM Japa</span>
        </button>
      </div>

      {/* Mode description & Ratio Presets */}
      <div className="mt-2.5 p-2.5 bg-black/25 rounded-2xl border border-white/10 space-y-2">
        <p className="text-[11px] text-amber-100/90 leading-snug">
          {mode === 'recharging' && (
            <span>
              ⚡ <strong>30-Part Body Recharging:</strong> Tense with will and feel energy flooding each of the 30 body parts from feet to brain. Relax completely and feel stillness.
            </span>
          )}
          {mode === 'pranayama' && (
            <span>
              🌬️ <strong>30 Breath Cycles:</strong> Complete 30 steady pranayama cycles with exact Inhale-Hold-Exhale pacing to still the mind.
            </span>
          )}
          {mode === 'japa' && (
            <span>
              📿 <strong>30 Counts Japa:</strong> 30 sacred repetitions of AUM at the spiritual eye, with counting bead feedback.
            </span>
          )}
        </p>

        {/* If Pranayama mode: show ratio presets */}
        {mode === 'pranayama' && (
          <div className="pt-1.5 border-t border-white/10">
            <div className="flex items-center justify-between text-[11px] text-sky-200/90 mb-1">
              <span>Breath Ratio:</span>
              <button
                type="button"
                onClick={() => setBreathPattern({ inhale: 10, hold: 3, exhale: 10 })}
                className="underline text-[10px] text-amber-300 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-2.5 h-2.5" /> Reset (10·3·10)
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1">
              {[
                { label: '8 · 3 · 8', p: { inhale: 8, hold: 3, exhale: 8 } },
                { label: '10 · 3 · 8', p: { inhale: 10, hold: 3, exhale: 8 } },
                { label: '10 · 3 · 10', p: { inhale: 10, hold: 3, exhale: 10 } },
                { label: '12 · 3 · 12', p: { inhale: 12, hold: 3, exhale: 12 } },
                { label: '15 · 3 · 15', p: { inhale: 15, hold: 3, exhale: 15 } },
              ].map((item, idx) => {
                const isActive =
                  breathPattern.inhale === item.p.inhale &&
                  breathPattern.hold === item.p.hold &&
                  breathPattern.exhale === item.p.exhale;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setBreathPattern(item.p)}
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-amber-300 text-slate-900 font-bold ring-2 ring-amber-400/60 shadow-sm'
                        : 'bg-white/10 hover:bg-white/20 text-white/90'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 30 Visual Beads Mini Indicator */}
        <div className="pt-1.5 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Bell className="w-3 h-3 text-amber-300" />
            <span className="text-[10px] text-slate-300">Chime on each count:</span>
          </div>
          <button
            type="button"
            onClick={() => setChimeEveryCount(!chimeEveryCount)}
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer border ${
              chimeEveryCount
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                : 'bg-white/5 text-slate-400 border-white/10'
            }`}
          >
            {chimeEveryCount ? '✓ Chime On' : '○ Silent'}
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 mt-3">
        <button
          type="button"
          onClick={handleStart}
          className="flex-1 py-2.5 px-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 hover:from-amber-300 hover:to-amber-200 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-amber-400/20 transition-all active:scale-[0.98] cursor-pointer"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Start 30 Counts Practice</span>
        </button>

        <button
          type="button"
          onClick={handleAdd}
          className="py-2.5 px-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap"
          title="Add 30 Counts to routine sequence"
        >
          <Plus className="w-3.5 h-3.5 text-amber-300" />
          <span>{isInRoutine ? 'Add Another' : 'Add to Routine'}</span>
        </button>
      </div>

      {addedMessage && (
        <div className="mt-2 text-center text-[11px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 py-1 px-2 rounded-xl animate-in fade-in duration-200">
          ✓ {addedMessage}
        </div>
      )}
    </div>
  );
};
