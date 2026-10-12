import { StageId } from '../types/meditation';

export interface StageMediaPreset {
  id: string;
  title: string;
  subtitle: string;
  url: string;
  type: 'youtube' | 'mp3';
}

/**
 * Extracts a YouTube Video ID from any standard, live, shorts, or shortened YouTube URL.
 * Handles:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/live/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 * - https://m.youtube.com/live/VIDEO_ID
 * - https://www.youtube-nocookie.com/embed/VIDEO_ID
 */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  // 1. Check youtu.be/VIDEO_ID
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/i);
  if (shortMatch && shortMatch[1]) return shortMatch[1];

  // 2. Check /live/VIDEO_ID, /shorts/VIDEO_ID, /embed/VIDEO_ID, /v/VIDEO_ID
  const pathMatch = trimmed.match(/youtube(?:-nocookie)?\.com\/(?:live|shorts|embed|v)\/([a-zA-Z0-9_-]{11})/i);
  if (pathMatch && pathMatch[1]) return pathMatch[1];

  // 3. Check ?v=VIDEO_ID or &v=VIDEO_ID
  const vMatch = trimmed.match(/youtube(?:-nocookie)?\.com\/.*[?&]v=([a-zA-Z0-9_-]{11})/i);
  if (vMatch && vMatch[1]) return vMatch[1];

  // 4. Fallback generalized match
  const fallbackMatch = trimmed.match(
    /(?:youtube(?:-nocookie)?\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i
  );
  return fallbackMatch && fallbackMatch[1] ? fallbackMatch[1] : null;
}

/**
 * Extracts start time in seconds from YouTube URL parameter (e.g. t=10446, t=195s, t=2h54m6s, start=195).
 */
