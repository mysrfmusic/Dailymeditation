import React, { useState, useEffect } from 'react';
import { MeditationStageConfig, BreathPattern } from '../types/meditation';
import { TapIncrementIcon, MalaBeadsIcon } from './Icons';
import { SOUNDSCAPES } from '../utils/soundscapes';
import { STAGE_MEDIA_PRESETS, StageMediaPreset } from '../utils/customMedia';
import {
  Music,
  SlidersHorizontal,
  BookOpen,
  Wind,
  RotateCcw,
  Youtube,
  Play,
  Clock,
  Volume2,
  Sparkles,
  Check,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
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
  onStartFullRoutine?: () => void;
  totalRoutineMinutes?: number;
  onOpenSoundscapeModal: () => void;
  onOpenInfo: () => void;
  onOpenCustomMediaModal?: () => void;
  onSelectMediaPreset?: (preset: StageMediaPreset) => void;
  onTogglePlayUntilFinished?: (val: boolean) => void;
}

export type ControlPanelTab = 'time' | 'sound' | 'guide';

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
  onStartFullRoutine,
  totalRoutineMinutes,
  onOpenSoundscapeModal,
  onOpenInfo,
  onOpenCustomMediaModal,
  onSelectMediaPreset,
  onTogglePlayUntilFinished,
}) => {
  const [activeTab, setActiveTab] = useState<ControlPanelTab>('time');

  const isKriyas = stage.id === 'kriyas';
  const isJyotiMudra = stage.id === 'jyoti_mudra';
  const isBreathing1 = stage.id === 'breathing_1';
  const isBreathing2 = stage.id === 'breathing_2';
  const isPranayama = isBreathing1 || isBreathing2 || isJyotiMudra;
  const isBreathing = isPranayama && Boolean(stage.breathPattern);
  const isKriyaCount = isKriyas && stage.isCountBased && stage.kriyaCount !== undefined;
  const isBreathCount = isBreathing && stage.isCountBased;
  const isPrayer = Boolean(stage.techniqueGuide?.prayerText);
  const isChant = stage.stageType === 'chant' || stage.id === 'chant' || stage.id.startsWith('chant_');
  const isAffirmation = stage.stageType === 'affirmation' || stage.id === 'affirmation' || stage.id.startsWith('affirmation_');
  const isSacredVoice = stage.stageType === 'sacred_voices' || stage.id === 'sacred_voices' || stage.id.startsWith('sacred_voices_');
  const isPlayUntilFinished = stage.playUntilFinished ?? (stage.customMedia?.playUntilFinished ?? (isChant || isAffirmation || isSacredVoice));

  // Current breath pattern & rounds
  const currentPattern = stage.breathPattern || {
    inhale: isBreathing1 ? 6 : isBreathing2 ? 8 : isJyotiMudra ? 12 : 10,
    hold: isBreathing1 ? 6 : isBreathing2 ? 8 : 3,
    exhale: isBreathing1 ? 6 : isBreathing2 ? 8 : isJyotiMudra ? 12 : 10,
  };
  const currentRounds = stage.breathRounds ?? (isBreathing1 ? 3 : isBreathing2 ? 6 : isJyotiMudra ? 3 : 6);

  // Soundscape
  const currentSound = SOUNDSCAPES.find((s) => s.id === stage.soundscape) || SOUNDSCAPES[0];

  // Min / Max ranges for slider
  const minVal = isKriyaCount ? 2 : isBreathCount ? 1 : 1;
  const maxVal = isKriyaCount ? 108 : isBreathCount ? (isJyotiMudra ? 12 : 24) : 90;
  const currentVal = isKriyaCount
    ? (stage.kriyaCount ?? 24)
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
    const val = parseInt(e.target.value, 10);
    if (isKriyaCount && onUpdateKriyas) {
      onUpdateKriyas(val);
    } else if (isBreathCount && onUpdateBreathRounds) {
      onUpdateBreathRounds(val);
    } else {
      onUpdateMinutes(val);
    }
  };

  const handleSetEqualCount = (count: number) => {
    if (!onUpdateBreathPattern) return;
    onUpdateBreathPattern({
      inhale: count,
      hold: count,
      exhale: count,
    });
  };

  const handleUpdateSingleBreathCount = (field: 'inhale' | 'hold' | 'exhale', delta: number) => {
    if (!onUpdateBreathPattern) return;
    const nextVal = Math.max(field === 'hold' ? 0 : 2, currentPattern[field] + delta);
    onUpdateBreathPattern({
      ...currentPattern,
      [field]: nextVal,
    });
  };

  const secPerCycle = isKriyas
    ? currentPattern.inhale + currentPattern.hold + currentPattern.exhale
    : isBreathing
    ? currentPattern.inhale + currentPattern.hold + currentPattern.exhale
    : 0;

  const estimatedMins = isKriyaCount
    ? Math.max(1, Math.round(((stage.kriyaCount ?? 24) * secPerCycle) / 60))
    : isBreathCount
    ? Math.max(1, Math.round((currentRounds * secPerCycle) / 60))
    : stage.minutes;

  // Subtitle summary text
  const summaryBadge = isKriyaCount
    ? `${stage.kriyaCount ?? 24} Kriyas (${currentPattern.inhale}·${currentPattern.hold}·${currentPattern.exhale}) ~${estimatedMins}m`
    : isBreathCount
    ? `${currentRounds} Counts (${currentPattern.inhale}·${currentPattern.hold}·${currentPattern.exhale}) ~${estimatedMins}m`
    : isPlayUntilFinished && (isChant || isAffirmation || stage.customMedia?.enabled)
    ? '🎵 Full Track Auto-Advance'
    : `${stage.minutes} minute${stage.minutes > 1 ? 's' : ''}`;

  useEffect(() => {
    if (
      stage.stageType === 'chant' ||
      stage.stageType === 'affirmation' ||
      stage.id === 'chant' ||
      stage.id === 'affirmation' ||
      Boolean(stage.customMedia?.enabled)
    ) {
      setActiveTab('sound');
    }
  }, [stage.id, stage.stageType]);

  return (
    <div
      className={`w-full rounded-3xl p-4 sm:p-5 shadow-2xl relative overflow-hidden select-none transition-all duration-200 border border-white/10 ${theme.controlPanelBg}`}
    >
      {/* Sleek Header: Stage Info + Quick Play */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/10">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-amber-300/90 uppercase tracking-wider">
              Selected Stage
            </span>
            <span aria-hidden="true" className="text-white/30">·</span>
            <span className="text-xs text-slate-300 font-medium truncate">
              {stage.subtitle || 'Kriya Routine'}
            </span>
          </div>

          <h3 className="text-lg sm:text-xl font-bold font-spiritual tracking-wide text-white truncate mt-0.5">
            {stage.title}
          </h3>

          {/* Dedicated YouTube / Music Button for Chant & Affirmation */}
          {isChant || isAffirmation || stage.customMedia?.enabled ? (
            <div className="mt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenCustomMediaModal || (() => setActiveTab('sound'))}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-600/30 hover:bg-red-600/45 text-red-200 border border-red-400/70 shadow-sm cursor-pointer transition-all active:scale-95"
                title="Configure YouTube Chant / Affirmation Audio"
              >
                <Youtube className="w-3.5 h-3.5 text-red-400 fill-current" />
                <span className="truncate max-w-[200px]">
                  {stage.customMedia?.title || (isChant ? 'Cosmic Chant Audio' : 'Healing Affirmation')}
                </span>
              </button>
            </div>
          ) : (
            <div className="text-xs text-amber-300 font-medium mt-0.5 flex items-center gap-2">
              <span>{summaryBadge}</span>
              <span aria-hidden="true" className="text-white/30">·</span>
              <span className="text-slate-300/80">{currentSound.name}</span>
            </div>
          )}
        </div>

        {/* Play This Stage Quick CTA */}
        <button
          type="button"
          onClick={onStart}
          className="shrink-0 py-2 px-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
          title={`Practice ${stage.title} now`}
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Play Stage</span>
        </button>
      </div>

      {/* Sleek Segmented Tab Switcher */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-black/40 rounded-xl mt-3 border border-white/10">
        <button
          type="button"
          onClick={() => setActiveTab('time')}
          className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'time'
              ? 'bg-white/15 text-white shadow-sm font-bold border border-white/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-300" />
          <span>Time & Pace</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sound')}
          className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'sound'
              ? isChant || isAffirmation
                ? 'bg-red-600/35 text-white shadow-md font-bold border border-red-400/80 ring-1 ring-red-400/50'
                : 'bg-white/15 text-white shadow-sm font-bold border border-white/20'
              : isChant || isAffirmation
              ? 'text-red-300 hover:text-white bg-red-600/15 border border-red-400/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          {isChant || isAffirmation ? (
            <Youtube className="w-3.5 h-3.5 text-red-400 fill-current" />
          ) : (
            <Music className="w-3.5 h-3.5 text-amber-300" />
          )}
          <span>{isChant ? 'Chant Audio' : isAffirmation ? 'Affirmation Audio' : 'Sound & Media'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('guide')}
          className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'guide'
              ? 'bg-white/15 text-white shadow-sm font-bold border border-white/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-amber-300" />
          <span>Guide</span>
        </button>
      </div>

      {/* TAB 1: TIME & PACE */}
      {activeTab === 'time' && (
        <div className="mt-3 space-y-3">
          {/* SPECIALIZED KRIYA CONTROLS */}
          {isKriyas && (
            <div className="p-3 bg-black/25 rounded-2xl border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-amber-200 flex items-center gap-1.5">
                  <MalaBeadsIcon className="w-3.5 h-3.5 text-amber-300" />
                  <span>Prescribed Kriyas</span>
                </span>
                <span className="text-[11px] text-slate-300">
                  {stage.kriyaCount ?? 24} Kriyas (~{estimatedMins} min)
                </span>
              </div>

              {/* Prescribed Kriya Counts Presets */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { count: 24, label: '24 (Default)' },
                  { count: 14, label: '14' },
                  { count: 36, label: '36' },
                  { count: 72, label: '72' },
                  { count: 108, label: '108' },
                ].map((item) => {
                  const isSelected = (stage.kriyaCount ?? 24) === item.count;
                  return (
                    <button
                      key={item.count}
                      type="button"
                      onClick={() => onUpdateKriyas?.(item.count)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                          : 'bg-white/10 hover:bg-white/20 text-white/90'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {/* Kriya Breath Ratio Presets */}
              <div className="pt-2 border-t border-white/10">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-300 font-medium">Breath Ratio:</span>
                  <button
                    type="button"
                    onClick={() => onUpdateBreathPattern?.({ inhale: 10, hold: 3, exhale: 10 })}
                    className="text-[11px] text-amber-300/80 hover:text-amber-200 underline flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-2.5 h-2.5" /> 10-3-10 Default
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { label: '10 · 3 · 10 (Default)', pattern: { inhale: 10, hold: 3, exhale: 10 } },
                    { label: '8 · 3 · 8', pattern: { inhale: 8, hold: 3, exhale: 8 } },
                    { label: '10 · 3 · 8', pattern: { inhale: 10, hold: 3, exhale: 8 } },
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
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          isActive
                            ? 'bg-amber-300 text-slate-950 font-bold'
                            : 'bg-white/10 hover:bg-white/20 text-white/90'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Steppers for Inhale, Hold, Exhale */}
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="bg-black/30 p-1.5 rounded-xl border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-sky-300 block mb-1">Inhale</span>
                  <div className="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleUpdateSingleBreathCount('inhale', -1)}
                      className="w-5 h-5 rounded-md bg-white/10 hover:bg-white/20 text-xs font-bold"
                    >
                      −
                    </button>
                    <span className="font-bold text-xs tabular-nums w-5">{currentPattern.inhale}s</span>
                    <button
                      type="button"
                      onClick={() => handleUpdateSingleBreathCount('inhale', 1)}
                      className="w-5 h-5 rounded-md bg-white/10 hover:bg-white/20 text-xs font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="bg-black/30 p-1.5 rounded-xl border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-amber-300 block mb-1">Hold</span>
                  <div className="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleUpdateSingleBreathCount('hold', -1)}
                      className="w-5 h-5 rounded-md bg-white/10 hover:bg-white/20 text-xs font-bold"
                    >
                      −
                    </button>
                    <span className="font-bold text-xs tabular-nums w-5">{currentPattern.hold}s</span>
                    <button
                      type="button"
                      onClick={() => handleUpdateSingleBreathCount('hold', 1)}
                      className="w-5 h-5 rounded-md bg-white/10 hover:bg-white/20 text-xs font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="bg-black/30 p-1.5 rounded-xl border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-emerald-300 block mb-1">Exhale</span>
                  <div className="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleUpdateSingleBreathCount('exhale', -1)}
                      className="w-5 h-5 rounded-md bg-white/10 hover:bg-white/20 text-xs font-bold"
                    >
                      −
                    </button>
                    <span className="font-bold text-xs tabular-nums w-5">{currentPattern.exhale}s</span>
                    <button
                      type="button"
                      onClick={() => handleUpdateSingleBreathCount('exhale', 1)}
                      className="w-5 h-5 rounded-md bg-white/10 hover:bg-white/20 text-xs font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SPECIALIZED JYOTI MUDRA & PRANAYAMA CONTROLS */}
          {isBreathing && !isKriyas && (
            <div className="p-3 bg-black/25 rounded-2xl border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-amber-200 flex items-center gap-1.5">
                  <Wind className="w-3.5 h-3.5 text-amber-300" />
                  <span>
                    {isJyotiMudra
                      ? 'Jyoti Mudra (3 counts · 12-3-12 default)'
                      : isBreathing1
                      ? 'Breathing Ex 1 (6-6-6 default)'
                      : 'Breathing Ex 2 (8-8-8 default)'}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (isJyotiMudra) {
                      onUpdateBreathPattern?.({ inhale: 12, hold: 3, exhale: 12 });
                      onUpdateBreathRounds?.(3);
                    } else if (isBreathing1) {
                      onUpdateBreathPattern?.({ inhale: 6, hold: 6, exhale: 6 });
                      onUpdateBreathRounds?.(3);
                    } else {
                      onUpdateBreathPattern?.({ inhale: 8, hold: 8, exhale: 8 });
                      onUpdateBreathRounds?.(6);
                    }
                  }}
                  className="text-[11px] text-amber-300/80 hover:text-amber-200 underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-2.5 h-2.5" /> Reset Default
                </button>
              </div>

              {/* Presets */}
              <div className="flex flex-wrap items-center gap-1.5">
                {isJyotiMudra ? (
                  [
                    { label: '12 · 3 · 12 (Default)', pattern: { inhale: 12, hold: 3, exhale: 12 } },
                    { label: '10 · 3 · 10', pattern: { inhale: 10, hold: 3, exhale: 10 } },
                    { label: '15 · 3 · 15', pattern: { inhale: 15, hold: 3, exhale: 15 } },
                    { label: '8 · 3 · 8', pattern: { inhale: 8, hold: 3, exhale: 8 } },
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
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          isActive
                            ? 'bg-amber-300 text-slate-950 font-bold'
                            : 'bg-white/10 hover:bg-white/20 text-white/90'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })
                ) : (
                  [
                    { label: '6 · 6 · 6', val: 6 },
                    { label: '8 · 8 · 8', val: 8 },
                    { label: '10 · 10 · 10', val: 10 },
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
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          isActive
                            ? 'bg-amber-300 text-slate-950 font-bold'
                            : 'bg-white/10 hover:bg-white/20 text-white/90'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Steppers */}
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="bg-black/30 p-1.5 rounded-xl border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-sky-300 block mb-1">Inhale</span>
                  <div className="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleUpdateSingleBreathCount('inhale', -1)}
                      className="w-5 h-5 rounded-md bg-white/10 hover:bg-white/20 text-xs font-bold"
                    >
                      −
                    </button>
                    <span className="font-bold text-xs tabular-nums w-5">{currentPattern.inhale}s</span>
                    <button
                      type="button"
                      onClick={() => handleUpdateSingleBreathCount('inhale', 1)}
                      className="w-5 h-5 rounded-md bg-white/10 hover:bg-white/20 text-xs font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="bg-black/30 p-1.5 rounded-xl border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-amber-300 block mb-1">Hold</span>
                  <div className="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleUpdateSingleBreathCount('hold', -1)}
                      className="w-5 h-5 rounded-md bg-white/10 hover:bg-white/20 text-xs font-bold"
                    >
                      −
                    </button>
                    <span className="font-bold text-xs tabular-nums w-5">{currentPattern.hold}s</span>
                    <button
                      type="button"
                      onClick={() => handleUpdateSingleBreathCount('hold', 1)}
                      className="w-5 h-5 rounded-md bg-white/10 hover:bg-white/20 text-xs font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="bg-black/30 p-1.5 rounded-xl border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-emerald-300 block mb-1">Exhale</span>
                  <div className="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleUpdateSingleBreathCount('exhale', -1)}
                      className="w-5 h-5 rounded-md bg-white/10 hover:bg-white/20 text-xs font-bold"
                    >
                      −
                    </button>
                    <span className="font-bold text-xs tabular-nums w-5">{currentPattern.exhale}s</span>
                    <button
                      type="button"
                      onClick={() => handleUpdateSingleBreathCount('exhale', 1)}
                      className="w-5 h-5 rounded-md bg-white/10 hover:bg-white/20 text-xs font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SLIDER & STEPPERS FOR DURATION / COUNTS */}
          <div className="p-3 bg-black/25 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-medium text-slate-300">
                {isKriyaCount
                  ? 'Kriyas Count:'
                  : isBreathCount
                  ? 'Breath Rounds:'
                  : 'Stage Duration:'}
              </span>

              {/* Increment Step Toggle */}
              <button
                type="button"
                onClick={onToggleIncrement}
                className="text-[11px] text-amber-300/80 hover:text-amber-200 underline flex items-center gap-1 cursor-pointer"
                title="Change +/- step increment"
              >
                <TapIncrementIcon className="w-3.5 h-3.5" />
                <span>Step: {isKriyaCount ? (incrementStep === 5 ? '7' : '1') : `${incrementStep}m`}</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleDecrement}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-lg font-bold cursor-pointer border border-white/10"
              >
                −
              </button>

              <div className="flex-1">
                <input
                  type="range"
                  min={minVal}
                  max={maxVal}
                  step={isBreathCount ? 1 : isKriyaCount ? (incrementStep === 5 ? 7 : 1) : incrementStep}
                  value={currentVal}
                  onChange={handleSliderChange}
                  className="w-full cursor-pointer accent-amber-400"
                />
              </div>

              <button
                type="button"
                onClick={handleIncrement}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-lg font-bold cursor-pointer border border-white/10"
              >
                +
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 mt-2 px-1">
              <span>{minVal} {isKriyaCount ? 'kriyas' : isBreathCount ? 'rounds' : 'min'}</span>
              <span className="text-amber-300 font-bold font-spiritual text-base">
                {isKriyaCount
                  ? `${currentVal} Kriyas (~${estimatedMins} min)`
                  : isBreathCount
                  ? `${currentVal} Rounds (~${estimatedMins} min)`
                  : `${currentVal} Minutes`}
              </span>
              <span>{maxVal} {isKriyaCount ? 'kriyas' : isBreathCount ? 'rounds' : 'min'}</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SOUND & MEDIA */}
      {activeTab === 'sound' && (
        <div className="mt-3 space-y-3">
          {/* Soundscape Card */}
          <div className="p-3 bg-black/25 rounded-2xl border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-amber-300" />
                <span>Ambient Soundscape</span>
              </span>
              <button
                type="button"
                onClick={onOpenSoundscapeModal}
                className="text-xs text-amber-300 hover:text-amber-200 underline font-medium cursor-pointer"
              >
                Change Soundscape
              </button>
            </div>

            <div
              onClick={onOpenSoundscapeModal}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between cursor-pointer transition-all"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{currentSound.icon}</span>
                <div>
                  <div className="text-xs font-bold text-white">{currentSound.name}</div>
                  <div className="text-[11px] text-slate-400">{currentSound.description}</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>Bells: Temple Gongs & Bowls</span>
              <span className="text-amber-300 font-medium">Auto-Chimes on Stage Switch</span>
            </div>
          </div>

          {/* YouTube / Custom Media Section */}
          <div className="p-3 bg-black/25 rounded-2xl border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-200 flex items-center gap-1.5">
                <Youtube className="w-3.5 h-3.5 text-red-400" />
                <span>
                  {isAffirmation
                    ? 'Scientific Affirmation'
                    : isSacredVoice
                    ? 'Sacred Voice Talk'
                    : isChant
                    ? 'Cosmic Chant'
                    : 'Custom YouTube / MP3'}
                </span>
              </span>

              {onOpenCustomMediaModal && (
                <button
                  type="button"
                  onClick={onOpenCustomMediaModal}
                  className="text-xs text-sky-300 hover:text-sky-200 underline cursor-pointer"
                >
                  Custom URL / Preview
                </button>
              )}
            </div>

            {/* Presets dropdown for Chant / Affirmation / Sacred Voice */}
            {(isChant || isAffirmation || isSacredVoice) && (
              <div className="space-y-2">
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
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 focus:border-amber-400 text-xs text-amber-200 font-medium rounded-xl outline-none cursor-pointer truncate"
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

                {/* Play till music is over toggle */}
                <div className="p-2 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-amber-200">
                    <input
                      type="checkbox"
                      checked={isPlayUntilFinished}
                      onChange={(e) => onTogglePlayUntilFinished?.(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-white/30 bg-black/50 cursor-pointer"
                    />
                    <span>Play until track finishes</span>
                  </label>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium">
                    {isPlayUntilFinished ? '✓ Auto-Advance' : 'Fixed Duration'}
                  </span>
                </div>
              </div>
            )}

            {/* If not a chant/affirmation, show custom media link affordance */}
            {!isChant && !isAffirmation && !isSacredVoice && (
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>
                  {stage.customMedia?.enabled && stage.customMedia.url
                    ? `Linked: ${stage.customMedia.title || 'YouTube / Audio'}`
                    : 'No external media attached'}
                </span>
                {onOpenCustomMediaModal && (
                  <button
                    type="button"
                    onClick={onOpenCustomMediaModal}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-white cursor-pointer"
                  >
                    {stage.customMedia?.enabled ? 'Edit Link' : '+ Add Audio'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: TECHNIQUE GUIDE */}
      {activeTab === 'guide' && (
        <div className="mt-3 p-3.5 bg-black/25 rounded-2xl border border-white/10 space-y-3 max-h-[300px] overflow-y-auto text-xs text-slate-200">
          {/* Sacred Prayer Words */}
          {stage.techniqueGuide?.prayerText && (
            <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/30">
              <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block mb-1">
                Sacred Words
              </span>
              <p className="font-spiritual italic text-sm text-amber-100 leading-relaxed whitespace-pre-line">
                {stage.techniqueGuide.prayerText}
              </p>
            </div>
          )}

          {/* Affirmation Text */}
          {stage.techniqueGuide?.affirmationText && (
            <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/30">
              <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block mb-1">
                Scientific Affirmation
              </span>
              <p className="font-spiritual italic text-sm text-amber-100 leading-relaxed whitespace-pre-line">
                {stage.techniqueGuide.affirmationText}
              </p>
            </div>
          )}

          {/* Core Technique Steps */}
          {stage.techniqueGuide?.instructions && stage.techniqueGuide.instructions.length > 0 && (
            <div>
              <span className="text-[10px] font-bold text-sky-300 uppercase tracking-wider block mb-1.5">
                Technique Instructions
              </span>
              <ul className="space-y-1.5 pl-3 list-disc text-slate-300 leading-relaxed">
                {stage.techniqueGuide.instructions.map((step: string, idx: number) => (
                  <li key={idx}>{step}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Purpose & Posture */}
          {stage.techniqueGuide?.purpose && (
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-200">Purpose: </span>
                <span className="text-slate-300">{stage.techniqueGuide.purpose}</span>
              </div>
            </div>
          )}

          {stage.techniqueGuide?.posture && (
            <div className="text-[11px] text-slate-400">
              <span className="font-semibold text-slate-300">Posture: </span>
              <span>{stage.techniqueGuide.posture}</span>
            </div>
          )}

          {/* Full modal link */}
          <div className="pt-1 text-right">
            <button
              type="button"
              onClick={onOpenInfo}
              className="text-xs text-sky-300 hover:text-white underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Read Full Guidelines & Cautions</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Bottom Action Footer */}
      <div className="mt-4 pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <button
          type="button"
          onClick={onStart}
          className="w-full sm:w-auto flex-1 py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 active:scale-98 text-white font-semibold text-xs flex items-center justify-center gap-2 border border-white/20 transition-all cursor-pointer"
        >
          <Play className="w-3.5 h-3.5" />
          <span>Play {stage.title} Only</span>
        </button>

        {onStartFullRoutine && (
          <button
            type="button"
            onClick={onStartFullRoutine}
            className="w-full sm:w-auto flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 hover:brightness-105 active:scale-98 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer border border-amber-300"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Begin Full Routine ({totalRoutineMinutes || 54}m)</span>
          </button>
        )}
      </div>
    </div>
  );
};
