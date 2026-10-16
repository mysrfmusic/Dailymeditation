import React from 'react';
import { MeditationStageConfig, BreathPattern } from '../types/meditation';
import { TapIncrementIcon, MalaBeadsIcon } from './Icons';
import { SOUNDSCAPES } from '../utils/soundscapes';
import { STAGE_MEDIA_PRESETS, StageMediaPreset } from '../utils/customMedia';
import { Music, SlidersHorizontal, BookOpen, Wind, RotateCcw, Youtube } from 'lucide-react';
import { ThemeConfig } from '../utils/theme';

interface ControlPanelProps {
  stage: MeditationStageConfig;
  incrementStep: 1 | 5;
  theme: ThemeConfig;
  onToggleIncrement: () => void;
  onUpdateMinutes: (newMinutes: number) => void;
  onUpdateKriyas?: (newCount: number) => void;
  onUpdateBreathRounds?: (rounds: number) => void;
  onUpdateBreathPattern?: (pattern: BreathPattern) => void;
  onToggleCountMode?: () => void;
  onStart: () => void;
  onOpenSoundscapeModal: () => void;
  onOpenInfo: () => void;
  onOpenCustomMediaModal?: () => void;
  onSelectMediaPreset?: (preset: StageMediaPreset) => void;
  onTogglePlayUntilFinished?: (val: boolean) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  stage,
  incrementStep,
  theme,
  onToggleIncrement,
  onUpdateMinutes,
  onUpdateKriyas,
  onUpdateBreathRounds,
  onUpdateBreathPattern,
  onToggleCountMode,
  onStart,
  onOpenSoundscapeModal,
  onOpenInfo,
  onOpenCustomMediaModal,
  onSelectMediaPreset,
  onTogglePlayUntilFinished,
}) => {
  const isKriyas = stage.id === 'kriyas';
  const isBreathing1 = stage.id === 'breathing_1';
  const isBreathing2 = stage.id === 'breathing_2';
  const isPranayama = isBreathing1 || isBreathing2;
  const isBreathing = isPranayama && Boolean(stage.breathPattern);
  const isKriyaCount = isKriyas && stage.isCountBased && stage.kriyaCount !== undefined;
  const isBreathCount = isBreathing && stage.isCountBased;
  const isPrayer = Boolean(stage.techniqueGuide.prayerText);
  const isChant = stage.stageType === 'chant' || stage.id === 'chant' || stage.id.startsWith('chant_');
  const isAffirmation = stage.stageType === 'affirmation' || stage.id === 'affirmation' || stage.id.startsWith('affirmation_');
  const isSacredVoice = stage.stageType === 'sacred_voices' || stage.id === 'sacred_voices' || stage.id.startsWith('sacred_voices_');
  const isPlayUntilFinished = stage.playUntilFinished ?? (stage.customMedia?.playUntilFinished ?? (isChant || isAffirmation || isSacredVoice));

  // Current breath pattern & rounds
  const currentPattern = stage.breathPattern || {
    inhale: isBreathing1 ? 6 : isBreathing2 ? 8 : 10,
    hold: isBreathing1 ? 6 : isBreathing2 ? 8 : 3,
    exhale: isBreathing1 ? 6 : isBreathing2 ? 8 : 10,
  };
  const currentRounds = stage.breathRounds ?? (isBreathing1 ? 3 : 6);

  // Soundscape name
  const currentSound = SOUNDSCAPES.find((s) => s.id === stage.soundscape) || SOUNDSCAPES[0];

  // Min / Max ranges for slider
  const minVal = isKriyaCount ? 2 : isBreathCount ? 1 : 1;
  const maxVal = isKriyaCount ? 108 : isBreathCount ? 24 : 90;
  const currentVal = isKriyaCount
    ? (stage.kriyaCount ?? 14)
    : isBreathCount
    ? currentRounds
    : stage.minutes;

  const handleDecrement = () => {
    if (isKriyaCount && onUpdateKriyas) {
      const step = incrementStep === 5 ? 7 : 1;
      const next = Math.max(minVal, currentVal - step);
      onUpdateKriyas(next);
    } else if (isBreathCount && onUpdateBreathRounds) {
      const next = Math.max(minVal, currentVal - 1);
      onUpdateBreathRounds(next);
    } else {
      const next = Math.max(minVal, currentVal - incrementStep);
      onUpdateMinutes(next);
    }
  };

  const handleIncrement = () => {
    if (isKriyaCount && onUpdateKriyas) {
      const step = incrementStep === 5 ? 7 : 1;
      const next = Math.min(maxVal, currentVal + step);
      onUpdateKriyas(next);
    } else if (isBreathCount && onUpdateBreathRounds) {
      const next = Math.min(maxVal, currentVal + 1);
      onUpdateBreathRounds(next);
    } else {
      const next = Math.min(maxVal, currentVal + incrementStep);
      onUpdateMinutes(next);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    if (isKriyaCount && onUpdateKriyas) {
      onUpdateKriyas(val);
    } else if (isBreathCount && onUpdateBreathRounds) {
      onUpdateBreathRounds(val);
    } else {
      onUpdateMinutes(val);
    }
  };

  const handleSetEqualCount = (count: number) => {
    if (onUpdateBreathPattern) {
      onUpdateBreathPattern({
        inhale: count,
        hold: count,
        exhale: count,
      });
    }
  };

  const handleUpdateSingleBreathCount = (field: 'inhale' | 'hold' | 'exhale', delta: number) => {
    if (onUpdateBreathPattern) {
      const nextVal = Math.max(1, Math.min(60, currentPattern[field] + delta));
      onUpdateBreathPattern({
        ...currentPattern,
        [field]: nextVal,
      });
    }
  };

  const totalCycleSec = currentPattern.inhale + currentPattern.hold + currentPattern.exhale;
  const targetCountForEst = isKriyaCount ? (stage.kriyaCount ?? 14) : currentRounds;
  const estimatedMins = Math.max(1, Math.round((targetCountForEst * totalCycleSec) / 60));

  const primaryNumber = isKriyaCount
    ? `${stage.kriyaCount ?? 14}`
    : isBreathCount
    ? `${currentRounds}`
    : `${stage.minutes}`;

  const secondaryTitle = stage.title;
  const tertiarySubtitle = isKriyaCount
    ? `${stage.kriyaCount ?? 14} Kriyas (${currentPattern.inhale}·${currentPattern.hold}·${currentPattern.exhale}) ~${estimatedMins}m`
    : isBreathCount
    ? `${currentRounds} Count${currentRounds > 1 ? 's' : ''} (${currentPattern.inhale}·${currentPattern.hold}·${currentPattern.exhale}) ~${estimatedMins}m`
    : isPlayUntilFinished && (isChant || isAffirmation || stage.customMedia?.enabled)
    ? '🎵 Plays until music finishes (Auto-advances)'
    : `${stage.minutes} minute${stage.minutes > 1 ? 's' : ''}`;

  return (
    <div
      className={`w-full rounded-[30px] p-4 sm:p-5 shadow-2xl relative overflow-hidden select-none transition-all duration-200 ${theme.controlPanelBg}`}
    >
      {/* Top 3-slot Row */}
      <div className="grid grid-cols-3 items-center text-center">
        {/* Left: Tap increments toggle */}
        <button
          type="button"
          onClick={onToggleIncrement}
          className="flex flex-col items-center justify-center group cursor-pointer opacity-90 hover:opacity-100 transition-all py-1 rounded-xl hover:bg-white/10 active:scale-95"
          title={`Click to change increment (Current: ${incrementStep}m)`}
        >
          <div className="p-1 rounded-full group-hover:scale-110 transition-transform">
            <TapIncrementIcon className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>
          <span className="text-[11px] sm:text-xs opacity-85 leading-tight mt-0.5 max-w-[100px]">
            {isKriyaCount
              ? `Increments of ${incrementStep === 5 ? '7' : '1'} kriyas`
              : isBreathCount
              ? `Count of rounds`
              : `Increments of ${incrementStep} min`}
          </span>
        </button>

        {/* Center: Big count & title */}
        <div className="flex flex-col items-center justify-center">
          <div className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-none font-spiritual">
            {primaryNumber}
          </div>
          <div className="text-base sm:text-lg font-bold mt-0.5 truncate max-w-[160px]">
            {secondaryTitle}
          </div>
          <div className="text-xs opacity-80 font-medium truncate max-w-[210px]">
            {tertiarySubtitle}
          </div>
        </div>

        {/* Right: Mode toggle or Info/Sound */}
        <div className="flex flex-col items-center justify-center">
          {isKriyas ? (
            <button
              type="button"
              onClick={onToggleCountMode}
              className="flex flex-col items-center justify-center group cursor-pointer opacity-90 hover:opacity-100 transition-all py-1 rounded-xl hover:bg-white/10 active:scale-95"
              title="Toggle between Kriya count mode and standard timer"
            >
              <div className="p-1 group-hover:scale-110 transition-transform">
                <MalaBeadsIcon className="w-8 h-8 sm:w-9 sm:h-9" />
              </div>
              <span className="text-[11px] sm:text-xs opacity-85 leading-tight mt-0.5">
                {isKriyaCount ? 'Kriyas Mode' : 'Minutes Mode'}
              </span>
            </button>
          ) : isBreathing ? (
            <button
              type="button"
              onClick={onOpenInfo}
              className="flex flex-col items-center justify-center group cursor-pointer opacity-90 hover:opacity-100 transition-all py-1 rounded-xl hover:bg-white/10 active:scale-95"
              title="View pranayama technique instructions"
            >
              <div className="p-1 group-hover:scale-110 transition-transform">
                <Wind className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <span className="text-[11px] sm:text-xs opacity-85 leading-tight mt-0.5">
                Pranayama Guide
              </span>
            </button>
          ) : stage.id === 'chant' ? (
            <button
              type="button"
              onClick={onOpenCustomMediaModal || onOpenSoundscapeModal}
              className="flex flex-col items-center justify-center group cursor-pointer opacity-90 hover:opacity-100 transition-all py-1 rounded-xl hover:bg-white/10 active:scale-95"
              title="Customize YouTube Chant or MP3 link"
            >
              <div className="p-1 group-hover:scale-110 transition-transform text-red-400">
                <Youtube className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <span className="text-[11px] sm:text-xs opacity-85 leading-tight mt-0.5 font-semibold">
                {stage.customMedia?.enabled && stage.customMedia.url ? 'Chant Linked' : 'Chant Audio'}
              </span>
            </button>
          ) : isPrayer ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onOpenInfo}
                className="flex flex-col items-center justify-center group cursor-pointer opacity-90 hover:opacity-100 transition-all py-1 px-1 rounded-xl hover:bg-white/10 active:scale-95"
                title="Read sacred prayer words"
              >
                <div className="p-1 group-hover:scale-110 transition-transform">
                  <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <span className="text-[10px] sm:text-[11px] opacity-85 leading-tight mt-0.5">
                  Prayer
                </span>
              </button>
              {onOpenCustomMediaModal && (
                <button
                  type="button"
                  onClick={onOpenCustomMediaModal}
                  className="flex flex-col items-center justify-center group cursor-pointer opacity-90 hover:opacity-100 transition-all py-1 px-1 rounded-xl hover:bg-white/10 active:scale-95"
                  title="Customize YouTube or MP3 prayer audio"
                >
                  <div
                    className={`p-1 group-hover:scale-110 transition-transform ${
                      stage.customMedia?.enabled ? 'text-red-400' : 'text-amber-300'
                    }`}
                  >
                    <Youtube className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <span className="text-[10px] sm:text-[11px] opacity-85 leading-tight mt-0.5">
                    {stage.customMedia?.enabled ? 'Audio Link' : 'Add Audio'}
                  </span>
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenSoundscapeModal}
              className="flex flex-col items-center justify-center group cursor-pointer opacity-90 hover:opacity-100 transition-all py-1 rounded-xl hover:bg-white/10 active:scale-95"
              title="Customize soundscape for this session"
            >
              <div className="p-1 group-hover:scale-110 transition-transform">
                <Music className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <span className="text-[11px] sm:text-xs opacity-85 leading-tight mt-0.5 truncate max-w-[90px]">
                {currentSound.name.split(' ')[0]}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* SPECIALIZED BREATHING COUNT & RATIO CONTROLS */}
      {isBreathing && (
        <div className="mt-3.5 p-3 bg-black/25 rounded-2xl border border-white/15 space-y-2.5">
          {/* Header & Reset Default */}
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold opacity-90 flex items-center gap-1">
              <Wind className="w-3.5 h-3.5 text-amber-300" />
              {isBreathing1 ? 'Ex 1 (Default: 6-6-6 · 3 counts)' : 'Ex 2 (Default: 8-8-8 · 6 counts)'}
            </span>

            {/* Quick Reset to default */}
            <button
              type="button"
              onClick={() => {
                if (isBreathing1) {
                  onUpdateBreathPattern?.({ inhale: 6, hold: 6, exhale: 6 });
                  onUpdateBreathRounds?.(3);
                } else {
                  onUpdateBreathPattern?.({ inhale: 8, hold: 8, exhale: 8 });
                  onUpdateBreathRounds?.(6);
                }
              }}
              className="text-[11px] underline opacity-75 hover:opacity-100 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Reset Default
            </button>
          </div>

          {/* Quick presets for ratios */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-0.5">
            {isBreathing1 ? (
              <>
                {[
                  { label: '6 · 6 · 6 (Default)', val: 6 },
                  { label: '8 · 8 · 8', val: 8 },
                  { label: '10 · 10 · 10', val: 10 },
                  { label: '12 · 6 · 12', custom: { inhale: 12, hold: 6, exhale: 12 } },
                ].map((p, idx) => {
                  const isActive = p.custom
                    ? currentPattern.inhale === p.custom.inhale &&
                      currentPattern.hold === p.custom.hold &&
                      currentPattern.exhale === p.custom.exhale
                    : currentPattern.inhale === p.val &&
                      currentPattern.hold === p.val &&
                      currentPattern.exhale === p.val;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        if (p.custom) {
                          onUpdateBreathPattern?.(p.custom);
                        } else if (p.val) {
                          handleSetEqualCount(p.val);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-amber-300 text-slate-900 font-bold shadow'
                          : 'bg-white/10 hover:bg-white/20 text-white/90'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </>
            ) : (
              <>
                {[
                  { label: '8 · 8 · 8 (Default)', val: 8 },
                  { label: '10 · 10 · 10', val: 10 },
                  { label: '20 · 20 · 20', val: 20 },
                  { label: '6 · 6 · 6', val: 6 },
                  { label: '12 · 12 · 12', val: 12 },
                ].map((p) => {
                  const isActive =
                    currentPattern.inhale === p.val &&
                    currentPattern.hold === p.val &&
                    currentPattern.exhale === p.val;
                  return (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => handleSetEqualCount(p.val)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-amber-300 text-slate-900 font-bold shadow'
                          : 'bg-white/10 hover:bg-white/20 text-white/90'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </>
            )}
          </div>

          {/* Interactive Steppers for Inhale, Hold, Exhale counts */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
            {/* Inhale Stepper */}
            <div className="bg-black/20 p-1.5 rounded-xl border border-white/10">
              <span className="text-[10px] uppercase font-bold text-sky-300 block mb-1">Inhale</span>
              <div className="flex items-center justify-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleUpdateSingleBreathCount('inhale', -1)}
                  className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-sm font-bold"
                >
                  −
                </button>
                <span className="font-extrabold text-sm tabular-nums w-6">
                  {currentPattern.inhale}
                </span>
                <button
                  type="button"
                  onClick={() => handleUpdateSingleBreathCount('inhale', 1)}
                  className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-sm font-bold"
                >
                  +
                </button>
              </div>
            </div>

            {/* Hold Stepper */}
            <div className="bg-black/20 p-1.5 rounded-xl border border-white/10">
              <span className="text-[10px] uppercase font-bold text-amber-300 block mb-1">Hold</span>
              <div className="flex items-center justify-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleUpdateSingleBreathCount('hold', -1)}
                  className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-sm font-bold"
                >
                  −
                </button>
                <span className="font-extrabold text-sm tabular-nums w-6">
                  {currentPattern.hold}
                </span>
                <button
                  type="button"
                  onClick={() => handleUpdateSingleBreathCount('hold', 1)}
                  className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-sm font-bold"
                >
                  +
                </button>
              </div>
            </div>

            {/* Exhale Stepper */}
            <div className="bg-black/20 p-1.5 rounded-xl border border-white/10">
              <span className="text-[10px] uppercase font-bold text-emerald-300 block mb-1">
                Exhale
              </span>
              <div className="flex items-center justify-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleUpdateSingleBreathCount('exhale', -1)}
                  className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-sm font-bold"
                >
                  −
                </button>
                <span className="font-extrabold text-sm tabular-nums w-6">
                  {currentPattern.exhale}
                </span>
                <button
                  type="button"
                  onClick={() => handleUpdateSingleBreathCount('exhale', 1)}
                  className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-sm font-bold"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SPECIALIZED KRIYA BREATH COUNT RATIO & PRESCRIBED COUNTS (8-3-8, 10-3-8, 12-3-12, 10-3-10, 15-3-15 & 30 Counts) */}
      {isKriyas && (
        <div className="mt-3.5 p-3 bg-black/25 rounded-2xl border border-white/15 space-y-3">
          {/* Header & Reset Default */}
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold opacity-90 flex items-center gap-1.5">
              <Wind className="w-3.5 h-3.5 text-amber-300" />
              <span>Kriya Count Ratio</span>
              <span className="text-[10px] opacity-75 font-normal">(Inhale · Hold · Exhale)</span>
            </span>

            {/* Quick Reset to default 10-3-10 */}
            <button
              type="button"
              onClick={() => {
                onUpdateBreathPattern?.({ inhale: 10, hold: 3, exhale: 10 });
              }}
              className="text-[11px] underline opacity-75 hover:opacity-100 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Reset (10·3·10)
            </button>
          </div>

          {/* Quick Presets for Prescribed Kriya Counts (including 30 Counts) */}
          <div className="bg-black/20 p-2 rounded-xl border border-white/10">
            <div className="flex items-center justify-between text-[11px] mb-1.5 px-0.5">
              <span className="font-semibold text-amber-200/90 flex items-center gap-1">
                <MalaBeadsIcon className="w-3 h-3 text-amber-300" />
                <span>Prescribed Kriyas:</span>
              </span>
              <span className="font-bold text-amber-300">
                {stage.kriyaCount ?? 14} Kriyas (~{estimatedMins} min)
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {[
                { count: 14, label: '14 Kriyas' },
                { count: 24, label: '24 Kriyas' },
                { count: 30, label: '30 Counts ✨' },
                { count: 36, label: '36 Kriyas' },
                { count: 72, label: '72 Kriyas' },
              ].map((item) => {
                const isSelected = (stage.kriyaCount ?? 14) === item.count;
                return (
                  <button
                    key={item.count}
                    type="button"
                    onClick={() => onUpdateKriyas?.(item.count)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-300 text-slate-900 font-bold shadow-md ring-2 ring-amber-400/50'
                        : 'bg-white/10 hover:bg-white/20 text-white/90'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick presets for Kriya breath counts: 8-3-8, 10-3-8, 12-3-12, 10-3-10, 15-3-15 */}
          <div>
            <div className="text-[11px] font-semibold text-sky-200/90 mb-1 px-0.5">
              Breath Ratio Presets:
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {[
                { label: '8 · 3 · 8', pattern: { inhale: 8, hold: 3, exhale: 8 } },
                { label: '10 · 3 · 8', pattern: { inhale: 10, hold: 3, exhale: 8 } },
                { label: '10 · 3 · 10 (Default)', pattern: { inhale: 10, hold: 3, exhale: 10 } },
                { label: '12 · 3 · 12', pattern: { inhale: 12, hold: 3, exhale: 12 } },
                { label: '15 · 3 · 15', pattern: { inhale: 15, hold: 3, exhale: 15 } },
              ].map((p, idx) => {
                const isActive =
                  currentPattern.inhale === p.pattern.inhale &&
                  currentPattern.hold === p.pattern.hold &&
                  currentPattern.exhale === p.pattern.exhale;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onUpdateBreathPattern?.(p.pattern)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-amber-300 text-slate-900 font-bold shadow-md ring-2 ring-amber-400/50'
                        : 'bg-white/10 hover:bg-white/20 text-white/90'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Steppers for Inhale, Hold, Exhale counts */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
            {/* Inhale Stepper */}
            <div className="bg-black/20 p-1.5 rounded-xl border border-white/10">
              <span className="text-[10px] uppercase font-bold text-sky-300 block mb-1">
                Inhale (Spine Up)
              </span>
              <div className="flex items-center justify-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleUpdateSingleBreathCount('inhale', -1)}
                  className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-sm font-bold cursor-pointer"
                >
                  −
                </button>
                <span className="font-extrabold text-sm tabular-nums w-6">
                  {currentPattern.inhale}
                </span>
                <button
                  type="button"
                  onClick={() => handleUpdateSingleBreathCount('inhale', 1)}
                  className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-sm font-bold cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Hold Stepper */}
            <div className="bg-black/20 p-1.5 rounded-xl border border-white/10">
              <span className="text-[10px] uppercase font-bold text-amber-300 block mb-1">
                Hold (Kutastha)
              </span>
              <div className="flex items-center justify-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleUpdateSingleBreathCount('hold', -1)}
                  className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-sm font-bold cursor-pointer"
                >
                  −
                </button>
                <span className="font-extrabold text-sm tabular-nums w-6">
                  {currentPattern.hold}
                </span>
                <button
                  type="button"
                  onClick={() => handleUpdateSingleBreathCount('hold', 1)}
                  className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-sm font-bold cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Exhale Stepper */}
            <div className="bg-black/20 p-1.5 rounded-xl border border-white/10">
              <span className="text-[10px] uppercase font-bold text-emerald-300 block mb-1">
                Exhale (Spine Down)
              </span>
              <div className="flex items-center justify-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleUpdateSingleBreathCount('exhale', -1)}
                  className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-sm font-bold cursor-pointer"
                >
                  −
                </button>
                <span className="font-extrabold text-sm tabular-nums w-6">
                  {currentPattern.exhale}
                </span>
                <button
                  type="button"
                  onClick={() => handleUpdateSingleBreathCount('exhale', 1)}
                  className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-sm font-bold cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slider for count of rounds (for breathing) or duration (for others) */}
      <div className="mt-3.5 flex items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto px-1">
        {/* Minus Button */}
        <button
          type="button"
          onClick={handleDecrement}
          aria-label={isBreathCount ? 'Decrease breath count' : 'Decrease time'}
          className="w-10 h-10 rounded-full flex items-center justify-center text-2xl font-bold hover:bg-white/15 active:scale-90 transition-all cursor-pointer border border-white/20"
        >
          −
        </button>

        {/* Slider Input */}
        <div className="flex-1 relative flex items-center">
          <input
            type="range"
            min={minVal}
            max={maxVal}
            step={isBreathCount ? 1 : isKriyaCount ? (incrementStep === 5 ? 7 : 1) : incrementStep}
            value={currentVal}
            onChange={handleSliderChange}
            aria-label={isBreathCount ? 'Adjust number of breath rounds' : 'Adjust duration or count'}
            className="w-full cursor-pointer"
          />
        </div>

        {/* Plus Button */}
        <button
          type="button"
          onClick={handleIncrement}
          aria-label={isBreathCount ? 'Increase breath count' : 'Increase time'}
          className="w-10 h-10 rounded-full flex items-center justify-center text-2xl font-bold hover:bg-white/15 active:scale-90 transition-all cursor-pointer border border-white/20"
        >
          +
        </button>
      </div>

      {/* Target description text below slider */}
      <div className="mt-1 text-center text-xs opacity-75">
        {isBreathCount
          ? `Target: ${currentRounds} breath rounds (${currentPattern.inhale}·${currentPattern.hold}·${currentPattern.exhale}) ~${estimatedMins} min`
          : isKriyaCount
          ? `Target: ${stage.kriyaCount ?? 14} Kriyas (${currentPattern.inhale}·${currentPattern.hold}·${currentPattern.exhale}) ~${estimatedMins} min`
          : `Duration: ${stage.minutes} minute${stage.minutes > 1 ? 's' : ''}`}
      </div>

      {/* Dedicated Media Picker when Chant, Affirmation, or Sacred Voice stage is selected */}
      {(isChant || isAffirmation || isSacredVoice) && (
        <div className="mt-2.5 p-2.5 bg-black/40 rounded-2xl border border-amber-400/35 space-y-2 text-left">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
              <Youtube className="w-3.5 h-3.5 text-red-400" />
              <span>
                {isAffirmation
                  ? 'Scientific Affirmation:'
                  : isSacredVoice
                  ? 'Sacred Voice Talk:'
                  : 'Cosmic Chant:'}
              </span>
            </span>
            {onOpenCustomMediaModal && (
              <button
                type="button"
                onClick={onOpenCustomMediaModal}
                className="text-[10px] text-sky-300 hover:text-white underline cursor-pointer"
              >
                + Custom URL / Preview
              </button>
            )}
          </div>

          <div className="relative">
            <select
              value={stage.customMedia?.url || ''}
              onChange={(e) => {
                const targetUrl = e.target.value;
                if (!targetUrl) return;
                const pool = isAffirmation
                  ? (STAGE_MEDIA_PRESETS.affirmation || [])
                  : isSacredVoice
                  ? ((STAGE_MEDIA_PRESETS as any).sacred_voices || [])
                  : (STAGE_MEDIA_PRESETS.chant || []);
                const matchedPreset = pool.find((p: any) => p.url === targetUrl);
                if (matchedPreset && onSelectMediaPreset) {
                  onSelectMediaPreset(matchedPreset);
                }
              }}
              aria-label={
                isAffirmation
                  ? 'Select Scientific Affirmation'
                  : isSacredVoice
                  ? 'Select Sacred Voice'
                  : 'Select Cosmic Chant'
              }
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700/80 focus:border-amber-400 text-xs text-amber-200 font-medium rounded-xl outline-none cursor-pointer truncate"
            >
              {isAffirmation ? (
                <optgroup label="✨ Scientific Healing Affirmations (Paramahansa Yogananda)">
                  {STAGE_MEDIA_PRESETS.affirmation?.map((preset) => (
                    <option key={preset.id} value={preset.url}>
                      {preset.title}
                    </option>
                  ))}
                </optgroup>
              ) : isSacredVoice ? (
                <optgroup label="🎙️ Sacred Voices (Paramahansa Yogananda & Direct Disciples)">
                  {((STAGE_MEDIA_PRESETS as any).sacred_voices || []).map((preset: any) => (
                    <option key={preset.id} value={preset.url}>
                      {preset.title}
                    </option>
                  ))}
                </optgroup>
              ) : (
                <optgroup label="✨ SRF Cosmic Chants (Paramahansa Yogananda)">
                  {STAGE_MEDIA_PRESETS.chant?.map((preset) => (
                    <option key={preset.id} value={preset.url}>
                      {preset.title}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Play till music is over toggle */}
          <div className="pt-1 border-t border-white/10 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-amber-200">
              <input
                type="checkbox"
                checked={isPlayUntilFinished}
                onChange={(e) => onTogglePlayUntilFinished?.(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-white/30 bg-black/50 cursor-pointer"
              />
              <span>Play till music is over</span>
            </label>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium">
              {isPlayUntilFinished ? '✓ Auto-Advance' : 'Fixed Time'}
            </span>
          </div>
          <p className="text-[10px] text-slate-300/80 leading-tight">
            {isPlayUntilFinished
              ? 'Plays until the sacred track completes, then rings the bell and moves to next stage.'
              : `Runs for ${stage.minutes} minutes regardless of track length.`}
          </p>
        </div>
      )}

      {/* Soundscape & Custom Media pill triggers */}
      <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={onOpenSoundscapeModal}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-black/25 hover:bg-black/40 text-current opacity-95 transition-all border border-white/20 cursor-pointer"
        >
          <span>{currentSound.icon}</span>
          <span className="truncate max-w-[150px]">Sound: {currentSound.name}</span>
          <SlidersHorizontal className="w-3 h-3 ml-0.5 opacity-80" />
        </button>

        {/* Custom YouTube / MP3 pill button */}
        {onOpenCustomMediaModal && (
          <button
            type="button"
            onClick={onOpenCustomMediaModal}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all border cursor-pointer ${
              stage.customMedia?.enabled && stage.customMedia.url
                ? 'bg-red-500/25 hover:bg-red-500/35 text-red-200 border-red-400/60 shadow-sm'
                : isPrayer || stage.id === 'chant'
                ? 'bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 border-amber-400/40'
                : 'bg-black/25 hover:bg-black/40 text-current opacity-95 border-white/20'
            }`}
            title="Configure custom YouTube or MP3 link for this stage"
          >
            <Youtube className="w-3.5 h-3.5 text-red-400" />
            <span className="truncate max-w-[160px]">
              {stage.customMedia?.enabled && stage.customMedia.url
                ? `Link: ${stage.customMedia.title || 'Custom Media'}`
                : isPrayer || stage.id === 'chant'
                ? '🎵 YouTube / MP3'
                : 'Custom Audio'}
            </span>
          </button>
        )}
      </div>

      {/* Bottom: Big Start Pill Button */}
      <div className="mt-4 flex flex-col items-center justify-center gap-2">
        <button
          type="button"
          onClick={onStart}
          className={`w-full max-w-[280px] active:scale-[0.97] text-lg py-3 px-8 rounded-full shadow-xl transition-all duration-150 cursor-pointer text-center ${theme.startButton}`}
        >
          Start
        </button>
      </div>
    </div>
  );
};