export function extractYouTubeStartTime(url: string): number | null {
  if (!url) return null;
  const match = url.match(/[?&#](?:t|start)=([^&#\s]+)/i);
  if (!match || !match[1]) return null;

  const raw = match[1].toLowerCase();

  // Pure integer seconds e.g. 10446
  if (/^\d+$/.test(raw)) {
    return parseInt(raw, 10);
  }

  // Seconds with s e.g. 195s
  if (/^\d+s$/.test(raw)) {
    return parseInt(raw.replace('s', ''), 10);
  }

  // Timestamp format e.g. 2h54m6s, 3m15s, 45s
  let totalSeconds = 0;
  let matched = false;

  const hours = raw.match(/(\d+)h/);
  if (hours) {
    totalSeconds += parseInt(hours[1], 10) * 3600;
    matched = true;
  }

  const mins = raw.match(/(\d+)m/);
  if (mins) {
    totalSeconds += parseInt(mins[1], 10) * 60;
    matched = true;
  }

  const secs = raw.match(/(\d+)s/);
  if (secs) {
    totalSeconds += parseInt(secs[1], 10);
    matched = true;
  }

  return matched ? totalSeconds : null;
}

/**
 * Formats seconds into human-readable timestamp e.g. 2:54:06 or 3:15.
 */
export function formatSecondsToTimestamp(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Generates an embeddable YouTube URL with clean playback parameters and start offset.
 */
export function getYouTubeEmbedUrl(url: string, autoplay: boolean = true): string | null {
  const videoId = extractYouTubeId(url);
  if (!videoId) return null;
  const autoParam = autoplay ? '1' : '0';
  const startSec = extractYouTubeStartTime(url);
  const startParam = startSec && startSec > 0 ? `&start=${startSec}` : '';
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=${autoParam}&enablejsapi=1&rel=0&playsinline=1&modestbranding=1${startParam}`;
}

/**
 * Determines whether a given URL is a YouTube link or an MP3/Audio file.
 */
export function detectMediaType(url: string): 'youtube' | 'mp3' | 'other' {
  if (!url) return 'other';
  if (extractYouTubeId(url)) return 'youtube';
  const trimmed = url.trim().toLowerCase();
  if (
    trimmed.endsWith('.mp3') ||
    trimmed.endsWith('.m4a') ||
    trimmed.endsWith('.wav') ||
    trimmed.endsWith('.ogg') ||
    trimmed.endsWith('.aac') ||
    trimmed.includes('.mp3?') ||
    trimmed.startsWith('data:audio') ||
    trimmed.startsWith('blob:')
  ) {
    return 'mp3';
  }
  // If it's a general http/https URL that is not YouTube, allow it as an audio stream / mp3
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return 'mp3';
  }
  return 'other';
}

/**
 * Curated sacred presets for Opening Prayer, Chant, World Prayer, and Closing Prayer.
 * Users can 1-click select these or customize their own YouTube / MP3 links.
 */
export const STAGE_MEDIA_PRESETS: Partial<Record<StageId, StageMediaPreset[]>> = {
  opening_prayer: [
    {
      id: 'op_default_requested',
      title: 'SRF Opening Prayer (Paramahansa Yogananda)',
      subtitle: 'Sacred invocation to the Divine and Line of Gurus',
      url: 'https://youtu.be/zPUzuy6hcoE?si=bjAEGU7CqU5t0YM6',
      type: 'youtube',
    },
    {
      id: 'op_invocation_1',
      title: 'SRF Opening Prayer & Guru Invocation',
      subtitle: 'Sacred prayer to Divine Mother and Line of Gurus',
      url: 'https://www.youtube.com/watch?v=kYJqDq1wX3Q',
      type: 'youtube',
    },
    {
      id: 'op_invocation_2',
      title: 'Paramahansa Yogananda Invocation Prayer',
      subtitle: 'Devotional spoken prayer for deep attunement',
      url: 'https://www.youtube.com/watch?v=jWqY1h3C_2o',
      type: 'youtube',
    },
  ],
  chant: [
    {
      id: 'chant_wake_yet_wake',
      title: 'Wake, Yet Wake, O My Saint',
      subtitle: 'SRF Cosmic Chant — Paramahansa Yogananda',
      url: 'https://youtu.be/VVqTgKySMLA?si=ZTwKyzWsoQLfj2Hd',
      type: 'youtube',
    },
    {
      id: 'chant_he_who_knows',
      title: 'He Who Knows',
      subtitle: 'SRF Cosmic Chant — Paramahansa Yogananda',
      url: 'https://youtu.be/mKhXU6XhLQA?si=wKEjRgkn0sbtetd_',
      type: 'youtube',
    },
    {
      id: 'chant_in_samadhi',
      title: 'In Samadhi',
      subtitle: 'SRF Cosmic Chant — Paramahansa Yogananda',
      url: 'https://youtu.be/wjQOnllwNb8?si=JNXeCQ6GbVKHO4lr',
      type: 'youtube',
    },
    {
      id: 'chant_why_o_mind',
      title: 'Why, O Mind, Wanderest Thou',
      subtitle: 'SRF Cosmic Chant — Paramahansa Yogananda',
      url: 'https://youtu.be/UUVHntSSoQ8?si=J6VYXNYnz65AHuOc',
      type: 'youtube',
    },
    {
      id: 'chant_divine_loves_sorrow',
      title: "Divine Love's Sorrow",
      subtitle: 'SRF Cosmic Chant — Paramahansa Yogananda',
      url: 'https://youtu.be/905o-xfQpUM?si=z1LJCStHPvMkY6FE',
      type: 'youtube',
    },
    {
      id: 'chant_what_lightning_flash',
      title: 'What Lightning Flash',
      subtitle: 'SRF Cosmic Chant — Paramahansa Yogananda',
      url: 'https://youtu.be/5w2W-wWF4Qw?si=8wlhbu6zLfWnldv2',
      type: 'youtube',
    },
    {
      id: 'chant_door_of_my_heart',
      title: 'Door of My Heart (Cosmic Chant)',
      subtitle: 'Paramahansa Yogananda — Devotional Bhakti Chant',
      url: 'https://www.youtube.com/watch?v=0qZ8eKkM7aM',
      type: 'youtube',
    },
    {
      id: 'chant_o_god_beautiful',
      title: 'O God Beautiful (Cosmic Chant)',
      subtitle: 'In the forest, in the flowers, in the temple of stillness',
      url: 'https://www.youtube.com/watch?v=F3v6r_K4Z8A',
      type: 'youtube',
    },
    {
      id: 'chant_listen_listen',
      title: 'Listen, Listen, Listen (Cosmic Chant)',
      subtitle: 'Listen to my heart’s song — Cosmic Chants',
      url: 'https://www.youtube.com/watch?v=5V_u2hH1E2g',
      type: 'youtube',
    },
    {
      id: 'chant_thousands_of_suns',
      title: 'Thousands of Suns (Cosmic Chant)',
      subtitle: 'Swami Sri Yukteswar & Yogananda Devotional Chant',
      url: 'https://www.youtube.com/watch?v=P_V5q1K8m7A',
      type: 'youtube',
    },
    {
      id: 'chant_temple_of_silence',
      title: 'In the Temple of Silence',
      subtitle: 'I will sing Thy name in the secret soul sanctuary',
      url: 'https://www.youtube.com/watch?v=XWbBqM8tKk0',
      type: 'youtube',
    },
  ],
  world_prayer: [
    {
      id: 'wp_default_requested',
      title: 'Worldwide Prayer Circle (Healing & AUM at 3:15)',
      subtitle: 'Paramahansa Yogananda Worldwide Healing Prayer',
      url: 'https://www.youtube.com/watch?v=rl4ULW_OgtQ&t=195s',
      type: 'youtube',
    },
    {
      id: 'wp_srf_healing',
      title: 'SRF Worldwide Prayer Circle & AUM Chant',
      subtitle: 'Rub hands, broadcast cosmic healing energy with AUM',
      url: 'https://www.youtube.com/watch?v=hJ3K1qW4L7s',
      type: 'youtube',
    },
    {
      id: 'wp_cosmic_aum',
      title: 'Cosmic AUM World Healing Prayer',
      subtitle: 'Vibrating prana and light for all nations and souls',
      url: 'https://www.youtube.com/watch?v=8V_7q3L2k4E',
      type: 'youtube',
    },
  ],
  closing_prayer: [
    {
      id: 'cp_default_requested',
      title: 'SRF Closing Prayer & God Alone (Live at 2:54:06)',
      subtitle: 'Sacred closing prayer & divine surrender',
      url: 'https://www.youtube.com/live/JmVnhRu5huk?t=10446&si=lrZxdz4aFMgSrFHr',
      type: 'youtube',
    },
    {
      id: 'cp_god_alone',
      title: 'God Alone Devotional Closing Prayer',
      subtitle: '“God Alone, God Alone, all else passes away”',
      url: 'https://www.youtube.com/watch?v=M8q3_K1L7mY',
      type: 'youtube',
    },
    {
      id: 'cp_aum_shanti',
      title: 'Aum, Shanti, Peace, Amen',
      subtitle: 'Closing meditation surrender & blessing',
      url: 'https://www.youtube.com/watch?v=6v7L_q1M8pQ',
      type: 'youtube',
    },
  ],
};
