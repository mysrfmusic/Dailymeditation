import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MeditationStageConfig, StageId, CustomMediaConfig } from '../types/meditation';
import { STAGE_ORDER } from '../data/stages';
import { SOUNDSCAPES, SoundscapeType, soundEngine } from '../utils/soundscapes';
import {
  DEVOTIONAL_ALBUMS,
  HARMONIES_CATEGORIES,
  ALL_SACRED_TRACKS,
  ALL_DEVOTIONAL_SONGS,
  ALL_AFFIRMATION_PRESETS,
  STAGE_MEDIA_PRESETS,
  StageMediaPreset,
  getYouTubeEmbedUrl,
  detectMediaType,
  extractYouTubeId,
  extractYouTubeStartTime,
  formatSecondsToTimestamp,
  cleanAndCanonicalizeYouTubeUrl,
} from '../utils/customMedia';
import { backgroundKeepalive } from '../utils/backgroundKeepalive';
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
  Search,
  Check,
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
  onSaveCustomMedia?: (stageId: StageId, mediaConfig: CustomMediaConfig | undefined) => void;
  onUpdateStageConfig?: (stageId: string, updates: Partial<MeditationStageConfig>) => void;
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
  onSaveCustomMedia,
  onUpdateStageConfig,
}) => {
  const activeOrder = stageOrder && stageOrder.length > 0 ? stageOrder : STAGE_ORDER;
  const currentStage = stages[activeStageId] || stages['kriyas'] || Object.values(stages)[0];

  // Pranayama / Breathing Exercise & Kriya / 30-Counts / Jyoti Mudra state
  const isKriyas = currentStage.id === 'kriyas';
  const isThirtyCounts =
    currentStage.stageType === 'thirty_counts' || currentStage.id.startsWith('thirty_counts');
  const isJyotiMudra = currentStage.id === 'jyoti_mudra';
  const isBreathing1 = currentStage.id === 'breathing_1';
  const isBreathing2 = currentStage.id === 'breathing_2';
  const isPranayama = isBreathing1 || isBreathing2;
  const isCountBasedStage =
    (isKriyas || isThirtyCounts || isJyotiMudra) && currentStage.isCountBased !== false;
  const isBreathingStage = isPranayama || isCountBasedStage;
  const breathPattern =
    currentStage.breathPattern ||
    (isJyotiMudra
      ? { inhale: 12, hold: 3, exhale: 12 }
      : isKriyas || isThirtyCounts
      ? { inhale: 10, hold: 3, exhale: 10 }
      : { inhale: 6, hold: 6, exhale: 6 });
  const targetRounds = isThirtyCounts
    ? (currentStage.kriyaCount ?? 30)
    : isKriyas
    ? (currentStage.kriyaCount ?? 24)
    : isJyotiMudra
    ? (currentStage.breathRounds ?? (currentStage.kriyaCount ?? 3))
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
  const [isScreenAwake, setIsScreenAwake] = useState<boolean>(true);
  const lastTimestampRef = useRef<number>(Date.now());

  // Kriyas / 30-Counts / Jyoti Mudra bead counter state
  const targetBeads = isCountBasedStage
    ? (isJyotiMudra
        ? (currentStage.breathRounds ?? (currentStage.kriyaCount ?? 3))
        : (currentStage.kriyaCount ?? (isThirtyCounts ? 30 : 24)))
    : 0;
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

  // Affirmation / Sacred Words text - STRICTLY scoped to affirmation or sacred voice stage so it never carries over
  const affirmationText = currentStage.customMedia?.affirmationText || currentStage.techniqueGuide?.affirmationText;
  const hasAffirmation = Boolean(affirmationText && (isAffirmation || isSacredVoice));
  const [showAffirmationOverlay, setShowAffirmationOverlay] = useState<boolean>(true);

  const [trackElapsedSeconds, setTrackElapsedSeconds] = useState<number>(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);
  const [mobileAutoplayBlocked, setMobileAutoplayBlocked] = useState<boolean>(false);

  const [showVideo, setShowVideo] = useState<boolean>(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const youtubeIframeRef = useRef<HTMLIFrameElement | null>(null);
  const isIframeReadyRef = useRef<boolean>(false);
  const currentLoadedVideoIdRef = useRef<string | null>(null);
  const hasUserUnlockedRef = useRef<boolean>(false);
  const youtubeRetryTimersRef = useRef<number[]>([]);

  const clearYouTubeRetryTimers = () => {
    youtubeRetryTimersRef.current.forEach((t) => window.clearTimeout(t));
    youtubeRetryTimersRef.current = [];
  };

  // Stable pre-warmed initial YouTube URL so the iframe never reloads its src on stage transitions
  const initialYouTubeUrlRef = useRef<string>(
    (stages[activeStageId]?.customMedia?.enabled &&
      stages[activeStageId]?.customMedia?.url &&
      extractYouTubeId(stages[activeStageId]!.customMedia!.url) &&
      stages[activeStageId]!.customMedia!.url) ||
      activeOrder
        .map((id) => stages[id]?.customMedia?.url)
        .find((u) => u && extractYouTubeId(u)) ||
      'https://www.youtube.com/watch?v=c4N3fCg8AR0'
  );

  const sendYouTubeCommand = (func: string, args: any[] = []) => {
    if (youtubeIframeRef.current?.contentWindow) {
      try {
        youtubeIframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func, args }),
          '*'
        );
      } catch {}
    }
  };

  const pausePersistentYouTube = () => {
    clearYouTubeRetryTimers();
    sendYouTubeCommand('pauseVideo');
    sendYouTubeCommand('stopVideo');
    sendYouTubeCommand('mute');
  };

  const triggerPlayCurrentYouTube = () => {
    if (!isYouTube || !currentStage.customMedia?.url) {
      pausePersistentYouTube();
      return;
    }
    const targetVideoId = extractYouTubeId(currentStage.customMedia.url);
    const targetStartTime = extractYouTubeStartTime(currentStage.customMedia.url) || 0;
    if (!targetVideoId) return;

    try {
      youtubeIframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'listening', id: 1 }),
        '*'
      );
      if (currentLoadedVideoIdRef.current !== targetVideoId) {
        sendYouTubeCommand('loadVideoById', [targetVideoId, targetStartTime]);
        currentLoadedVideoIdRef.current = targetVideoId;
      }
      sendYouTubeCommand('unMute');
      sendYouTubeCommand('setVolume', [100]);
      sendYouTubeCommand('playVideo');
    } catch {}
  };

  // Soundscape state for current session
  const [activeSoundscape, setActiveSoundscape] = useState<SoundscapeType>(currentStage.soundscape);
  const [volume, setVolume] = useState<number>(currentStage.soundscapeVolume ?? 0.65);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showSoundMenu, setShowSoundMenu] = useState<boolean>(false);

  // In-session Audio Switcher Modal states
  const [showAudioSwitcherModal, setShowAudioSwitcherModal] = useState<boolean>(false);
  const [audioSearchQuery, setAudioSearchQuery] = useState<string>('');
  const [audioCategoryTab, setAudioCategoryTab] = useState<
    'suggested' | 'all_songs' | 'affirmations' | 'harmonies_mp3' | 'albums' | 'soundscapes'
  >('suggested');
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('all');
  const [inSessionToast, setInSessionToast] = useState<string | null>(null);

  const showInSessionToast = (msg: string) => {
    setInSessionToast(msg);
    setTimeout(() => {
      setInSessionToast(null);
    }, 3000);
  };

  // Filtered tracks for the in-session audio switcher
  const inSessionTracks = useMemo(() => {
    let pool: StageMediaPreset[] = [];
    if (audioCategoryTab === 'suggested') {
      const stageKey = currentStage.stageType || currentStage.id;
      pool =
        (STAGE_MEDIA_PRESETS as any)[stageKey] ||
        (STAGE_MEDIA_PRESETS as any)[currentStage.id] ||
        STAGE_MEDIA_PRESETS.chant ||
        [];
    } else if (audioCategoryTab === 'all_songs') {
      pool = ALL_DEVOTIONAL_SONGS;
    } else if (audioCategoryTab === 'affirmations') {
      pool = ALL_AFFIRMATION_PRESETS;
    } else if (audioCategoryTab === 'harmonies_mp3') {
      pool = ALL_SACRED_TRACKS.filter((t) => t.type === 'mp3');
    } else if (audioCategoryTab === 'albums') {
      pool = ALL_SACRED_TRACKS;
    }

    if (selectedAlbumId !== 'all') {
      pool = pool.filter(
        (t) =>
          t.albumId === selectedAlbumId ||
          t.album === selectedAlbumId ||
          t.category === selectedAlbumId
      );
    }

    if (audioSearchQuery.trim()) {
      const q = audioSearchQuery.toLowerCase().trim();
      pool = pool.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.subtitle.toLowerCase().includes(q) ||
          (t.album && t.album.toLowerCase().includes(q)) ||
          (t.speaker && t.speaker.toLowerCase().includes(q)) ||
          (t.affirmationText && t.affirmationText.toLowerCase().includes(q))
      );
    }

    return pool;
  }, [audioCategoryTab, selectedAlbumId, audioSearchQuery, currentStage.id, currentStage.stageType]);

  const handleApplyNewAudioInSession = (
    preset: StageMediaPreset | null,
    newSoundscape?: SoundscapeType
  ) => {
    if (preset) {
      const isYt = preset.type === 'youtube';
      const cleanUrl = isYt ? cleanAndCanonicalizeYouTubeUrl(preset.url) : preset.url;
      const newConfig: CustomMediaConfig = {
        enabled: true,
        url: cleanUrl,
        title: preset.title,
        affirmationText: preset.affirmationText,
        type: isYt ? 'youtube' : 'mp3',
        muteSoundscape: true,
        playUntilFinished: true,
      };

      if (onSaveCustomMedia) {
        onSaveCustomMedia(activeStageId, newConfig);
      }
      if (onUpdateStageConfig) {
        onUpdateStageConfig(activeStageId, {
          customMedia: newConfig,
          playUntilFinished: true,
          techniqueGuide: {
            ...currentStage.techniqueGuide,
            affirmationText: preset.affirmationText || currentStage.techniqueGuide.affirmationText,
          },
        });
      }

      if (isYt) {
        const vidId = extractYouTubeId(cleanUrl);
        const startTime = extractYouTubeStartTime(cleanUrl) || 0;
        if (vidId) {
          soundEngine.stopSoundscape();
          if (audioRef.current) audioRef.current.pause();
          hasUserUnlockedRef.current = true;
          soundEngine.unlockAudio();
          sendYouTubeCommand('loadVideoById', [vidId, startTime]);
          sendYouTubeCommand('unMute');
          sendYouTubeCommand('setVolume', [100]);
          sendYouTubeCommand('playVideo');
          currentLoadedVideoIdRef.current = vidId;
          setIsVideoPlaying(true);
        }
      } else {
        // Direct MP3
        pausePersistentYouTube();
        soundEngine.stopSoundscape();
        if (audioRef.current) {
          audioRef.current.src = cleanUrl;
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
        }
      }
      setTrackElapsedSeconds(0);
      showInSessionToast(`Playing: "${preset.title}"`);
    } else if (newSoundscape) {
      pausePersistentYouTube();
      if (audioRef.current) audioRef.current.pause();
      if (onUpdateStageConfig) {
        onUpdateStageConfig(activeStageId, {
          soundscape: newSoundscape,
          customMedia: undefined,
        });
      }
      if (onSaveCustomMedia) {
        onSaveCustomMedia(activeStageId, undefined);
      }
      setActiveSoundscape(newSoundscape);
      soundEngine.playSoundscape(newSoundscape);
      showInSessionToast(
        `Switched to: ${SOUNDSCAPES.find((s) => s.id === newSoundscape)?.name || newSoundscape}`
      );
    }
    setShowAudioSwitcherModal(false);
  };

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

      // Start background keepalive & screen wake lock to prevent locktimeout sleep
      backgroundKeepalive.requestWakeLock().then((active) => {
        setIsScreenAwake(active);
      });
      backgroundKeepalive.startAudioKeepalive();
      backgroundKeepalive.updateMediaSession(
        currentStage.title,
        currentStage.subtitle,
        true,
        {
          onPlay: () => setIsRunning(true),
          onPause: () => setIsRunning(false),
          onNext: () => handleNextStage(),
          onPrev: () => handlePreviousStage(),
        }
      );

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

      // If YouTube, seamless track playback via loadVideoById on persistent player
      clearYouTubeRetryTimers();
      if (isYouTube) {
        triggerPlayCurrentYouTube();
        const t1 = window.setTimeout(triggerPlayCurrentYouTube, 200);
        const t2 = window.setTimeout(triggerPlayCurrentYouTube, 600);
        const t3 = window.setTimeout(triggerPlayCurrentYouTube, 1200);
        youtubeRetryTimersRef.current = [t1, t2, t3];
      } else {
        pausePersistentYouTube();
        const t1 = window.setTimeout(pausePersistentYouTube, 200);
        const t2 = window.setTimeout(pausePersistentYouTube, 600);
        youtubeRetryTimersRef.current = [t1, t2];
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
      clearYouTubeRetryTimers();
      soundEngine.stopSoundscape();
      backgroundKeepalive.releaseWakeLock();
      backgroundKeepalive.stopAudioKeepalive();
      pausePersistentYouTube();
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }

    return () => {
      clearYouTubeRetryTimers();
      soundEngine.stopSoundscape();
      backgroundKeepalive.releaseWakeLock();
      backgroundKeepalive.stopAudioKeepalive();
      pausePersistentYouTube();
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [isOpen, activeStageId]);

  // YouTube Iframe event listener & mobile autoplay detection
  useEffect(() => {
    if (!isOpen) return;

    const handleMessage = (e: MessageEvent) => {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (!data) return;

        // When YouTube frame signals onReady or initialDelivery, acknowledge listening and command play if on YouTube stage
        if (data.event === 'onReady' || data.event === 'initialDelivery') {
          isIframeReadyRef.current = true;
          try {
            youtubeIframeRef.current?.contentWindow?.postMessage(
              JSON.stringify({ event: 'listening', id: 1 }),
              '*'
            );
            if (isYouTube && isRunning) {
              triggerPlayCurrentYouTube();
            } else if (!isYouTube) {
              pausePersistentYouTube();
            }
          } catch {}
        }

        let playerState: number | undefined;
        if (data.event === 'onStateChange') {
          playerState = data.info;
        } else if (data.event === 'infoDelivery' && data.info?.playerState !== undefined) {
          playerState = data.info.playerState;
        }

        if (playerState === 1) {
          // If video started playing while on a non-YouTube stage (e.g. late buffer after affirmation ended), silence immediately!
          if (!isYouTube) {
            pausePersistentYouTube();
            setIsVideoPlaying(false);
            return;
          }
          setIsVideoPlaying(true);
          setMobileAutoplayBlocked(false);
          hasUserUnlockedRef.current = true;
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

    // Fast check for mobile autoplay restriction (1.5s timeout)
    const checkTimer = setTimeout(() => {
      if (isYouTube && isRunning && !isVideoPlaying) {
        setMobileAutoplayBlocked(true);
      }
    }, 1500);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(checkTimer);
    };
  }, [isOpen, isYouTube, isRunning, isVideoPlaying, isPlayUntilFinished]);

  const handleMobilePlayUnlock = () => {
    hasUserUnlockedRef.current = true;
    soundEngine.unlockAudio();
    if (isYouTube && currentStage.customMedia?.url) {
      const targetVideoId = extractYouTubeId(currentStage.customMedia.url);
      const targetStartTime = extractYouTubeStartTime(currentStage.customMedia.url) || 0;
      if (targetVideoId) {
        sendYouTubeCommand('loadVideoById', [targetVideoId, targetStartTime]);
        currentLoadedVideoIdRef.current = targetVideoId;
      }
      sendYouTubeCommand('unMute');
      sendYouTubeCommand('setVolume', [100]);
      sendYouTubeCommand('playVideo');
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

            if (isKriyas || isJyotiMudra || isThirtyCounts) {
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
    clearYouTubeRetryTimers();
    pausePersistentYouTube();

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
      clearYouTubeRetryTimers();
      hasUserUnlockedRef.current = true;
      soundEngine.unlockAudio();
      const prevStage = stages[activeOrder[currentIndex - 1]];
      if (prevStage?.customMedia?.enabled && prevStage.customMedia.url) {
        const vidId = extractYouTubeId(prevStage.customMedia.url);
        const startTime = extractYouTubeStartTime(prevStage.customMedia.url) || 0;
        if (vidId) {
          sendYouTubeCommand('loadVideoById', [vidId, startTime]);
          sendYouTubeCommand('unMute');
          sendYouTubeCommand('setVolume', [100]);
          sendYouTubeCommand('playVideo');
          currentLoadedVideoIdRef.current = vidId;
        }
      } else {
        pausePersistentYouTube();
      }
      onStageChange(activeOrder[currentIndex - 1]);
    }
  };

  const handleNextStage = () => {
    const currentIndex = activeOrder.indexOf(activeStageId);
    if (currentIndex < activeOrder.length - 1) {
      clearYouTubeRetryTimers();
      hasUserUnlockedRef.current = true;
      soundEngine.unlockAudio();
      const nextStage = stages[activeOrder[currentIndex + 1]];
      if (nextStage?.customMedia?.enabled && nextStage.customMedia.url) {
        const vidId = extractYouTubeId(nextStage.customMedia.url);
        const startTime = extractYouTubeStartTime(nextStage.customMedia.url) || 0;
        if (vidId) {
          sendYouTubeCommand('loadVideoById', [vidId, startTime]);
          sendYouTubeCommand('unMute');
          sendYouTubeCommand('setVolume', [100]);
          sendYouTubeCommand('playVideo');
          currentLoadedVideoIdRef.current = vidId;
        }
      } else {
        pausePersistentYouTube();
      }
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
              {isThirtyCounts ? '30 Counts Practice' : 'Single Session'}
            </span>
          )}
          {isScreenAwake && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 flex items-center gap-1"
              title="Screen Wake Lock active: display sleep and lock timeout prevented on mobile & PC"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Screen Awake 🔆</span>
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

        {/* Change Audio CTA during full routine */}
        <div className="flex items-center gap-2 mt-1.5 mb-1">
          <button
            type="button"
            onClick={() => setShowAudioSwitcherModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 text-amber-200 hover:text-white border border-amber-400/35 transition-all cursor-pointer backdrop-blur-sm active:scale-95 shadow-sm"
            title="Change music or audio for this stage without interrupting your routine"
          >
            <Music className="w-3.5 h-3.5 text-amber-300" />
            <span className="truncate max-w-[200px]">
              {hasCustomMedia ? customMedia?.title || 'Custom Track' : currentSound.name}
            </span>
            <span className="text-[10px] text-[#ffd700] underline font-bold ml-0.5">Change Audio</span>
          </button>
        </div>

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

        {/* Persistent YouTube Media Player Card: Kept in DOM across entire session for rock-solid iOS/PC autoplay */}
        <div
          className={`w-full max-w-sm mt-2 mb-1 p-2.5 bg-black/60 border border-amber-400/40 rounded-2xl flex-col items-center gap-2 shadow-lg backdrop-blur-sm ${
            isYouTube ? 'flex' : 'hidden'
          }`}
          style={{ display: isYouTube ? 'flex' : 'none' }}
        >
          {isYouTube && (
            <div className="w-full flex items-center justify-between text-xs px-1">
              <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                <span className="p-1 rounded-md bg-red-600/30 text-red-400">
                  <Youtube className="w-3.5 h-3.5 fill-current" />
                </span>
                <span className="font-semibold text-amber-200 truncate">
                  {customMedia?.title || (isChant ? 'Cosmic Chant Audio' : isAffirmation ? 'Healing Affirmation' : 'Sacred YouTube Audio')}
                </span>
                {customMedia?.url && extractYouTubeStartTime(customMedia.url) !== null && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30 whitespace-nowrap">
                    ⏱ {formatSecondsToTimestamp(extractYouTubeStartTime(customMedia.url)!)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
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
                <button
                  type="button"
                  onClick={() => setShowAudioSwitcherModal(true)}
                  className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center gap-1 cursor-pointer transition-all shadow-sm active:scale-95"
                  title="Change audio or song for this stage"
                >
                  <Music className="w-3 h-3" /> Change
                </button>
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
                {customMedia?.url && (
                  <a
                    href={customMedia.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/60 hover:text-white p-1"
                    title="Open in new window / external app"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Persistent Iframe Viewport: ALWAYS mounted from turn 1 so iOS Safari grants media authorization */}
          <div
            onClick={() => {
              if (!isVideoPlaying) {
                handleMobilePlayUnlock();
              }
            }}
            className={`relative w-full rounded-2xl overflow-hidden bg-black border border-amber-400/40 shadow-xl transition-all duration-300 ${
              showVideo ? 'aspect-video' : 'h-36 sm:h-44'
            }`}
          >
            <iframe
              ref={youtubeIframeRef}
              src={getYouTubeEmbedUrl(initialYouTubeUrlRef.current, false, false) || ''}
              title={customMedia?.title || 'Sacred YouTube Player'}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay *; clipboard-write; encrypted-media *; gyroscope; picture-in-picture *; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              onLoad={() => {
                isIframeReadyRef.current = true;
                if (isYouTube) {
                  triggerPlayCurrentYouTube();
                  setTimeout(triggerPlayCurrentYouTube, 300);
                  setTimeout(triggerPlayCurrentYouTube, 800);
                }
              }}
            />
          </div>

          {isYouTube && (
            <>
              <div className="w-full flex items-center justify-between px-1 text-xs">
                <span className="text-[11px] text-amber-200/80 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Synchronized Audio & Video</span>
                </span>
                {customMedia?.url && (
                  <a
                    href={cleanAndCanonicalizeYouTubeUrl(customMedia.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-bold text-amber-300 hover:text-white underline flex items-center gap-1 cursor-pointer"
                    title="Open directly on YouTube app or browser"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Watch in YouTube App</span>
                  </a>
                )}
              </div>

              {/* Mobile Autoplay Helper: Shown if mobile Safari blocked unmuted autoplay after stage transition */}
              {mobileAutoplayBlocked && !isVideoPlaying && (
                <button
                  type="button"
                  onClick={handleMobilePlayUnlock}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-xl animate-pulse cursor-pointer border border-amber-200"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Tap to Play & Unmute Sacred Video (Mobile)</span>
                </button>
              )}
            </>
          )}
        </div>

        {/* Dedicated MP3 Player Card for direct audio files */}
        {hasCustomMedia && isAudioFile && customMedia && (
          <div className="w-full max-w-sm mt-2 mb-1 p-2.5 bg-black/60 border border-amber-400/40 rounded-2xl flex flex-col items-center gap-2 shadow-lg backdrop-blur-sm">
            <div className="w-full flex items-center justify-between text-xs px-1">
              <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                <span className="p-1 rounded-md bg-sky-600/30 text-sky-400">
                  <Music className="w-3.5 h-3.5" />
                </span>
                <span className="font-semibold text-amber-200 truncate">
                  {customMedia.title || 'Audio Track'}
                </span>
              </div>
            </div>
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
                  {isThirtyCounts
                    ? `Count ${Math.min(targetRounds, Math.max(completedBeads, breathRoundsCompleted) + 1)} of ${targetRounds}`
                    : isKriyas
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

                {/* For Kriyas and 30 Counts */}
                {(isKriyas || isThirtyCounts) && targetBeads > 0 && (
                  <div className="mt-2 flex flex-col items-center">
                    <span className="text-xs font-bold text-[#ffd700] bg-black/60 px-3 py-1 rounded-full border border-[#ffd700]/40">
                      {completedBeads} / {targetBeads} {isThirtyCounts ? 'Counts' : 'Kriyas'}
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

        {/* Specialized Mala Beads Interactive Tap Bar (For Kriyas, 30-Counts & Jyoti Mudra) */}
        {(isKriyas || isThirtyCounts || isJyotiMudra) && targetBeads > 0 && !isCompleted && (
          <div className="w-full max-w-sm mb-3 p-2.5 bg-black/45 rounded-2xl border border-[#ffd700]/40 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleAdvanceBead}
              disabled={completedBeads >= targetBeads}
              className="flex-1 py-2 px-3 bg-gradient-to-r from-[#ffd700] to-[#f59e0b] hover:from-[#ffe033] hover:to-[#ffb703] active:scale-95 text-[#06103b] font-black rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              <MalaBeadsIcon className="w-5 h-5" />
              <span>
                {isThirtyCounts
                  ? `Next Count (${Math.min(targetBeads, completedBeads + 1)}/${targetBeads})`
                  : isJyotiMudra
                  ? `Next Jyoti Mudra Count (${Math.min(targetBeads, completedBeads + 1)}/${targetBeads})`
                  : `Next Kriya Bead (${Math.min(targetBeads, completedBeads + 1)}/${targetBeads})`}
              </span>
            </button>

            <span className="text-[11px] font-bold text-amber-200 px-2.5 py-2 rounded-xl bg-white/10 border border-white/15">
              {isJyotiMudra ? '12·3·12 Format' : `Paced (${breathPattern.inhale}·${breathPattern.hold}·${breathPattern.exhale})`}
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

        {/* Stage Music & Audio Track Switcher Button */}
        <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-white/10 pt-2 sm:pt-0 sm:pl-3">
          <button
            type="button"
            onClick={() => setShowAudioSwitcherModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 hover:text-white border border-amber-400/40 text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-sm"
            title="Switch track, chant, or soundscape for this routine stage"
          >
            <Music className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate max-w-[130px] sm:max-w-[160px]">
              {hasCustomMedia ? customMedia?.title || 'Custom Track' : 'Stage Audio'}
            </span>
            <span className="text-[10px] bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded-full font-black">
              Switch
            </span>
          </button>
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

      {/* Real-time In-session Toast */}
      {inSessionToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[80] px-4 py-2 bg-emerald-600/95 text-white font-semibold text-xs rounded-full shadow-2xl flex items-center gap-2 animate-fadeIn border border-emerald-400/50 backdrop-blur-md">
          <Check className="w-4 h-4 text-emerald-200" />
          <span>{inSessionToast}</span>
        </div>
      )}

      {/* In-Session Audio Switcher Dialog */}
      {showAudioSwitcherModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[75] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fadeIn"
        >
          <div className="relative w-full max-w-xl bg-[#0c1533] text-slate-100 border border-amber-400/60 rounded-[28px] shadow-2xl p-4 sm:p-6 max-h-[90vh] flex flex-col gap-3">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-700/80">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  <Music className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-amber-300 font-spiritual">
                    Change Audio for {currentStage.title}
                  </h3>
                  <p className="text-xs text-slate-300">
                    Switch to any devotional song, chant, affirmation, or soundscape live during your routine.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAudioSwitcherModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close audio switcher"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'suggested', label: `For ${currentStage.title}` },
                { id: 'all_songs', label: `All Songs (${ALL_DEVOTIONAL_SONGS.length})` },
                { id: 'affirmations', label: `Affirmations (${ALL_AFFIRMATION_PRESETS.length})` },
                { id: 'harmonies_mp3', label: 'Harmonies MP3s (71)' },
                { id: 'albums', label: 'All 21 Albums' },
                { id: 'soundscapes', label: 'Ambient Soundscapes' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAudioCategoryTab(tab.id as any)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer border ${
                    audioCategoryTab === tab.id
                      ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold shadow-sm'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search & Album Filters (when not soundscapes) */}
            {audioCategoryTab !== 'soundscapes' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={audioSearchQuery}
                    onChange={(e) => setAudioSearchQuery(e.target.value)}
                    placeholder="Search songs, chants, lyrics, albums..."
                    className="w-full pl-8 pr-7 py-1.5 bg-slate-950/80 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                  {audioSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setAudioSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="relative">
                  <select
                    value={selectedAlbumId}
                    onChange={(e) => setSelectedAlbumId(e.target.value)}
                    className="w-full py-1.5 px-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-xs text-amber-200 focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="all">All Albums & Categories ({ALL_SACRED_TRACKS.length} tracks)</option>
                    <optgroup label="Devotional Albums (21)">
                      {DEVOTIONAL_ALBUMS.map((album) => (
                        <option key={album.id} value={album.id}>
                          {album.name} ({album.tracks.length} tracks)
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Harmonies Audio Categories">
                      {HARMONIES_CATEGORIES.map((cat) => (
                        <option key={cat.name} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>
            )}

            {/* Track / Soundscape List */}
            <div className="flex-1 overflow-y-auto max-h-60 sm:max-h-72 space-y-2 pr-1">
              {audioCategoryTab === 'soundscapes' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SOUNDSCAPES.map((s) => {
                    const isCurr = activeSoundscape === s.id && !hasCustomMedia;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleApplyNewAudioInSession(null, s.id)}
                        className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          isCurr
                            ? 'bg-amber-400/20 border-amber-400 text-amber-200 shadow-sm'
                            : 'bg-slate-950/60 border-slate-800 hover:border-amber-400/40 text-slate-200 hover:bg-slate-950'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xl shrink-0">{s.icon}</span>
                          <div className="min-w-0">
                            <span className="font-bold text-xs block truncate">{s.name}</span>
                            <span className="text-[10px] text-slate-400 block truncate">{s.subtitle}</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-amber-300 shrink-0">
                          {isCurr ? '✓ Active' : '+ Play'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : inSessionTracks.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800">
                  No tracks found matching "{audioSearchQuery}".
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {inSessionTracks.map((preset) => {
                    const isCurr = customMedia?.url === preset.url;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleApplyNewAudioInSession(preset)}
                        className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                          isCurr
                            ? 'bg-amber-400/20 border-amber-400 text-amber-200 shadow-sm'
                            : 'bg-slate-950/60 border-slate-800 hover:border-amber-400/50 text-slate-200 hover:bg-slate-950'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-1">
                            <span className="font-bold text-xs truncate leading-snug">{preset.title}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              {preset.type === 'youtube' ? (
                                <Youtube className="w-3.5 h-3.5 text-red-400" />
                              ) : (
                                <Music className="w-3.5 h-3.5 text-sky-400" />
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            {preset.album && (
                              <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-white/5 text-amber-300/80 truncate max-w-[160px]">
                                {preset.album}
                              </span>
                            )}
                            {preset.speaker && (
                              <span className="text-[9.5px] text-slate-400 truncate">
                                · {preset.speaker}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                            {preset.subtitle}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-amber-300 font-semibold pt-1 border-t border-white/5">
                          <span>{isCurr ? '✓ Currently Playing' : '+ Play This Track'}</span>
                          {preset.type === 'youtube' ? (
                            <span className="text-[9px] text-red-300">YouTube</span>
                          ) : (
                            <span className="text-[9px] text-sky-300">MP3 Stream</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer with Revert & Advanced Options */}
            <div className="pt-3 border-t border-slate-700/80 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => handleApplyNewAudioInSession(null, currentStage.soundscape)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-800 rounded-full transition-colors flex items-center gap-1 cursor-pointer"
                title="Turn off custom audio and revert to default soundscape"
              >
                <RotateCcw className="w-3 h-3" /> Revert to Soundscape
              </button>

              <div className="flex items-center gap-2">
                {onOpenCustomMediaModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowAudioSwitcherModal(false);
                      onOpenCustomMediaModal(activeStageId);
                    }}
                    className="px-3.5 py-1.5 text-xs font-semibold text-sky-300 hover:text-white bg-white/10 hover:bg-white/15 rounded-full transition-colors cursor-pointer"
                  >
                    Custom URL / Advanced Settings...
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowAudioSwitcherModal(false)}
                  className="px-4 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-full cursor-pointer transition-all active:scale-95 shadow"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
