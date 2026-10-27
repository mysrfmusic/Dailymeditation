/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  StageId,
  MeditationStageConfig,
  AppTheme,
  BreathPattern,
  CustomMediaConfig,
} from './types/meditation';
import { INITIAL_STAGES, STAGE_ORDER } from './data/stages';
import { soundEngine, SoundscapeType } from './utils/soundscapes';
import { backgroundKeepalive } from './utils/backgroundKeepalive';
import { THEMES } from './utils/theme';
import { StageCard } from './components/StageCard';
import { ControlPanel } from './components/ControlPanel';
import { SoundscapeSelectorModal } from './components/SoundscapeSelectorModal';
import { TechniqueInfoModal } from './components/TechniqueInfoModal';
import { ActiveSessionModal } from './components/ActiveSessionModal';
import { GitHubPagesModal } from './components/GitHubPagesModal';
import { ThemeSelectorModal } from './components/ThemeSelectorModal';
import { CustomMediaModal } from './components/CustomMediaModal';
import { ChantAffirmationTab } from './components/ChantAffirmationTab';
import { ThirtyCountsCard } from './components/ThirtyCountsCard';
import { LotusIcon } from './components/Icons';
import {
  Play,
  RotateCcw,
  Globe,
  Palette,
  Info,
  Sparkles,
  LayoutGrid,
  ListOrdered,
  ChevronRight,
  Music,
  ArrowLeft,
  Youtube,
  Zap,
} from 'lucide-react';

const STORAGE_KEY = 'kriya_meditation_stages_v17';
const SEQUENCE_KEY = 'kriya_sequence_order_v17';
const INCREMENT_KEY = 'kriya_increment_step_v17';
const THEME_KEY = 'kriya_app_theme_v17';

