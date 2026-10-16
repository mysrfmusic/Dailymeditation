import React, { useState, useEffect, useRef } from 'react';
import { MeditationStageConfig, StageId } from '../types/meditation';
import { STAGE_ORDER } from '../data/stages';
import { SOUNDSCAPES, SoundscapeType, soundEngine } from '../utils/soundscapes';
import {
  getYouTubeEmbedUrl,
  detectMediaType,
  extractYouTubeStartTime,
  formatSecondsToTimestamp,
} from '../utils/customMedia';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  X,
  Volume2,
  VolumeX,
  Bell,
  CheckCircle,
  Wind,
  BookOpen,
  Youtube,
  ExternalLink,
  Music,
  Eye,
  Tv,
  Sparkles,
} from 'lucide-react';
import { MalaBeadsIcon } from './Icons';
import { SpiritualEyeGraphic } from './SpiritualEyeGraphic';

interface ActiveSessionModalProps {
  isOpen: boolean;
  activeStageId: StageId;
  stages: Record<string, MeditationStageConfig>;
  stageOrder?: string[];
  isSequenceMode: boolean;
  onClose: () => void;
  onStageChange: (nextStageId: string) => void;
  onOpenCustomMediaModal?: (stageId: string) => void;
}

export const ActiveSessionModal: React.FC<ActiveSessionModalProps> = ({
  isOpen,
  activeStageId,
  stages,
  stageOrder,
  isSequenceMode,
  onClose,
  onStageChange,
  onOpenCustomMediaModal,
}) => {
  const activeOrder = stageOrder && stageOrder.length > 0 ? stageOrder : STAGE_ORDER;
  const currentStage = stages[activeStageId] || stages['kriyas'] || Object.values(stages)[0];

  // Pranayama / Breathing Exercise & Kriya count state
  const isKriyas = currentStage.id === 'kriyas';
  const isBreathing1 = currentStage.id === 'breathing_1';
  const isBreathing2 = currentStage.id === 'breathing_2';
  const isPranayama = isBreathing1 || isBreathing2;
  const isCountBasedKriya = isKriyas && currentStage.isCountBased !== false;
  const isBreathingStage = isPranayama || isCountBasedKriya;
  const breathPattern =
    currentStage.breathPattern ||
    (isKriyas
      ? { inhale: 10, hold: 3, exhale: 10 }
      : { inhale: 6, hold: 6, exhale: 6 });
  const targetRounds = isKriyas
    ? (currentStage.kriyaCount ?? 14)
    : isBreathingStage
    ? (currentStage.breathRounds ?? (currentStage.id === 'breathing_1' ? 3 : 6))
    : 0;
  const cycleTotal = breathPattern.inhale + breathPattern.hold + breathPattern.exhale;

  // Timer states
  const totalDurationSeconds = isBreathingStage
    ? Math.max(1, targetRounds * cycleTotal)
    : (currentStage.minutes || 1) * 60;
  const [secondsRemaining, setSecondsRemaining] = useState<number>(totalDurationSeconds);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  // Kriyas bead counter state
  const targetBeads = isKriyas && currentStage.isCountBased !== false ? (currentStage.kriyaCount ?? 14) : 0;
  const [completedBeads, setCompletedBeads] = useState<number>(0);
  const [autoPacingBeads, setAutoPacingBeads] = useState<boolean>(true);

  // Accurate breath phase state and refs for 100% reliable transition gongs
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');
  const [breathCountInPhase, setBreathCountInPhase] = useState<number>(1);
  const [breathRoundsCompleted, setBreathRoundsCompleted] = useState<number>(0);
  const [audioBreathCues, setAudioBreathCues] = useState<boolean>(true);

  const currentPhaseRef = useRef<'Inhale' | 'Hold' | 'Exhale'>('Inhale');
  const phaseCountRef = useRef<number>(1);
  const roundRef = useRef<number>(0);

  // Prayer text toggle
  const hasPrayer = Boolean(currentStage.techniqueGuide.prayerText);
  const [showPrayerOverlay, setShowPrayerOverlay] = useState<boolean>(Boolean(hasPrayer));

  // Custom Media state (YouTube / MP3)
  const customMedia = currentStage.customMedia;
  const hasCustomMedia = Boolean(customMedia?.enabled && customMedia?.url);
  const mediaType = hasCustomMedia ? detectMediaType(customMedia!.url) : 'other';
  const isYouTube = hasCustomMedia && mediaType === 'youtube';
  const isAudioFile = hasCustomMedia && mediaType === 'mp3';
  const shouldMuteSoundscape = Boolean(hasCustomMedia && (customMedia?.muteSoundscape ?? true));

  const isChant = currentStage.stageType === 'chant' || currentStage.id === 'chant' || currentStage.id.startsWith('chant_');
  const isAffirmation = currentStage.stageType === 'affirmation' || currentStage.id === 'affirmation' || currentStage.id.startsWith('affirmation_');
  const isSacredVoice = currentStage.stageType === 'sacred_voices' || currentStage.id === 'sacred_voices' || currentStage.id.startsWith('sacred_voices_');
  const isPlayUntilFinished = Boolean(
    currentStage.playUntilFinished ??
    (currentStage.customMedia?.playUntilFinished ?? ((isChant || isAffirmation || isSacredVoice) && hasCustomMedia))
  );

  // Affirmation / Sacred Words text
  const affirmationText = currentStage.customMedia?.affirmationText || currentStage.techniqueGuide?.affirmationText;
  const hasAffirmation = Boolean(affirmationText);
  const [showAffirmationOverlay, setShowAffirmationOverlay] = useState<boolean>(true);

  const [trackElapsedSeconds, setTrackElapsedSeconds] = useState<number>(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);
  const [mobileAutoplayBlocked, setMobileAutoplayBlocked] = useState<boolean>(false);

  const [showVideo, setShowVideo] = useState<boolean>(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const youtubeIframeRef = useRef<HTMLIFrameElement | null>(null);

  // Soundscape state for current session
  const [activeSoundscape, setActiveSoundscape] = useState<SoundscapeType>(currentStage.soundscape);
  const [volume, setVolume] = useState<number>(currentStage.soundscapeVolume ?? 0.65);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showSoundMenu, setShowSoundMenu] = useState<boolean>(false);

  // Interval bell tracker
  const intervalBellTimerRef = useRef<number>(0);
  const breathCycleSecRef = useRef<number>(0);

  // Reset when stage changes or modal opens
  useEffect(() => {
    if (isOpen) {
      const dur = isBreathingStage
        ? Math.max(1, targetRounds * cycleTotal)
        : (currentStage.minutes || 1) * 60;
      setSecondsRemaining(dur);
      setTrackElapsedSeconds(0);
      setIsRunning(true);
      setIsCompleted(false);
      setIsVideoPlaying(false);
      setCompletedBeads(0);
      setBreathRoundsCompleted(0);
      setBreathPhase('Inhale');
      setBreathCountInPhase(1);
      setShowVideo(true);

      currentPhaseRef.current = 'Inhale';
      phaseCountRef.current = 1;
      roundRef.current = 0;
      breathCycleSecRef.current = 0;

      setActiveSoundscape(currentStage.soundscape);
      setVolume(currentStage.soundscapeVolume ?? 0.65);
      intervalBellTimerRef.current = 0;
      setShowPrayerOverlay(Boolean(currentStage.techniqueGuide.prayerText));
      setShowAffirmationOverlay(Boolean(currentStage.customMedia?.affirmationText || currentStage.techniqueGuide?.affirmationText));

      // Start soundscape (unless muted by custom media)
      if (!shouldMuteSoundscape) {
        soundEngine.setVolume(currentStage.soundscapeVolume ?? 0.65);
        soundEngine.playSoundscape(currentStage.soundscape);
      } else {
        soundEngine.stopSoundscape();
      }

      // If direct audio file, start playback
      if (isAudioFile && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }

      // Play starting gong for Breathing Inhale or Temple Bell for standard stages
      if (isBreathingStage) {
        if (audioBreathCues) {
          soundEngine.playBreathCue('inhale');
        }
      } else if (currentStage.bellAtStart) {
        soundEngine.playTempleBell(1);
      }
    } else {
      soundEngine.stopSoundscape();
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }

    return () => {
      soundEngine.stopSoundscape();
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [isOpen, activeStageId]);

  // YouTube Iframe event listener & mobile autoplay detection
  useEffect(() => {
    if (!isOpen || !isYouTube) return;

    const handleMessage = (e: MessageEvent) => {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (!data) return;

        let playerState: number | undefined;
        if (data.event === 'onStateChange') {
          playerState = data.info;
        } else if (data.event === 'infoDelivery' && data.info?.playerState !== undefined) {
          playerState = data.info.playerState;
        }

        if (playerState === 1) {
          // Video is actively playing!
          setIsVideoPlaying(true);
          setMobileAutoplayBlocked(false);
        } else if (playerState === 2) {
          // Paused
          setIsVideoPlaying(false);
        } else if (playerState === 0) {
          // Video ended!
          setIsVideoPlaying(false);
          if (isPlayUntilFinished) {
            handleStageCompletion();
          }
        }
      } catch {}
    };

    window.addEventListener('message', handleMessage);

    // If on mobile/tablet or autoplay blocked, check if video is playing after short delay
    const checkTimer = setTimeout(() => {
      if (isRunning && !isVideoPlaying) {
        setMobileAutoplayBlocked(true);
      }
    }, 1800);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(checkTimer);
    };
  }, [isOpen, isYouTube, isRunning, isVideoPlaying, isPlayUntilFinished]);

  const handleMobilePlayUnlock = () => {
    if (youtubeIframeRef.current?.contentWindow) {
      try {
        youtubeIframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'unMute', args: [] }),
          '*'
        );
        youtubeIframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
          '*'
        );
      } catch {}
    }
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
    setMobileAutoplayBlocked(false);
    setIsVideoPlaying(true);
  };

  // Sync custom media play/pause with timer running state
  useEffect(() => {
    if (!isOpen) return;

    if (youtubeIframeRef.current?.contentWindow) {
      try {
        const cmd = isRunning ? 'playVideo' : 'pauseVideo';
        youtubeIframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: cmd, args: [] }),
          '*'
        );
      } catch {}
    }

    if (audioRef.current) {
      if (isRunning) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
  }, [isRunning, isOpen]);

  // Main countdown tick with rock-solid transition gongs
  useEffect(() => {
    if (!isOpen || !isRunning || isCompleted) return;

    const timer = setInterval(() => {
      // If playUntilFinished is active, track elapsed time instead of cutting off
      if (isPlayUntilFinished) {
        setTrackElapsedSeconds((prev) => prev + 1);
      } else {
        // 1. Decrement overall time
        setSecondsRemaining((prev) => {
          if (prev <= 1 && !isBreathingStage) {
            handleStageCompletion();
            return 0;
          }

          // Interval bell check
          const intervalMins = currentStage.intervalBellMinutes ?? 0;
          if (intervalMins > 0) {
            intervalBellTimerRef.current += 1;
            if (intervalBellTimerRef.current >= intervalMins * 60) {
              intervalBellTimerRef.current = 0;
              soundEngine.playTempleBell(1);
            }
          }

          return prev - 1;
        });
      }

      // 2. Breath Transition & Counting Engine (Guaranteed zero missing gongs)
      if (isBreathingStage) {
        const inh = Math.max(1, breathPattern.inhale || 6);
        const hld = Math.max(0, breathPattern.hold ?? 6);
        const exh = Math.max(1, breathPattern.exhale || 6);

        if (currentPhaseRef.current === 'Inhale') {
          if (phaseCountRef.current < inh) {
            phaseCountRef.current += 1;
            setBreathCountInPhase(phaseCountRef.current);
          } else {
            // Transition: Inhale completed -> Hold begins (or Exhale if hold is 0)
            if (hld > 0) {
              currentPhaseRef.current = 'Hold';
              phaseCountRef.current = 1;
              setBreathPhase('Hold');
              setBreathCountInPhase(1);
              if (audioBreathCues) {
                soundEngine.playBreathCue('hold');
              }
            } else {
              currentPhaseRef.current = 'Exhale';
              phaseCountRef.current = 1;
              setBreathPhase('Exhale');
              setBreathCountInPhase(1);
              if (audioBreathCues) {
                soundEngine.playBreathCue('exhale');
              }
            }
          }
        } else if (currentPhaseRef.current === 'Hold') {
          if (phaseCountRef.current < hld) {
            phaseCountRef.current += 1;
            setBreathCountInPhase(phaseCountRef.current);
          } else {
            // Transition: Hold completed -> Exhale begins!
            currentPhaseRef.current = 'Exhale';
            phaseCountRef.current = 1;
            setBreathPhase('Exhale');
            setBreathCountInPhase(1);
            if (audioBreathCues) {
              soundEngine.playBreathCue('exhale');
            }
          }
        } else if (currentPhaseRef.current === 'Exhale') {
          if (phaseCountRef.current < exh) {
            phaseCountRef.current += 1;
            setBreathCountInPhase(phaseCountRef.current);
          } else {
            // Transition: Exhale completed -> Round finished!
            const nextRound = roundRef.current + 1;
            roundRef.current = nextRound;
            setBreathRoundsCompleted(nextRound);

            if (isKriyas) {
              setCompletedBeads(nextRound);
              soundEngine.playBeadClick();
            }

            if (nextRound >= targetRounds) {
              handleStageCompletion();
            } else {
              // Transition: Start next Round Inhale with Gong!
              currentPhaseRef.current = 'Inhale';
              phaseCountRef.current = 1;
              setBreathPhase('Inhale');
              setBreathCountInPhase(1);
              if (audioBreathCues) {
                soundEngine.playBreathCue('inhale');
              }
            }
          }
        }
      } else {
        // Standard calm breath pulse for Kriyas / meditation
        const cycleLength = isKriyas ? 30 : 10;
        const nextSec = (breathCycleSecRef.current + 1) % cycleLength;
        breathCycleSecRef.current = nextSec;
        const half = cycleLength / 2;
        if (nextSec < half) {
          if (currentPhaseRef.current !== 'Inhale') {
            currentPhaseRef.current = 'Inhale';
            setBreathPhase('Inhale');
            if (isKriyas && audioBreathCues) {
              soundEngine.playBreathCue('inhale');
            }
          }
        } else {
          if (currentPhaseRef.current !== 'Exhale') {
            currentPhaseRef.current = 'Exhale';
            setBreathPhase('Exhale');
            if (isKriyas && audioBreathCues) {
              soundEngine.playBreathCue('exhale');
            }
          }
        }

        if (isKriyas && autoPacingBeads && nextSec === 0) {
          setCompletedBeads((c) => {
            if (c < targetBeads) {
              soundEngine.playBeadClick();
              return c + 1;
            }
            return c;
          });
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [
    isOpen,
    isRunning,
    isCompleted,
    activeStageId,
    autoPacingBeads,
    isKriyas,
    targetBeads,
    isBreathingStage,
    breathPattern,
    targetRounds,
    audioBreathCues,
  ]);

  // Handle stage finish
  const handleStageCompletion = () => {
    setIsCompleted(true);
    setIsRunning(false);

    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (youtubeIframeRef.current?.contentWindow) {
      try {
        youtubeIframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }),
          '*'
        );
      } catch {}
    }

    if (currentStage.bellAtEnd) {
      soundEngine.playTempleBell(3);
    }

    if (isSequenceMode) {
      const currentIndex = activeOrder.indexOf(activeStageId);
      if (currentIndex < activeOrder.length - 1) {
        setTimeout(() => {
          onStageChange(activeOrder[currentIndex + 1]);
        }, 3500);
      }
    }
  };

  // Keyboard shortcut for bead tapping: Spacebar increments bead
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.code === 'Space' && isKriyas && targetBeads > 0) {
        e.preventDefault();
        handleAdvanceBead();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isKriyas, targetBeads, completedBeads]);

  const handleAdvanceBead = () => {
    if (completedBeads < targetBeads) {
      soundEngine.playBeadClick();
      const next = completedBeads + 1;
      setCompletedBeads(next);
      roundRef.current = next;
      setBreathRoundsCompleted(next);
      if (next >= targetBeads) {
        handleStageCompletion();
      } else {
        currentPhaseRef.current = 'Inhale';
        phaseCountRef.current = 1;
        setBreathPhase('Inhale');
        setBreathCountInPhase(1);
        if (audioBreathCues) {
          soundEngine.playBreathCue('inhale');
        }
      }
    }
  };

  const handleTogglePlay = () => {
    if (isRunning) {
      setIsRunning(false);
      soundEngine.stopSoundscape();
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (youtubeIframeRef.current?.contentWindow) {
        try {
          youtubeIframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }),
            '*'
          );
        } catch {}
      }
    } else {
      setIsRunning(true);
      if (!shouldMuteSoundscape) {
        soundEngine.playSoundscape(activeSoundscape);
      }
      if (audioRef.current) {
        audioRef.current.play().catch(() => {});
      }
      if (youtubeIframeRef.current?.contentWindow) {
        try {
          youtubeIframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
            '*'
          );
        } catch {}
      }
      // Play current phase gong immediately on resume so devotee has crystal-clear cue
      if (isBreathingStage && audioBreathCues) {
        soundEngine.playBreathCue(currentPhaseRef.current.toLowerCase() as 'inhale' | 'hold' | 'exhale');
      }
    }
  };

  const handleReset = () => {
    setSecondsRemaining(totalDurationSeconds);
    setTrackElapsedSeconds(0);
    setCompletedBeads(0);
    setBreathRoundsCompleted(0);
    currentPhaseRef.current = 'Inhale';
    phaseCountRef.current = 1;
    roundRef.current = 0;
    setBreathPhase('Inhale');
    setBreathCountInPhase(1);
    breathCycleSecRef.current = 0;
    setIsCompleted(false);
    setIsRunning(true);
    if (!shouldMuteSoundscape) {
      soundEngine.playSoundscape(activeSoundscape);
    }

    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
    if (youtubeIframeRef.current?.contentWindow) {
      try {
        const startOffset = (isYouTube && customMedia?.url) ? (extractYouTubeStartTime(customMedia.url) || 0) : 0;
        youtubeIframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'seekTo', args: [startOffset, true] }),
          '*'
        );
        youtubeIframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
          '*'
        );
      } catch {}
    }

    if (isBreathingStage && audioBreathCues) {
      soundEngine.playBreathCue('inhale');
    }
  };

  const handlePreviousStage = () => {
    const currentIndex = activeOrder.indexOf(activeStageId);
    if (currentIndex > 0) {
      onStageChange(activeOrder[currentIndex - 1]);
    }
  };

  const handleNextStage = () => {
    const currentIndex = activeOrder.indexOf(activeStageId);
    if (currentIndex < activeOrder.length - 1) {
      onStageChange(activeOrder[currentIndex + 1]);
    } else {
      handleStageCompletion();
    }
  };

  const handleSwitchSoundscape = (sound: SoundscapeType) => {
    setActiveSoundscape(sound);
    soundEngine.playSoundscape(sound);
    setShowSoundMenu(false);
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundEngine.setMute(next);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    soundEngine.setVolume(v);
  };

  if (!isOpen) return null;

  // Format MM:SS
  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  const timeString = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const currentStageIndex = activeOrder.indexOf(activeStageId);

  // Overall progress percentage
  const progressPercent = isBreathingStage
    ? Math.min(100, (breathRoundsCompleted / Math.max(1, targetRounds)) * 100)
    : isPlayUntilFinished
    ? Math.min(100, (trackElapsedSeconds % 60) * 1.66)
    : ((totalDurationSeconds - secondsRemaining) / totalDurationSeconds) * 100;

  const currentSound = SOUNDSCAPES.find((s) => s.id === activeSoundscape) || SOUNDSCAPES[0];

  const currentPhaseMaxCount =
    breathPhase === 'Inhale'
      ? breathPattern.inhale
      : breathPhase === 'Hold'
      ? breathPattern.hold
      : breathPattern.exhale;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="active-session-title"
      className="fixed inset-0 z-50 flex flex-col items-center justify-between p-4 sm:p-6 bg-[#060e2a] text-white select-none overflow-y-auto"
      style={{
        backgroundImage:
          'radial-gradient(circle at 50% 32%, rgba(255, 215, 0, 0.22) 0%, rgba(13, 31, 115, 0.85) 45%, #050b24 95%)',
      }}
    >
      {/* Top Bar Navigation */}
      <div className="w-full max-w-xl flex items-center justify-between py-2 border-b border-[#ffd700]/30">
        <div className="flex items-center gap-2">
          {isSequenceMode ? (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#ffd700]/20 text-[#ffd700] border border-[#ffd700]/40">
              Stage {currentStageIndex + 1} of {activeOrder.length}
            </span>
          ) : (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#ffd700]/20 text-[#ffd700] border border-[#ffd700]/40">
              Single Session
            </span>
          )}
          <span className="text-xs text-amber-200/80 hidden sm:inline">
            {isSequenceMode ? 'Full Sequence Active' : 'Individual Practice'}
          </span>
        </div>

        {/* Exit Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Exit session"
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 text-white/90 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" /> End Session
        </button>
      </div>

      {/* Routine Progress bar (if in sequence mode) */}
      {isSequenceMode && (
        <div className="w-full max-w-xl mt-3 flex items-center gap-1 px-1">
          {activeOrder.map((stageId, idx) => {
            const isPast = idx < currentStageIndex;
            const isCurr = idx === currentStageIndex;
            return (
              <div
                key={`${stageId}_${idx}`}
                className={`h-1.5 rounded-full flex-1 transition-all ${
                  isPast
                    ? 'bg-amber-400'
                    : isCurr
                    ? 'bg-white ring-2 ring-[#ffd700]'
                    : 'bg-white/20'
                }`}
                title={stages[stageId]?.title}
              />
            );
          })}
        </div>
      )}

      {/* Main Meditation Arena */}
      <div className="w-full max-w-md my-auto flex flex-col items-center justify-center text-center py-2">
        {/* Stage Title */}
        <h1
          id="active-session-title"
          className="text-2xl sm:text-3xl font-extrabold text-[#ffd700] tracking-wide font-spiritual drop-shadow-md"
        >
          {currentStage.title}
        </h1>
        <p className="text-xs text-sky-200/85 mt-0.5 max-w-xs">
          {currentStage.subtitle}
        </p>

        {/* Prayer Text Callout if stage has prayer */}
        {hasPrayer && (
          <div className="w-full mt-2 px-1">
            <button
              type="button"
              onClick={() => setShowPrayerOverlay(!showPrayerOverlay)}
              className="text-xs font-semibold text-[#ffd700] hover:text-white underline inline-flex items-center gap-1 mb-1.5 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              {showPrayerOverlay ? 'Hide Prayer Text' : 'Show Prayer Text'}
            </button>
            {showPrayerOverlay && (
              <div className="p-3.5 bg-black/55 border border-[#ffd700]/40 rounded-2xl text-xs sm:text-[13px] text-amber-100/95 leading-relaxed font-serif italic text-left max-h-32 overflow-y-auto">
                {currentStage.techniqueGuide.prayerText}
              </div>
            )}
          </div>
        )}

        {/* Custom YouTube or MP3 Media Player Card */}
        {hasCustomMedia && customMedia && (
          <div className="w-full max-w-sm mt-2 mb-1 p-2.5 bg-black/60 border border-amber-400/40 rounded-2xl flex flex-col items-center gap-2 shadow-lg backdrop-blur-sm">
            <div className="w-full flex items-center justify-between text-xs px-1">
              <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                {isYouTube ? (
                  <span className="p-1 rounded-md bg-red-600/30 text-red-400">
                    <Youtube className="w-3.5 h-3.5" />
                  </span>
                ) : (
                  <span className="p-1 rounded-md bg-sky-600/30 text-sky-400">
                    <Music className="w-3.5 h-3.5" />
                  </span>
                )}
                <span className="font-semibold text-amber-200 truncate">
                  {customMedia.title || (isYouTube ? 'YouTube Chant' : 'Audio Track')}
                </span>
                {isYouTube && extractYouTubeStartTime(customMedia.url) !== null && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30 whitespace-nowrap">
                    ⏱ {formatSecondsToTimestamp(extractYouTubeStartTime(customMedia.url)!)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {isYouTube && (
                  <button
                    type="button"
                    onClick={() => setShowVideo(!showVideo)}
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center gap-1 cursor-pointer"
                  >
                    {showVideo ? (
                      <>
                        <Eye className="w-3 h-3 text-[#ffd700]" /> Eye Mode
                      </>
                    ) : (
                      <>
                        <Tv className="w-3 h-3 text-red-400" /> View Video
                      </>
                    )}
                  </button>
                )}
                {onOpenCustomMediaModal && (
                  <button
                    type="button"
                    onClick={() => onOpenCustomMediaModal(activeStageId)}
                    className="text-amber-300 hover:text-white text-[11px] underline cursor-pointer"
                    title="Change or customize link"
                  >
                    Edit
                  </button>
                )}
                <a
                  href={customMedia.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 hover:text-white p-1"
                  title="Open in new window / external app"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* If YouTube: Embed iframe (visible if showVideo, or compact banner if Spiritual Eye Mode) */}
            {isYouTube && (
              <>
                {showVideo ? (
                  <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-white/20 shadow-md">
                    <iframe
                      key={activeStageId}
                      ref={youtubeIframeRef}
                      src={getYouTubeEmbedUrl(customMedia.url, true) || ''}
                      title={customMedia.title || 'YouTube Player'}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      onLoad={() => {
                        if (isRunning) {
                          setTimeout(() => {
                            try {
                              youtubeIframeRef.current?.contentWindow?.postMessage(
                                JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
                                '*'
                              );
                            } catch {}
                          }, 500);
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-full py-2 px-3 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between text-xs text-amber-200/90">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Audio Playing in Spiritual Eye Mode</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowVideo(true)}
                      className="text-[11px] text-amber-300 hover:text-white underline cursor-pointer"
                    >
                      View Video
                    </button>
                    <div className="w-1 h-1 opacity-0 overflow-hidden absolute pointer-events-none">
                      <iframe
                        key={`bg_${activeStageId}`}
                        ref={youtubeIframeRef}
                        src={getYouTubeEmbedUrl(customMedia.url, true) || ''}
                        title={customMedia.title || 'YouTube Background Audio'}
                        className="w-1 h-1 border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      />
                    </div>
                  </div>
                )}

                {/* Mobile Autoplay Unlock Helper Button: Appears on touch devices when browser restricts auto-play */}
                {mobileAutoplayBlocked && (
                  <button
                    type="button"
                    onClick={handleMobilePlayUnlock}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-xl animate-pulse cursor-pointer border border-amber-200"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Tap to Play Sacred Music (Mobile Audio Unlock)</span>
                  </button>
                )}
              </>
            )}

            {/* If MP3 / Audio file: Render HTML5 Audio element */}
            {isAudioFile && (
              <div className="w-full flex items-center justify-between gap-2 pt-1 border-t border-white/10">
                <audio
                  ref={audioRef}
                  src={customMedia.url}
                  autoPlay={isRunning}
                  loop={!isPlayUntilFinished}
                  onEnded={() => {
                    if (isPlayUntilFinished) {
                      handleStageCompletion();
                    }
                  }}
                  className="w-full h-8"
                  controls
                />
              </div>
            )}
          </div>
        )}

        {/* Sacred Affirmation & Guru Words Callout */}
        {hasAffirmation && (
          <div className="w-full max-w-sm mt-2 mb-1 px-1">
            <div className="p-3 bg-gradient-to-br from-amber-500/20 via-black/75 to-sky-950/40 border border-amber-400/50 rounded-2xl text-xs sm:text-[13px] text-amber-100/95 leading-relaxed font-serif text-center shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between text-[11px] font-sans font-bold text-amber-300 uppercase tracking-wider mb-1.5 px-0.5">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>{isSacredVoice ? 'Sacred Guru Words' : 'Sacred Affirmation'}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowAffirmationOverlay(!showAffirmationOverlay)}
                  className="text-[10px] text-slate-300 hover:text-white underline normal-case font-normal cursor-pointer"
                >
                  {showAffirmationOverlay ? 'Minimize' : 'Show Words'}
                </button>
              </div>
              {showAffirmationOverlay && (
                <div className="space-y-1">
                  <p className="italic text-amber-100 text-xs sm:text-[13px] drop-shadow-md leading-relaxed px-1">
                    "{affirmationText}"
                  </p>
                  <span className="block text-[10px] text-amber-300/80 font-sans not-italic mt-1">
                    Recite mentally at the Spiritual Eye with deep devotion
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Specialized Breathing / Kriya Ratio Badge & Chime Toggle */}
        {isBreathingStage && (
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-black/45 border border-[#ffd700]/50 text-[#ffd700]">
              {isKriyas ? 'Kriya Count' : 'Ratio'}: {breathPattern.inhale} · {breathPattern.hold} · {breathPattern.exhale}
            </span>
            <button
              type="button"
              onClick={() => {
                const nextState = !audioBreathCues;
                setAudioBreathCues(nextState);
                if (nextState) {
                  soundEngine.playBreathCue('inhale');
                }
              }}
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                audioBreathCues
                  ? 'bg-[#ffd700]/25 text-[#ffd700] border-[#ffd700]/60 font-bold'
                  : 'bg-white/10 text-white/60 border-white/20'
              }`}
              title="Toggle bell chime cues on phase change"
            >
              {audioBreathCues ? '🔔 Transition Gong ON' : '🔕 Gong OFF'}
            </button>
            <button
              type="button"
              onClick={() => soundEngine.playBreathCue(currentPhaseRef.current.toLowerCase() as 'inhale' | 'hold' | 'exhale')}
              className="text-[11px] font-semibold px-2 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/20 transition-all cursor-pointer"
              title="Strike Gong now to test sound"
            >
              Test Gong
            </button>
          </div>
        )}

        {/* Visual Spiritual Eye & Breath Ring Container */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 my-3 flex items-center justify-center">
          {/* Authentic Spiritual Eye Graphic at the background of the arena */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-85">
            <SpiritualEyeGraphic pulsePhase={breathPhase} className="w-60 h-60 sm:w-68 sm:h-68" />
          </div>

          {/* SVG Circular Progress Ring overlaid on outer Golden Halo */}
          <svg className="w-full h-full transform -rotate-90 pointer-events-none" viewBox="0 0 240 240">
            {/* Background Track */}
            <circle
              cx="120"
              cy="120"
              r="110"
              className="text-white/10"
              strokeWidth="6"
              stroke="currentColor"
              fill="transparent"
            />
            {/* Active Progress Arc */}
            <circle
              cx="120"
              cy="120"
              r="110"
              className="text-[#ffd700] transition-all duration-300"
              strokeWidth="6"
              strokeDasharray={2 * Math.PI * 110}
              strokeDashoffset={2 * Math.PI * 110 * (1 - progressPercent / 100)}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
            />
          </svg>

          {/* Center Timer / Breath Pacing Information */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-auto">
            {isCompleted ? (
              <div className="flex flex-col items-center animate-bounce bg-black/60 p-4 rounded-3xl border border-[#ffd700]/50 backdrop-blur-sm">
                <CheckCircle className="w-12 h-12 text-[#ffd700] mb-1" />
                <span className="text-xl font-bold font-spiritual text-amber-200">
                  Stage Complete
                </span>
                <span className="text-xs text-sky-200/80 mt-0.5">Peace & Stillness</span>
              </div>
            ) : isBreathingStage ? (
              <div className="flex flex-col items-center justify-center p-3 rounded-full bg-black/40 backdrop-blur-xs">
                {/* Active Breath Phase */}
                <div
                  className={`text-sm sm:text-base font-black uppercase tracking-widest drop-shadow ${
                    breathPhase === 'Inhale'
                      ? 'text-sky-300'
                      : breathPhase === 'Hold'
                      ? 'text-[#ffd700]'
                      : 'text-amber-300'
                  }`}
                >
                  {isKriyas
                    ? breathPhase === 'Inhale'
                      ? 'Inhale · Spine Up'
                      : breathPhase === 'Hold'
                      ? 'Hold · Kutastha'
                      : 'Exhale · Spine Down'
                    : breathPhase}
                </div>

                {/* Big Live Count within Phase */}
                <div className="text-4xl sm:text-5xl font-black tracking-tight text-white font-mono tabular-nums drop-shadow-lg my-0.5">
                  {breathCountInPhase} <span className="text-xl text-white/50">/ {currentPhaseMaxCount}</span>
                </div>

                {/* Round indicator */}
                <div className="text-[11px] font-bold text-[#ffd700] bg-black/60 px-2.5 py-0.5 rounded-full border border-[#ffd700]/40 shadow-sm">
                  {isKriyas
                    ? `Kriya ${Math.min(targetRounds, Math.max(completedBeads, breathRoundsCompleted) + 1)} of ${targetRounds}`
                    : `Round ${Math.min(targetRounds, breathRoundsCompleted + 1)} of ${targetRounds}`}
                </div>
              </div>
            ) : isPlayUntilFinished ? (
              <div className="flex flex-col items-center justify-center p-3 rounded-full bg-black/45 backdrop-blur-xs">
                {/* Music-driven Mode */}
                <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest font-bold text-amber-300 mb-1">
                  <Music className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sacred Music Playing</span>
                </div>

                <div className="text-4xl sm:text-5xl font-black tracking-tight text-white font-mono tabular-nums drop-shadow-md">
                  {formatSecondsToTimestamp(trackElapsedSeconds)}
                </div>

                <div className="mt-2 text-center">
                  <span className="text-[10px] text-emerald-300 font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 animate-pulse">
                    Plays until music finishes · Auto-advancing
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-3 rounded-full bg-black/35 backdrop-blur-xs">
                {/* Standard Timer */}
                <div className="flex items-center gap-1 text-[11px] uppercase tracking-widest font-bold text-sky-300/90 mb-1">
                  <Wind className="w-3 h-3" />
                  <span>{breathPhase}</span>
                </div>

                <div className="text-5xl sm:text-6xl font-black tracking-tight text-white font-mono tabular-nums drop-shadow-md">
                  {timeString}
                </div>

                {/* For Kriyas */}
                {isKriyas && targetBeads > 0 && (
                  <div className="mt-2 flex flex-col items-center">
                    <span className="text-xs font-bold text-[#ffd700] bg-black/60 px-3 py-1 rounded-full border border-[#ffd700]/40">
                      {completedBeads} / {targetBeads} Kriyas
                    </span>
                    <span className="text-[10px] text-white/70 mt-0.5">
                      Tap button or Spacebar to count
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Specialized Mala Beads Interactive Tap Bar (For Kriyas) */}
        {isKriyas && targetBeads > 0 && !isCompleted && (
          <div className="w-full max-w-sm mb-3 p-2.5 bg-black/45 rounded-2xl border border-[#ffd700]/40 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleAdvanceBead}
              disabled={completedBeads >= targetBeads}
              className="flex-1 py-2 px-3 bg-gradient-to-r from-[#ffd700] to-[#f59e0b] hover:from-[#ffe033] hover:to-[#ffb703] active:scale-95 text-[#06103b] font-black rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              <MalaBeadsIcon className="w-5 h-5" />
              <span>Next Kriya Bead ({Math.min(targetBeads, completedBeads + 1)}/{targetBeads})</span>
            </button>

            <span className="text-[11px] font-bold text-amber-200 px-2.5 py-2 rounded-xl bg-white/10 border border-white/15">
              Paced ({breathPattern.inhale}·{breathPattern.hold}·{breathPattern.exhale})
            </span>
          </div>
        )}

        {/* Main Transport Controls */}
        <div className="flex items-center justify-center gap-4 mt-1">
          {/* Previous Stage */}
          {isSequenceMode && (
            <button
              type="button"
              onClick={handlePreviousStage}
              disabled={currentStageIndex === 0}
              aria-label="Previous Stage"
              className="w-11 h-11 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-white active:scale-90 cursor-pointer"
            >
              <SkipBack className="w-5 h-5" />
            </button>
          )}

          {/* Reset / Restart */}
          <button
            type="button"
            onClick={handleReset}
            aria-label="Restart Stage"
            className="w-11 h-11 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-all text-white active:scale-90 cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          {/* Play / Pause Primary CTA */}
          <button
            type="button"
            onClick={handleTogglePlay}
            aria-label={isRunning ? 'Pause Timer' : 'Resume Timer'}
            className="w-16 h-16 rounded-full bg-gradient-to-r from-[#ffe033] via-[#ffd700] to-[#f59e0b] hover:from-[#ffeb66] hover:to-[#ffd133] text-[#06103b] font-black shadow-xl flex items-center justify-center transition-all duration-150 active:scale-95 border-2 border-white cursor-pointer"
          >
            {isRunning ? (
              <Pause className="w-7 h-7 fill-current" />
            ) : (
              <Play className="w-7 h-7 fill-current ml-1" />
            )}
          </button>

          {/* Manual Temple Bell Chime */}
          <button
            type="button"
            onClick={() => soundEngine.playTempleBell(1)}
            aria-label="Strike Temple Bell"
            className="w-11 h-11 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-all text-amber-200 active:scale-90 cursor-pointer"
            title="Ring Temple Bell"
          >
            <Bell className="w-5 h-5" />
          </button>

          {/* Next Stage / Skip */}
          {isSequenceMode && (
            <button
              type="button"
              onClick={handleNextStage}
              aria-label="Next Stage"
              className="w-11 h-11 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-all text-white active:scale-90 cursor-pointer"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Bottom Soundscape Bar & Adjuster */}
      <div className="w-full max-w-xl bg-black/50 backdrop-blur-md rounded-2xl border border-[#ffd700]/30 p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        {/* Soundscape Identifier & Switcher */}
        <div className="relative flex items-center gap-2">
          <span className="text-xl">{currentSound.icon}</span>
          <div>
            <div className="font-semibold text-[#ffd700] flex items-center gap-1.5">
              <span>{currentSound.name}</span>
              <button
                type="button"
                onClick={() => setShowSoundMenu(!showSoundMenu)}
                className="underline text-[11px] text-sky-300 hover:text-white ml-1 cursor-pointer"
              >
                (Change)
              </button>
            </div>
            <div className="text-[11px] text-white/70 truncate max-w-[200px]">
              {currentSound.subtitle}
            </div>
          </div>

          {/* Inline Soundscape Dropdown Menu */}
          {showSoundMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowSoundMenu(false)}
              />
              <div className="absolute bottom-full left-0 mb-2 w-72 bg-[#081347] border border-[#ffd700]/40 rounded-xl shadow-2xl p-2 z-50 max-h-72 sm:max-h-80 overflow-y-auto">
                <div className="text-[10px] uppercase font-bold text-[#ffd700] px-2 py-1 flex items-center justify-between border-b border-white/10 pb-1 mb-1">
                  <span>Switch Ambient Soundscape</span>
                  <span className="text-[9px] text-white/50">{SOUNDSCAPES.length} options</span>
                </div>
                {SOUNDSCAPES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      handleSwitchSoundscape(s.id);
                      setShowSoundMenu(false);
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center gap-2.5 transition-colors cursor-pointer ${
                      activeSoundscape === s.id
                        ? 'bg-[#ffd700] text-[#06103b] font-bold shadow'
                        : 'text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="text-base shrink-0">{s.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate leading-tight">{s.name}</div>
                      <div
                        className={`text-[10px] truncate ${
                          activeSoundscape === s.id ? 'text-[#06103b]/80 font-medium' : 'text-white/60'
                        }`}
                      >
                        {s.subtitle}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Volume & Mute Controls */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleToggleMute}
            aria-label={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            className="p-1.5 rounded-lg text-[#ffd700] hover:bg-white/10 transition-colors cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-300" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={handleVolumeChange}
            aria-label="Soundscape Volume"
            className="w-24 sm:w-32 accent-[#ffd700] cursor-pointer"
          />
          <span className="text-[11px] text-[#ffd700] tabular-nums w-8">
            {Math.round(volume * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
};
