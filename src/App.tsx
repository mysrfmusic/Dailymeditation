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
import { LotusIcon } from './components/Icons';
import { Play, RotateCcw, Globe, Palette, Info, Sparkles } from 'lucide-react';

const STORAGE_KEY = 'kriya_meditation_stages_v15';
const SEQUENCE_KEY = 'kriya_sequence_order_v15';
const INCREMENT_KEY = 'kriya_increment_step_v15';
const THEME_KEY = 'kriya_app_theme_v15';

export default function App() {
  // Theme state: defaults to spiritual_eye matching the uploaded Spiritual Eye photo
  const [currentTheme, setCurrentTheme] = useState<AppTheme>(() => {
    try {
      const saved =
        localStorage.getItem(THEME_KEY) ||
        localStorage.getItem('kriya_app_theme_v14') ||
        localStorage.getItem('kriya_app_theme_v13') ||
        localStorage.getItem('kriya_app_theme_v12');
      if (saved && saved in THEMES) return saved as AppTheme;
    } catch {}
    return 'spiritual_eye';
  });

  // Load saved stages or defaults
  const [stages, setStages] = useState<Record<string, MeditationStageConfig>>(() => {
    try {
      const isExistingV15 = Boolean(localStorage.getItem(STORAGE_KEY));
      const saved =
        localStorage.getItem(STORAGE_KEY) ||
        localStorage.getItem('kriya_meditation_stages_v14') ||
        localStorage.getItem('kriya_meditation_stages_v13');
      if (saved) {
        const parsed = JSON.parse(saved);
        const merged = { ...INITIAL_STAGES, ...parsed };

        if (!isExistingV15) {
          if (merged.chant) {
            merged.chant = {
              ...merged.chant,
              minutes: 5,
              stageType: 'chant',
              playUntilFinished: true,
              customMedia: merged.chant.customMedia
                ? { ...merged.chant.customMedia, playUntilFinished: true }
                : INITIAL_STAGES.chant.customMedia,
            };
          }
          if (merged.kriyas) {
            merged.kriyas = {
              ...merged.kriyas,
              breathPattern: { inhale: 10, hold: 3, exhale: 10 },
              secondsPerKriya: 23,
              minutes: 6,
            };
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
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
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
        const secPerKriya = current.secondsPerKriya || (current.breathPattern ? current.breathPattern.inhale + current.breathPattern.hold + current.breathPattern.exhale : 23);
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
        const kCount = current.kriyaCount ?? 14;
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
    setIsSequenceMode(false);
    setActivePlayerOpen(true);
  };

  // Handler: Start full sequence routine
  const handleStartFullRoutine = () => {
    setIsSequenceMode(true);
    setSelectedStageId(sequenceOrder[0] || 'exercises'); // start from stage 1
    setActivePlayerOpen(true);
  };

  return (
    <div
      className={`min-h-screen ${activeThemeConfig.bgClass} flex flex-col justify-between antialiased transition-colors duration-300`}
    >
      {/* Top Bar Header */}
      <header
        className={`w-full ${activeThemeConfig.headerBg} border-b sticky top-0 z-30 shadow-sm transition-colors duration-300`}
      >
        <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          {/* Brand Wordmark & Lotus */}
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-full bg-white/10 text-amber-300">
              <LotusIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </span>
            <div className="leading-tight">
              <span className="text-base sm:text-lg font-bold font-spiritual tracking-wide block text-slate-100">
                Kriya Meditation
              </span>
              <span className="text-[10px] sm:text-xs text-slate-300/80 font-medium hidden xs:block">
                {sequenceOrder.length} Sacred Stages & Soundscapes
              </span>
            </div>
          </div>

          {/* Header Action Tools */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Total Routine Tag */}
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-slate-200 hidden md:inline">
              Routine: {totalRoutineMinutes} min
            </span>

            {/* Play Full Routine button */}
            <button
              type="button"
              onClick={handleStartFullRoutine}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-sm transition-all active:scale-95 cursor-pointer"
              title={`Play through all ${sequenceOrder.length} stages in sequence with auto-advance`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Full Routine</span>
            </button>

            {/* Chants & Affirmations Tab button */}
            <button
              type="button"
              onClick={() => setChantAffirmationModalOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 border border-amber-400/40 shadow-sm transition-all cursor-pointer"
              title="Open Cosmic Chants, Healing Affirmations & Sacred Voices Library"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">Chants, Affirmations & Voices</span>
            </button>

            {/* Color & Style Theme Switcher */}
            <button
              type="button"
              onClick={() => setThemeModalOpen(true)}
              className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              title={`Switch Color & Theme (Current: ${activeThemeConfig.name})`}
              aria-label="Color and Theme"
            >
              <Palette className="w-4 h-4" />
            </button>

            {/* GitHub Pages Modal trigger */}
            <button
              type="button"
              onClick={() => setGhPagesModalOpen(true)}
              className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              title="GitHub Pages deployment info"
              aria-label="GitHub Pages details"
            >
              <Globe className="w-4 h-4" />
            </button>

            {/* Reset to defaults */}
            <button
              type="button"
              onClick={handleResetToDefaults}
              className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              title="Reset to default times"
              aria-label="Reset to defaults"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-start py-4 px-3 sm:px-6 w-full">
        {/* Main Phone / Container Frame */}
        <div className="w-full max-w-[440px] flex flex-col gap-3 sm:gap-4 mx-auto">
          {/* Chants, Affirmations & Sacred Voices Sequence Tool Bar */}
          <div className="w-full flex items-center justify-between gap-2 px-0.5">
            <button
              type="button"
              onClick={() => setChantAffirmationModalOpen(true)}
              className="w-full py-2 px-3.5 rounded-2xl bg-black/35 hover:bg-black/50 border border-amber-400/40 text-amber-200 text-xs font-bold flex items-center justify-between shadow-md transition-all active:scale-[0.98] cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Chants, Affirmations & Sacred Voices</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/25 text-amber-100 font-mono">
                + Library & Routine ({sequenceOrder.length})
              </span>
            </button>
          </div>

          {/* Sacred Stages Grid (Mapped to sequenceOrder) */}
          <section
            aria-label="Meditation Stages Grid"
            className="grid grid-cols-3 gap-2 sm:gap-2.5 w-full"
          >
            {sequenceOrder.map((stageId) => {
              const stage = stages[stageId];
              if (!stage) return null;
              return (
                <StageCard
                  key={stageId}
                  stage={stage}
                  isSelected={selectedStageId === stageId}
                  theme={activeThemeConfig}
                  onSelect={() => setSelectedStageId(stageId)}
                  onOpenInfo={() => setInfoModalStage(stage)}
                />
              );
            })}
          </section>

          {/* Lower Control Panel */}
          <section aria-label="Stage Timer and Soundscape Controls" className="w-full">
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
                  type: preset.type,
                  muteSoundscape: true,
                  playUntilFinished: true,
                });
              }}
              onTogglePlayUntilFinished={(val) => handleTogglePlayUntilFinished(selectedStageId, val)}
            />
          </section>

          {/* Quick Helper Subtext */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-2">
            <span>Tap any stage to configure time & soundscape</span>
            <button
              type="button"
              onClick={() => setInfoModalStage(selectedStage)}
              className="underline font-semibold hover:text-slate-200 flex items-center gap-1 cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" /> Stage Guide
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-3 text-center text-xs text-slate-400 border-t border-white/10 mt-4">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-1 text-[11px]">
          <span>Paramahansa Yogananda Kriya Yoga Meditation Routine</span>
          <span>100% Offline & GitHub Pages Compatible</span>
        </div>
      </footer>

      {/* Theme Selector Modal */}
      <ThemeSelectorModal
        isOpen={themeModalOpen}
        currentTheme={currentTheme}
        onClose={() => setThemeModalOpen(false)}
        onSelectTheme={(t) => setCurrentTheme(t)}
      />

      {/* Soundscape Customization Modal */}
      <SoundscapeSelectorModal
        isOpen={soundscapeModalOpen}
        stage={selectedStage}
        onClose={() => setSoundscapeModalOpen(false)}
        onSaveStageConfig={handleSaveStageConfig}
        onApplyToAllStages={handleApplyToAllStages}
      />

      {/* Custom YouTube and MP3 Media Modal */}
      <CustomMediaModal
        isOpen={customMediaModalOpen}
        stage={stages[customMediaModalStageId] || selectedStage}
        stages={stages as any}
        onClose={() => setCustomMediaModalOpen(false)}
        onSaveMedia={handleSaveCustomMedia}
      />

      {/* Chant & Affirmation Library and Drag & Drop Sequence Modal */}
      <ChantAffirmationTab
        isOpen={chantAffirmationModalOpen}
        stages={stages}
        sequenceOrder={sequenceOrder}
        theme={activeThemeConfig}
        onClose={() => setChantAffirmationModalOpen(false)}
        onAddStage={handleAddStage}
        onRemoveStage={handleRemoveStage}
        onReorderSequence={handleReorderSequence}
        onUpdateStageConfig={(stageId, updates) => {
          setStages((prev) => ({
            ...prev,
            [stageId]: { ...prev[stageId], ...updates },
          }));
        }}
        onSelectStage={(stageId) => {
          setSelectedStageId(stageId);
          setChantAffirmationModalOpen(false);
        }}
      />

      {/* Technique & Prayer Guide Modal (i) */}
      <TechniqueInfoModal
        stage={infoModalStage}
        isOpen={Boolean(infoModalStage)}
        onClose={() => setInfoModalStage(null)}
        onStartThisStage={(stg) => {
          setSelectedStageId(stg.id);
          setIsSequenceMode(false);
          setActivePlayerOpen(true);
        }}
        onOpenCustomMedia={(stg) => {
          setCustomMediaModalStageId(stg.id);
          setCustomMediaModalOpen(true);
        }}
      />

      {/* Full Active Session Meditation Player Modal */}
      <ActiveSessionModal
        isOpen={activePlayerOpen}
        activeStageId={selectedStageId}
        stages={stages}
        stageOrder={sequenceOrder}
        isSequenceMode={isSequenceMode}
        onClose={() => setActivePlayerOpen(false)}
        onStageChange={(nextStageId) => setSelectedStageId(nextStageId)}
        onOpenCustomMediaModal={(stageId) => {
          setCustomMediaModalStageId(stageId);
          setCustomMediaModalOpen(true);
        }}
      />

      {/* GitHub Pages Deployment Info Modal */}
      <GitHubPagesModal
        isOpen={ghPagesModalOpen}
        onClose={() => setGhPagesModalOpen(false)}
      />
    </div>
  );
}
