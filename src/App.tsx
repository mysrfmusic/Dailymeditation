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
import { LotusIcon } from './components/Icons';
import { Play, RotateCcw, Globe, Palette, Info } from 'lucide-react';

const STORAGE_KEY = 'kriya_meditation_stages_v14';
const INCREMENT_KEY = 'kriya_increment_step_v14';
const THEME_KEY = 'kriya_app_theme_v14';

export default function App() {
  // Theme state: defaults to spiritual_eye matching the uploaded Spiritual Eye photo
  const [currentTheme, setCurrentTheme] = useState<AppTheme>(() => {
    try {
      const saved =
        localStorage.getItem(THEME_KEY) ||
        localStorage.getItem('kriya_app_theme_v13') ||
        localStorage.getItem('kriya_app_theme_v12') ||
        localStorage.getItem('kriya_app_theme_v11') ||
        localStorage.getItem('kriya_app_theme_v10') ||
        localStorage.getItem('kriya_app_theme_v9') ||
        localStorage.getItem('kriya_app_theme_v8');
      if (saved && saved in THEMES) return saved as AppTheme;
    } catch {}
    return 'spiritual_eye';
  });

  // Load saved stages or defaults
  const [stages, setStages] = useState<Record<StageId, MeditationStageConfig>>(() => {
    try {
      const isExistingV14 = Boolean(localStorage.getItem(STORAGE_KEY));
      const saved =
        localStorage.getItem(STORAGE_KEY) ||
        localStorage.getItem('kriya_meditation_stages_v13') ||
        localStorage.getItem('kriya_meditation_stages_v12') ||
        localStorage.getItem('kriya_meditation_stages_v11') ||
        localStorage.getItem('kriya_meditation_stages_v10') ||
        localStorage.getItem('kriya_meditation_stages_v9') ||
        localStorage.getItem('kriya_meditation_stages_v8');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure new stages exist and presence stages are properly initialized to 2 minutes
        const merged = { ...INITIAL_STAGES, ...parsed };

        // For v14: Apply chant 5 mins and kriyas 10-3-10
        if (!isExistingV14) {
          if (merged.chant) {
            merged.chant = { ...merged.chant, minutes: 5 };
          }
          if (merged.kriyas) {
            merged.kriyas = {
              ...merged.kriyas,
              breathPattern: { inhale: 10, hold: 3, exhale: 10 },
              secondsPerKriya: 23,
              minutes: 6,
            };
          }
          if (merged.closing_prayer) {
            merged.closing_prayer = { ...merged.closing_prayer, minutes: 4 };
          }
          if (merged.world_prayer) {
            merged.world_prayer = { ...merged.world_prayer, minutes: 4 };
          }
          (['opening_prayer', 'chant', 'closing_prayer', 'world_prayer'] as StageId[]).forEach((id) => {
            if (INITIAL_STAGES[id]?.customMedia) {
              merged[id] = { ...merged[id], customMedia: INITIAL_STAGES[id].customMedia };
            }
          });
        } else {
          if (!merged.kriyas?.breathPattern) {
            merged.kriyas = {
              ...merged.kriyas,
              breathPattern: { inhale: 10, hold: 3, exhale: 10 },
              secondsPerKriya: 23,
            };
          }
          (['opening_prayer', 'chant', 'closing_prayer', 'world_prayer'] as StageId[]).forEach((id) => {
            if (!merged[id]?.customMedia && INITIAL_STAGES[id]?.customMedia) {
              merged[id] = { ...merged[id], customMedia: INITIAL_STAGES[id].customMedia };
            }
          });
        }

        if (!merged.presence_hong_sau || merged.presence_hong_sau.minutes !== 2) {
          merged.presence_hong_sau = { ...INITIAL_STAGES.presence_hong_sau, minutes: 2 };
        }
        if (!merged.presence_om || merged.presence_om.minutes !== 2) {
          merged.presence_om = { ...INITIAL_STAGES.presence_om, minutes: 2 };
        }
        if (!merged.presence_kriya || merged.presence_kriya.minutes !== 2) {
          merged.presence_kriya = { ...INITIAL_STAGES.presence_kriya, minutes: 2 };
        }

        // Apply "Noble Silence + Bells" default to the requested stages on initial migration
        if (!isExistingV14) {
          const nobleSilenceStages: StageId[] = [
            'chant',
            'hong_sau',
            'presence_hong_sau',
            'om',
            'presence_om',
            'kriyas',
            'presence_kriya',
          ];
          nobleSilenceStages.forEach((id) => {
            if (merged[id]) {
              merged[id] = { ...merged[id], soundscape: 'silence', soundscapeVolume: 0.65 };
            }
          });
        }
        return merged;
      }
    } catch {}
    return INITIAL_STAGES;
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
  const [customMediaModalStageId, setCustomMediaModalStageId] = useState<StageId>('chant');
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
      localStorage.setItem(INCREMENT_KEY, String(incrementStep));
    } catch {}
  }, [incrementStep]);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, currentTheme);
    } catch {}
  }, [currentTheme]);

  // Selected stage reference and active theme config
  const selectedStage = stages[selectedStageId] || stages['kriyas'];
  const activeThemeConfig = THEMES[currentTheme] || THEMES['celestial_twilight'];

  // Calculate total routine duration in minutes
  const totalRoutineMinutes = STAGE_ORDER.reduce((acc, id) => {
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
    setStages((prev) => ({
      ...prev,
      [stageId]: {
        ...prev[stageId],
        customMedia: mediaConfig,
      },
    }));
  };

  // Handler: Reset all stages to default values
  const handleResetToDefaults = () => {
    if (window.confirm('Reset all timer durations and soundscapes back to original defaults?')) {
      setStages(INITIAL_STAGES);
      setIncrementStep(5);
      localStorage.removeItem(STORAGE_KEY);
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
    setSelectedStageId('exercises'); // start from stage 1
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
                {STAGE_ORDER.length} Sacred Stages & Soundscapes
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
              title={`Play through all ${STAGE_ORDER.length} stages in sequence with auto-advance`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Full Routine</span>
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
          {/* Sacred Stages Grid */}
          <section
            aria-label="Meditation Stages Grid"
            className="grid grid-cols-3 gap-2 sm:gap-2.5 w-full"
          >
            {STAGE_ORDER.map((stageId) => (
              <StageCard
                key={stageId}
                stage={stages[stageId]}
                isSelected={selectedStageId === stageId}
                theme={activeThemeConfig}
                onSelect={() => setSelectedStageId(stageId)}
                onOpenInfo={() => setInfoModalStage(stages[stageId])}
              />
            ))}
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
                });
              }}
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
        stages={stages}
        onClose={() => setCustomMediaModalOpen(false)}
        onSaveMedia={handleSaveCustomMedia}
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