export default function App() {
  // Theme state: defaults to spiritual_eye matching the uploaded Spiritual Eye photo
  const [currentTheme, setCurrentTheme] = useState<AppTheme>(() => {
    try {
      const saved =
        localStorage.getItem(THEME_KEY) ||
        localStorage.getItem('kriya_app_theme_v16') ||
        localStorage.getItem('kriya_app_theme_v15') ||
        localStorage.getItem('kriya_app_theme_v14') ||
        localStorage.getItem('kriya_app_theme_v13') ||
        localStorage.getItem('kriya_app_theme_v12');
      if (saved && saved in THEMES) return saved as AppTheme;
    } catch {}
    return 'spiritual_eye';
  });

  // View mode: 'routine' (main 17 stages flow) vs 'thirty_counts' (independent practice)
  const [activeView, setActiveView] = useState<'routine' | 'thirty_counts'>('routine');

  // Stages display layout mode: 'grid' vs 'list'
  const [stageLayoutMode, setStageLayoutMode] = useState<'grid' | 'list'>('grid');

  // Load saved stages or defaults
  const [stages, setStages] = useState<Record<string, MeditationStageConfig>>(() => {
    try {
      const isExistingV17 = Boolean(localStorage.getItem(STORAGE_KEY));
      const saved =
        localStorage.getItem(STORAGE_KEY) ||
        localStorage.getItem('kriya_meditation_stages_v16') ||
        localStorage.getItem('kriya_meditation_stages_v15') ||
        localStorage.getItem('kriya_meditation_stages_v14') ||
        localStorage.getItem('kriya_meditation_stages_v13');
      if (saved) {
        const parsed = JSON.parse(saved);
        const merged = { ...INITIAL_STAGES, ...parsed };

        if (!isExistingV17) {
          // Upgrade to user requested defaults: Opening & Closing Prayer 5 mins, 24 Kriyas, Jyoti Mudra 12-3-12 (3 counts)
          if (merged.opening_prayer) {
            merged.opening_prayer = {
              ...merged.opening_prayer,
              minutes: 5,
            };
          }
          if (merged.closing_prayer) {
            merged.closing_prayer = {
              ...merged.closing_prayer,
              minutes: 5,
            };
          }
          if (merged.kriyas) {
            merged.kriyas = {
              ...merged.kriyas,
              kriyaCount: 24,
              secondsPerKriya: 23,
              minutes: 9,
              isCountBased: true,
              breathPattern: merged.kriyas.breathPattern || { inhale: 10, hold: 3, exhale: 10 },
            };
          }
          if (merged.jyoti_mudra) {
            merged.jyoti_mudra = {
              ...merged.jyoti_mudra,
              isCountBased: true,
              breathRounds: 3,
              kriyaCount: 3,
              secondsPerKriya: 27,
              breathPattern: { inhale: 12, hold: 3, exhale: 12 },
              minutes: 2,
            };
          }
          if (!merged.affirmation) {
            merged.affirmation = INITIAL_STAGES.affirmation;
          }
        }
        return merged;
      }
    } catch {}
    return INITIAL_STAGES;
  });

  // Sequence ordering (drag & drop reorderable, supports multiple Chants & Affirmations)
  const [sequenceOrder, setSequenceOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(SEQUENCE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Ensure affirmation is present right after chant if not already present
          if (!parsed.includes('affirmation')) {
            const chantIdx = parsed.indexOf('chant');
            if (chantIdx !== -1) {
              parsed.splice(chantIdx + 1, 0, 'affirmation');
            } else {
              parsed.push('affirmation');
            }
          }
          return parsed;
        }
      }
    } catch {}
    return STAGE_ORDER;
  });

  // Selected stage in the grid (default: Kriyas)
  const [selectedStageId, setSelectedStageId] = useState<StageId>('kriyas');

  // Increment step for the slider (1 or 5 minutes)
  const [incrementStep, setIncrementStep] = useState<1 | 5>(() => {
    try {
      const saved = localStorage.getItem(INCREMENT_KEY) || localStorage.getItem('kriya_increment_step_v9');
      if (saved === '1' || saved === '5') return Number(saved) as 1 | 5;
    } catch {}
    return 5;
  });

  // Modals state
  const [soundscapeModalOpen, setSoundscapeModalOpen] = useState<boolean>(false);
  const [customMediaModalOpen, setCustomMediaModalOpen] = useState<boolean>(false);
  const [customMediaModalStageId, setCustomMediaModalStageId] = useState<string>('chant');
  const [chantAffirmationModalOpen, setChantAffirmationModalOpen] = useState<boolean>(false);
  const [infoModalStage, setInfoModalStage] = useState<MeditationStageConfig | null>(null);
  const [ghPagesModalOpen, setGhPagesModalOpen] = useState<boolean>(false);
  const [themeModalOpen, setThemeModalOpen] = useState<boolean>(false);

  // Active Session Player State
  const [activePlayerOpen, setActivePlayerOpen] = useState<boolean>(false);
  const [isSequenceMode, setIsSequenceMode] = useState<boolean>(false);

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stages));
    } catch {}
  }, [stages]);

  useEffect(() => {
    try {
      localStorage.setItem(SEQUENCE_KEY, JSON.stringify(sequenceOrder));
    } catch {}
  }, [sequenceOrder]);

  useEffect(() => {
    try {
      localStorage.setItem(INCREMENT_KEY, String(incrementStep));
    } catch {}
  }, [incrementStep]);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, currentTheme);
    } catch {}
  }, [currentTheme]);

  // Selected stage reference and active theme config
  const selectedStage = stages[selectedStageId] || stages['kriyas'] || Object.values(stages)[0];
  const activeThemeConfig = THEMES[currentTheme] || THEMES['celestial_twilight'];

  // Calculate total routine duration in minutes
  const totalRoutineMinutes = sequenceOrder.reduce((acc, id) => {
    const s = stages[id];
    return acc + (s?.minutes || 0);
  }, 0);

  // Handler: Toggle increment between 1 and 5 minutes
  const handleToggleIncrement = () => {
    setIncrementStep((prev) => (prev === 5 ? 1 : 5));
  };

  // Handler: Update minutes for the selected stage
  const handleUpdateMinutes = (newMinutes: number) => {
    setStages((prev) => {
      const current = prev[selectedStageId];
      let nextKriyaCount = current.kriyaCount;
      if (selectedStageId === 'kriyas' && current.isCountBased) {
        const secPerKriya =
          current.secondsPerKriya ||
          (current.breathPattern
            ? current.breathPattern.inhale + current.breathPattern.hold + current.breathPattern.exhale
            : 23);
        nextKriyaCount = Math.max(2, Math.round((newMinutes * 60) / secPerKriya));
      }
      return {
        ...prev,
        [selectedStageId]: {
          ...current,
          minutes: newMinutes,
          kriyaCount: nextKriyaCount,
        },
      };
    });
  };

  // Handler: Update Kriya count for Kriyas stage
  const handleUpdateKriyas = (newCount: number) => {
    setStages((prev) => {
      const current = prev['kriyas'];
      const pattern = current.breathPattern || { inhale: 10, hold: 3, exhale: 10 };
      const secPerKriya = pattern.inhale + pattern.hold + pattern.exhale;
      const calculatedMins = Math.max(1, Math.round((newCount * secPerKriya) / 60));
      return {
        ...prev,
        kriyas: {
          ...current,
          kriyaCount: newCount,
          secondsPerKriya: secPerKriya,
          minutes: calculatedMins,
        },
      };
    });
  };

  // Handler: Toggle Kriyas between count mode (Mala beads) and simple minutes
  const handleToggleCountMode = () => {
    setStages((prev) => {
      const current = prev['kriyas'];
      return {
        ...prev,
        kriyas: {
          ...current,
          isCountBased: !current.isCountBased,
        },
      };
    });
  };

  // Handler: Update breath pattern for breathing exercises and kriyas
  const handleUpdateBreathPattern = (pattern: BreathPattern) => {
    setStages((prev) => {
      const current = prev[selectedStageId];
      if (selectedStageId === 'kriyas') {
        const kCount = current.kriyaCount ?? 24;
        const totalSec = pattern.inhale + pattern.hold + pattern.exhale;
        const calculatedMins = Math.max(1, Math.round((kCount * totalSec) / 60));
        return {
          ...prev,
          kriyas: {
            ...current,
            breathPattern: pattern,
            secondsPerKriya: totalSec,
            minutes: calculatedMins,
          },
        };
      }
      const rounds = current.breathRounds ?? (selectedStageId === 'breathing_1' ? 3 : 6);
      const totalSec = pattern.inhale + pattern.hold + pattern.exhale;
      const calculatedMins = Math.max(1, Math.round((rounds * totalSec) / 60));
      return {
        ...prev,
        [selectedStageId]: {
          ...current,
          breathPattern: pattern,
          minutes: calculatedMins,
        },
      };
    });
  };

  // Handler: Update number of breath rounds for breathing exercises
  const handleUpdateBreathRounds = (rounds: number) => {
    setStages((prev) => {
      const current = prev[selectedStageId];
      const pattern = current.breathPattern || {
        inhale: selectedStageId === 'breathing_1' ? 6 : 8,
        hold: selectedStageId === 'breathing_1' ? 6 : 8,
        exhale: selectedStageId === 'breathing_1' ? 6 : 8,
      };
      const totalSec = pattern.inhale + pattern.hold + pattern.exhale;
      const calculatedMins = Math.max(1, Math.round((rounds * totalSec) / 60));
      return {
        ...prev,
        [selectedStageId]: {
          ...current,
          breathRounds: rounds,
          minutes: calculatedMins,
        },
      };
    });
  };

  // Handler: Save customized stage settings (soundscape, volume, bells)
  const handleSaveStageConfig = (updated: Partial<MeditationStageConfig>) => {
    setStages((prev) => ({
      ...prev,
      [selectedStageId]: {
        ...prev[selectedStageId],
        ...updated,
      },
    }));
  };

  // Handler: Apply soundscape to all stages
  const handleApplyToAllStages = (soundscape: SoundscapeType, volume: number) => {
    setStages((prev) => {
      const next = { ...prev };
      STAGE_ORDER.forEach((id) => {
        next[id] = {
          ...next[id],
          soundscape,
          soundscapeVolume: volume,
        };
      });
      return next;
    });
  };

  // Handler: Save customized YouTube / MP3 media settings
  const handleSaveCustomMedia = (stageId: StageId, mediaConfig: CustomMediaConfig | undefined) => {
    setStages((prev) => {
      const current = prev[stageId];
      if (!current) return prev;
      return {
        ...prev,
        [stageId]: {
          ...current,
          customMedia: mediaConfig,
          techniqueGuide: {
            ...current.techniqueGuide,
            affirmationText: mediaConfig?.affirmationText ?? current.techniqueGuide?.affirmationText,
          },
        },
      };
    });
  };

  // Handler: Add a new stage to sequence (Chant, Affirmation, etc.)
  const handleAddStage = (newStage: MeditationStageConfig, insertIndex?: number) => {
    setStages((prev) => ({
      ...prev,
      [newStage.id]: newStage,
    }));
    setSequenceOrder((prev) => {
      const next = [...prev];
      if (insertIndex !== undefined && insertIndex >= 0 && insertIndex <= next.length) {
        next.splice(insertIndex, 0, newStage.id);
      } else {
        next.push(newStage.id);
      }
      return next;
    });
    setSelectedStageId(newStage.id);
  };

  // Handler: Remove a custom added stage
  const handleRemoveStage = (stageId: string) => {
    setSequenceOrder((prev) => prev.filter((id) => id !== stageId));
    setStages((prev) => {
      const next = { ...prev };
      delete next[stageId];
      return next;
    });
    if (selectedStageId === stageId) {
      setSelectedStageId('kriyas');
    }
  };

  // Handler: Reorder sequence order (Drag & Drop or up/down arrows)
  const handleReorderSequence = (newOrder: string[]) => {
    setSequenceOrder(newOrder);
  };

  // Handler: Toggle play until music is finished for a stage
  const handleTogglePlayUntilFinished = (stageId: string, val: boolean) => {
    setStages((prev) => {
      const current = prev[stageId];
      if (!current) return prev;
      return {
        ...prev,
        [stageId]: {
          ...current,
          playUntilFinished: val,
          customMedia: current.customMedia
            ? { ...current.customMedia, playUntilFinished: val }
            : undefined,
        },
      };
    });
  };

  // Handler: Reset all stages to default values
  const handleResetToDefaults = () => {
    if (window.confirm('Reset all timer durations, sequence, and soundscapes back to original defaults?')) {
      setStages(INITIAL_STAGES);
      setSequenceOrder(STAGE_ORDER);
      setIncrementStep(5);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(SEQUENCE_KEY);
    }
  };

  // Handler: Start single session
  const handleStartSingleSession = () => {
    backgroundKeepalive.requestWakeLock();
    backgroundKeepalive.startAudioKeepalive();
    setIsSequenceMode(false);
    setActivePlayerOpen(true);
  };

  // Handler: Start full sequence routine
  const handleStartFullRoutine = () => {
    backgroundKeepalive.requestWakeLock();
    backgroundKeepalive.startAudioKeepalive();
    setIsSequenceMode(true);
    setSelectedStageId(sequenceOrder[0] || 'exercises');
    setActivePlayerOpen(true);
  };

  // Handler: Start independent 30 Counts practice
  const handleStartIndependentThirtyCounts = (stageConfig: MeditationStageConfig) => {
    backgroundKeepalive.requestWakeLock();
    backgroundKeepalive.startAudioKeepalive();
    setStages((prev) => ({
      ...prev,
      [stageConfig.id]: stageConfig,
    }));
    setSelectedStageId(stageConfig.id);
    setIsSequenceMode(false);
    setActivePlayerOpen(true);
  };

  // Handler: Add 30 Counts to routine sequence
  const handleAddThirtyCountsToRoutine = (stageConfig: MeditationStageConfig) => {
    setStages((prev) => ({
      ...prev,
      [stageConfig.id]: stageConfig,
    }));
    setSequenceOrder((prev) => [...prev, stageConfig.id]);
  };

  return (
    <div
      className={`min-h-screen ${activeThemeConfig.bgClass} flex flex-col justify-between antialiased transition-colors duration-300`}
    >
      {/* Top Bar Header following 3-Zone Contract */}
      <header
        className={`w-full ${activeThemeConfig.headerBg} border-b border-white/10 sticky top-0 z-30 shadow-sm backdrop-blur-md transition-colors duration-300`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Zone 1: Single text element Brand Wordmark & Lotus */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="p-1 rounded-full bg-amber-400/15 text-amber-300">
              <LotusIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </span>
            <span className="text-base sm:text-lg font-bold font-spiritual tracking-wide text-slate-100 whitespace-nowrap">
              Kriya Meditation
            </span>
          </div>

          {/* Zone 2: Navigation Segments / Workspace Modes */}
          <nav className="flex items-center gap-1 p-1 bg-black/40 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setActiveView('routine')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeView === 'routine'
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Full Routine ({sequenceOrder.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveView('thirty_counts')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                activeView === 'thirty_counts'
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>30 Counts</span>
            </button>

            <button
              type="button"
              onClick={() => setChantAffirmationModalOpen(true)}
              className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer whitespace-nowrap hidden sm:flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Chants & Library</span>
            </button>
          </nav>

          {/* Zone 3: 1 Primary CTA or Clean Utility Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Color & Style Theme Switcher */}
            <button
              type="button"
              onClick={() => setThemeModalOpen(true)}
              className="p-2 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              title={`Switch Theme (Current: ${activeThemeConfig.name})`}
              aria-label="Color and Theme"
            >
              <Palette className="w-4 h-4" />
            </button>

            {/* GitHub Pages Modal trigger */}
            <button
              type="button"
              onClick={() => setGhPagesModalOpen(true)}
              className="p-2 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              title="GitHub Pages & Offline PWA details"
              aria-label="App info"
            >
              <Globe className="w-4 h-4" />
            </button>

            {/* Reset to defaults */}
            <button
              type="button"
              onClick={handleResetToDefaults}
              className="p-2 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              title="Reset all settings to defaults"
              aria-label="Reset to defaults"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-start py-5 px-3 sm:px-6 w-full">
        {/* VIEW 1: FULL SACRED ROUTINE (Responsive 2-Column on Desktop) */}
        {activeView === 'routine' && (
          <div className="w-full max-w-6xl flex flex-col gap-5 mx-auto">
            {/* Sleek Hero Routine Header Banner using exact Theme styling */}
            <div className={`w-full p-4 sm:p-5 ${activeThemeConfig.controlPanelBg} rounded-3xl shadow-xl backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4 border`}>
              <div className="text-center md:text-left">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs">
                  <span className={`font-bold uppercase tracking-wider ${activeThemeConfig.textAccent} flex items-center gap-1`}>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Sacred Kriya Routine</span>
                  </span>
                  <span aria-hidden="true" className="opacity-40">·</span>
                  <span className={`font-semibold ${activeThemeConfig.textPrimary}`}>
                    {sequenceOrder.length} Stages · {totalRoutineMinutes} min
                  </span>
                  <span aria-hidden="true" className="opacity-40">·</span>
                  <span className={`${activeThemeConfig.textSecondary} hidden sm:inline`}>Temple Bells & Auto-Advance</span>
                </div>

                <h1 className={`text-xl sm:text-2xl font-bold font-spiritual ${activeThemeConfig.textPrimary} tracking-wide mt-1`}>
                  Complete Meditation Practice
                </h1>
                <p className={`text-xs ${activeThemeConfig.textSecondary} mt-0.5`}>
                  Tap any stage to customize duration, breath ratio, or audio track.
                </p>
              </div>

              {/* Action Controls: Layout Switcher + Primary Begin Routine Button */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 w-full md:w-auto shrink-0">
                {/* View toggle (Grid vs Timeline List) */}
                <div className="flex items-center gap-0.5 p-1 bg-black/40 rounded-xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => setStageLayoutMode('grid')}
                    className={`p-2 rounded-lg text-xs transition-colors cursor-pointer ${
                      stageLayoutMode === 'grid'
                        ? 'bg-white/20 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Grid view"
                    aria-label="Grid view"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setStageLayoutMode('list')}
                    className={`p-2 rounded-lg text-xs transition-colors cursor-pointer ${
                      stageLayoutMode === 'list'
                        ? 'bg-white/20 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Timeline list view"
                    aria-label="List view"
                  >
                    <ListOrdered className="w-4 h-4" />
                  </button>
                </div>

                {/* Chants Modal Button on mobile */}
                <button
                  type="button"
                  onClick={() => setChantAffirmationModalOpen(true)}
                  className="sm:hidden py-2 px-3 rounded-xl bg-black/40 hover:bg-black/60 border border-amber-400/30 text-amber-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Library</span>
                </button>

                {/* Primary Focal CTA: Begin Full Routine */}
                <button
                  type="button"
                  onClick={handleStartFullRoutine}
                  className={`w-full sm:w-auto py-3 px-6 rounded-2xl ${activeThemeConfig.startButton} text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl active:scale-[0.98] transition-all cursor-pointer`}
                >
                  <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                  <span>Begin Full Routine ({totalRoutineMinutes} min)</span>
                </button>
              </div>
            </div>

            {/* Desktop 2-Column Split: Left = Stages Flow, Right = Sticky Customizer */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column: Stages Sequence Flow (7 cols on lg) */}
              <div className="lg:col-span-7 flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs text-slate-300 px-1">
                  <span className="font-semibold text-white/90">
                    Routine Stages ({sequenceOrder.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setChantAffirmationModalOpen(true)}
                    className="text-amber-300 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>+ Add / Reorder Stages</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Compact Grid View: 4 cols on mobile, 5-6 cols on tablet/desktop */}
                {stageLayoutMode === 'grid' && (
                  <section
                    aria-label="Meditation Stages Grid"
                    className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-4 xl:grid-cols-5 gap-1.5 sm:gap-2 w-full"
                  >
                    {sequenceOrder.map((stageId, index) => {
                      const stage = stages[stageId];
                      if (!stage) return null;
                      return (
                        <StageCard
                          key={stageId}
                          stage={stage}
                          stageIndex={index + 1}
                          isSelected={selectedStageId === stageId}
                          theme={activeThemeConfig}
                          onSelect={() => setSelectedStageId(stageId)}
                          onOpenInfo={() => setInfoModalStage(stage)}
                        />
                      );
                    })}
                  </section>
                )}

                {/* Timeline List View */}
                {stageLayoutMode === 'list' && (
                  <section
                    aria-label="Meditation Stages Timeline List"
                    className="flex flex-col gap-2 w-full"
                  >
                    {sequenceOrder.map((stageId, index) => {
                      const stage = stages[stageId];
                      if (!stage) return null;
                      const isSelected = selectedStageId === stageId;
                      const isBreathing = Boolean(stage.breathPattern);
                      const isPlayUntil = Boolean(
                        stage.playUntilFinished || stage.customMedia?.playUntilFinished
                      );
                      const displayVal =
                        stage.isCountBased && stage.kriyaCount !== undefined
                          ? `${stage.kriyaCount} kriyas`
                          : stage.isCountBased && stage.breathRounds !== undefined
                          ? `${stage.breathRounds} counts`
                          : isPlayUntil
                          ? 'Full Track'
                          : `${stage.minutes} mins`;

                      return (
                        <div
                          key={stageId}
                          onClick={() => setSelectedStageId(stageId)}
                          className={`p-3 rounded-2xl flex items-center justify-between gap-3 border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-400/15 border-amber-400/70 ring-1 ring-amber-400 shadow-md text-white'
                              : 'bg-black/30 hover:bg-black/45 border-white/10 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="font-mono text-xs font-bold text-amber-300 w-6 shrink-0">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            <div className="min-w-0">
                              <div className="font-bold text-sm text-white truncate">
                                {stage.title}
                              </div>
                              <div className="text-xs text-slate-400 truncate">
                                {stage.subtitle || (isBreathing && stage.breathPattern ? `${stage.breathPattern.inhale}·${stage.breathPattern.hold}·${stage.breathPattern.exhale}` : 'Stage')}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {stage.customMedia?.enabled && (
                              <span className="text-red-400">
                                <Youtube className="w-4 h-4" />
                              </span>
                            )}
                            <span className="text-xs font-bold font-spiritual text-amber-300">
                              {displayVal}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setInfoModalStage(stage);
                              }}
                              className="p-1 rounded-full text-slate-400 hover:text-white"
                              title="Technique Info"
                            >
                              <Info className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </section>
                )}
              </div>

              {/* Right Column: Sticky Tabbed Stage Customizer (5 cols on lg) */}
              <div className="lg:col-span-5 lg:sticky lg:top-20 w-full">
                <ControlPanel
                  stage={selectedStage}
                  incrementStep={incrementStep}
                  theme={activeThemeConfig}
                  onToggleIncrement={handleToggleIncrement}
                  onUpdateMinutes={handleUpdateMinutes}
                  onUpdateKriyas={handleUpdateKriyas}
                  onUpdateBreathRounds={handleUpdateBreathRounds}
                  onUpdateBreathPattern={handleUpdateBreathPattern}
                  onToggleCountMode={handleToggleCountMode}
                  onStart={handleStartSingleSession}
                  onStartFullRoutine={handleStartFullRoutine}
                  totalRoutineMinutes={totalRoutineMinutes}
                  onOpenSoundscapeModal={() => setSoundscapeModalOpen(true)}
                  onOpenInfo={() => setInfoModalStage(selectedStage)}
                  onOpenCustomMediaModal={() => {
                    setCustomMediaModalStageId(selectedStageId);
                    setCustomMediaModalOpen(true);
                  }}
                  onSelectMediaPreset={(preset) => {
                    handleSaveCustomMedia(selectedStageId, {
                      enabled: true,
                      url: preset.url,
                      title: preset.title,
                      type: preset.type === 'youtube' ? 'youtube' : 'mp3',
                      muteSoundscape: true,
                      playUntilFinished: true,
                    });
                  }}
                  onTogglePlayUntilFinished={(val) =>
                    handleTogglePlayUntilFinished(selectedStageId, val)
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: INDEPENDENT 30 COUNTS PRACTICE */}
        {activeView === 'thirty_counts' && (
          <div className="w-full max-w-2xl flex flex-col gap-4 mx-auto animate-fadeIn">
            {/* Back Bar */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveView('routine')}
                className="py-1.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Sacred Routine</span>
              </button>

              <span className="text-xs text-amber-300 font-medium">
                Paramahansa Yogananda 30 Counts Practice
              </span>
            </div>

            {/* Dedicated 30 Counts Card */}
            <ThirtyCountsCard
              theme={activeThemeConfig}
              onStartIndependent={handleStartIndependentThirtyCounts}
              onAddToRoutine={handleAddThirtyCountsToRoutine}
              isInRoutine={sequenceOrder.some((id) => id.startsWith('thirty_counts'))}
            />
          </div>
        )}
      </main>

      {/* Clean Footer */}
      <footer className="w-full py-4 px-4 text-center border-t border-white/5 text-xs text-slate-400/80">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Kriya Yoga Meditation Timer · Paramahansa Yogananda Lineage</span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setGhPagesModalOpen(true)}
              className="hover:text-slate-200 underline cursor-pointer"
            >
              Offline & PWA Guide
            </button>
            <button
              type="button"
              onClick={() => setThemeModalOpen(true)}
              className="hover:text-slate-200 underline cursor-pointer"
            >
              Themes
            </button>
          </div>
        </div>
      </footer>

      {/* Modals & Dialogs */}
      <SoundscapeSelectorModal
        isOpen={soundscapeModalOpen}
        stage={selectedStage}
        onClose={() => setSoundscapeModalOpen(false)}
        onSaveStageConfig={handleSaveStageConfig}
        onApplyToAllStages={handleApplyToAllStages}
      />

      <CustomMediaModal
        isOpen={customMediaModalOpen}
        stage={stages[customMediaModalStageId] || null}
        stages={stages}
        onClose={() => setCustomMediaModalOpen(false)}
        onSaveMedia={handleSaveCustomMedia}
      />

      <ChantAffirmationTab
        isOpen={chantAffirmationModalOpen}
        stages={stages}
        sequenceOrder={sequenceOrder}
        theme={activeThemeConfig}
        onClose={() => setChantAffirmationModalOpen(false)}
        onAddStage={handleAddStage}
        onRemoveStage={handleRemoveStage}
        onReorderSequence={handleReorderSequence}
        onUpdateStageConfig={(stageId: string, updates: Partial<MeditationStageConfig>) => {
          setStages((prev) => ({
            ...prev,
            [stageId]: { ...prev[stageId], ...updates },
          }));
        }}
        onSelectStage={(stageId: string) => setSelectedStageId(stageId as StageId)}
      />

      <TechniqueInfoModal
        stage={infoModalStage}
        isOpen={Boolean(infoModalStage)}
        onClose={() => setInfoModalStage(null)}
        onStartThisStage={(stg: MeditationStageConfig) => {
          setSelectedStageId(stg.id);
          setInfoModalStage(null);
          handleStartSingleSession();
        }}
        onOpenCustomMedia={(stg: MeditationStageConfig) => {
          setInfoModalStage(null);
          setCustomMediaModalStageId(stg.id);
          setCustomMediaModalOpen(true);
        }}
      />

      <ThemeSelectorModal
        isOpen={themeModalOpen}
        currentTheme={currentTheme}
        onClose={() => setThemeModalOpen(false)}
        onSelectTheme={(themeKey: AppTheme) => setCurrentTheme(themeKey)}
      />

      <GitHubPagesModal
        isOpen={ghPagesModalOpen}
        onClose={() => setGhPagesModalOpen(false)}
      />

      {/* Active Meditation / Sequence Player Modal */}
      <ActiveSessionModal
        isOpen={activePlayerOpen}
        isSequenceMode={isSequenceMode}
        activeStageId={selectedStageId}
        stages={stages}
        stageOrder={sequenceOrder}
        onClose={() => setActivePlayerOpen(false)}
        onStageChange={(stageId: string) => setSelectedStageId(stageId as StageId)}
        onOpenCustomMediaModal={(stageId: string) => {
          setCustomMediaModalStageId(stageId);
          setCustomMediaModalOpen(true);
        }}
      />
    </div>
  );
}
