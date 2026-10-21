import { SoundscapeType } from '../utils/soundscapes';

export type StageId =
  | 'exercises'
  | 'opening_prayer'
  | 'chant'
  | 'affirmation'
  | 'breathing_1'
  | 'breathing_2'
  | 'hong_sau'
  | 'presence_hong_sau'
  | 'om'
  | 'presence_om'
  | 'mahamudra'
  | 'kriyas'
  | 'presence_kriya'
  | 'jyoti_mudra'
  | 'meditation'
  | 'world_prayer'
  | 'closing_prayer'
  | string;

export type AppTheme =
  | 'spiritual_eye'
  | 'celestial_twilight'
  | 'sacred_temple'
  | 'lotus_dawn'
  | 'classic_saffron';

export interface BreathPattern {
  inhale: number;
  hold: number;
  exhale: number;
}

export interface CustomMediaConfig {
  enabled: boolean;
  type?: 'youtube' | 'mp3' | 'auto';
  url: string;
  title?: string;
  affirmationText?: string; // Words of affirmation / sacred text to recite or reflect upon
  muteSoundscape?: boolean;
  playUntilFinished?: boolean; // When true, plays until music ends instead of fixed timer
}

export interface MeditationStageConfig {
  id: StageId;
  title: string;
  subtitle: string;
  minutes: number;
  isCountBased?: boolean;
  kriyaCount?: number;
  secondsPerKriya?: number;
  breathRounds?: number;
  breathPattern?: BreathPattern;
  soundscape: SoundscapeType;
  soundscapeVolume: number; // 0 to 1
  bellAtStart: boolean;
  bellAtEnd: boolean;
  intervalBellMinutes?: number; // 0 for off
  summary: string;
  customMedia?: CustomMediaConfig;
  playUntilFinished?: boolean; // Play till music is over (for Chants, Affirmations, Prayers)
  stageType?: 'standard' | 'chant' | 'affirmation' | 'sacred_voices' | 'thirty_counts';
  isCustomAdded?: boolean;
  techniqueGuide: {
    purpose: string;
    posture: string;
    instructions: string[];
    sacredQuote?: string;
    prayerText?: string;
    affirmationText?: string;
  };
}

export interface UserSessionSettings {
  theme: AppTheme;
  incrementStep: 1 | 5;
  useBeadsModeForKriya: boolean;
  stages: Record<StageId, MeditationStageConfig>;
}
