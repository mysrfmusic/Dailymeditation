import { StageId } from '../types/meditation';
import DEVOTIONAL_ALBUMS_DATA from '../data/devotional_albums.json';
import HARMONIES_AUDIO_DATA from '../data/harmonies_audio.json';

export interface StageMediaPreset {
  id: string;
  title: string;
  subtitle: string;
  url: string;
  type: 'youtube' | 'mp3' | 'other';
  affirmationText?: string;
  album?: string;
  albumId?: string;
  category?: string;
  speaker?: string;
  icon?: string;
  isAffirmation?: boolean;
}

export interface RawAlbumTrack {
  id: string;
  title: string;
  desc: string;
  icon?: string;
  url?: string;
  tags?: string[];
}

export interface RawAlbum {
  id: string;
  name: string;
  description: string;
  themeColor?: string;
  accentColor?: string;
  icon?: string;
  tracks: RawAlbumTrack[];
}

export interface RawHarmoniesTrack {
  id: string;
  title: string;
  url: string;
  speaker: string;
  tradition: string;
  category: string;
  description: string;
}

export interface RawHarmoniesCategory {
  name: string;
  icon: string;
  description: string;
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
 * Cleans and converts any YouTube URL (shortened youtu.be, mobile m.youtube, shorts, live, or URLs with tracking parameters like si=..., feature=..., etc.)
 * into a clean, canonical YouTube link: https://www.youtube.com/watch?v=VIDEO_ID (with &t=Xs preserved if present).
 */
export function cleanAndCanonicalizeYouTubeUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  const trimmed = rawUrl.trim();
  const videoId = extractYouTubeId(trimmed);
  if (!videoId) return trimmed;

  const startSec = extractYouTubeStartTime(trimmed);
  const timeParam = startSec && startSec > 0 ? `&t=${startSec}s` : '';
  return `https://www.youtube.com/watch?v=${videoId}${timeParam}`;
}

/**
 * Fetches the real YouTube video title and details using the public CORS-friendly oEmbed / noembed service.
 * Automatically cleans the YouTube link and returns the canonical URL + title.
 */
export async function fetchYouTubeVideoMetadata(rawUrl: string): Promise<{
  title?: string;
  author?: string;
  canonicalUrl: string;
  videoId: string | null;
}> {
  const videoId = extractYouTubeId(rawUrl);
  const canonicalUrl = cleanAndCanonicalizeYouTubeUrl(rawUrl);

  if (!videoId) {
    return { canonicalUrl: rawUrl.trim(), videoId: null };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    // noembed.com is a free, public, cross-origin oEmbed proxy supported by all modern browsers
    const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(canonicalUrl)}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (data && data.title) {
        return {
          title: data.title,
          author: data.author_name,
          canonicalUrl,
          videoId,
        };
      }
    }
  } catch {
    // If offline or network error, fallback gracefully
  }

  return {
    canonicalUrl,
    videoId,
  };
}

/**
 * Generates an embeddable YouTube URL with clean playback parameters and start offset.
 * Uses youtube-nocookie.com/embed with playsinline, origin verification, and avoids domain-restriction errors.
 */
export function getYouTubeEmbedUrl(
  url: string,
  autoplay: boolean = true,
  mute: boolean = false
): string | null {
  const videoId = extractYouTubeId(url);
  if (!videoId) return null;
  const autoParam = autoplay ? '1' : '0';
  const muteParam = mute ? '&mute=1' : '';
  const startSec = extractYouTubeStartTime(url);
  const startParam = startSec && startSec > 0 ? `&start=${startSec}` : '';
  const originParam =
    typeof window !== 'undefined' && window.location?.origin
      ? `&origin=${encodeURIComponent(window.location.origin)}`
      : '';
  return `https://www.youtube.com/embed/${videoId}?autoplay=${autoParam}${muteParam}&enablejsapi=1&rel=0&playsinline=1&modestbranding=1&iv_load_policy=3${startParam}${originParam}`;
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
 * Complete sacred collections sourced directly from:
 * 1) harmonies_audio.json (Paramahansa Yogananda & Swami Kriyananda High-Res MP3s & Discourses)
 * 2) devotional_albums.json (21 Devotional Albums with 253 YouTube tracks)
 */
export const DEVOTIONAL_ALBUMS: RawAlbum[] = DEVOTIONAL_ALBUMS_DATA as RawAlbum[];
export const HARMONIES_CATEGORIES: RawHarmoniesCategory[] = (HARMONIES_AUDIO_DATA as any).categories;
export const HARMONIES_TRACKS: RawHarmoniesTrack[] = (HARMONIES_AUDIO_DATA as any).tracks;

// Map album tracks into StageMediaPreset
export const DEVOTIONAL_ALBUM_PRESETS: StageMediaPreset[] = DEVOTIONAL_ALBUMS.flatMap((album) =>
  album.tracks.map((track) => {
    const rawUrl = track.url || `https://www.youtube.com/watch?v=${track.id}`;
    const cleanUrl = cleanAndCanonicalizeYouTubeUrl(rawUrl);
    const isAffirmation =
      album.id === 'samadhi' ||
      album.name.toLowerCase().includes('affirm') ||
      track.desc.toLowerCase().includes('poem') ||
      track.desc.toLowerCase().includes('affirm');

    return {
      id: `album_${album.id}_${track.id}`,
      title: track.title,
      subtitle: `${album.name} — ${track.desc}`,
      url: cleanUrl,
      type: detectMediaType(cleanUrl),
      album: album.name,
      albumId: album.id,
      category: album.name,
      icon: track.icon,
      isAffirmation,
      affirmationText:
        isAffirmation || (track.desc && track.desc.length > 20)
          ? `“${track.title}” — ${track.desc}`
          : undefined,
    };
  })
);

// Map Harmonies tracks into StageMediaPreset
export const HARMONIES_PRESETS: StageMediaPreset[] = HARMONIES_TRACKS.map((track) => {
  const isWisdom = track.category === 'Spiritual Wisdom Teachings';
  const mediaType = detectMediaType(track.url);

  return {
    id: `harmonies_${track.id}`,
    title: track.title,
    subtitle: `${track.category} · ${track.speaker}`,
    url: track.url,
    type: mediaType,
    album: track.category,
    albumId: track.category.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    category: track.category,
    speaker: track.speaker,
    isAffirmation: isWisdom,
    affirmationText: isWisdom
      ? `“${track.title}” — ${track.description}`
      : undefined,
  };
});

// All 324 tracks combined
export const ALL_SACRED_TRACKS: StageMediaPreset[] = [
  ...HARMONIES_PRESETS,
  ...DEVOTIONAL_ALBUM_PRESETS,
];

// All devotional songs and cosmic chants
export const ALL_DEVOTIONAL_SONGS: StageMediaPreset[] = ALL_SACRED_TRACKS.filter(
  (t) => !t.isAffirmation
);

// All affirmations and spiritual wisdom discourses
export const ALL_AFFIRMATION_PRESETS: StageMediaPreset[] = [
  // 1. Paramahansa Yogananda Spiritual Wisdom Discourses from Harmonies
  ...HARMONIES_PRESETS.filter((t) => t.isAffirmation),
  // 2. Samadhi and sacred poem recitations from Devotional Albums
  ...DEVOTIONAL_ALBUM_PRESETS.filter((t) => t.isAffirmation),
  // 3. Devotional chants with meaningful affirmation lyrics
  ...DEVOTIONAL_ALBUM_PRESETS.filter((t) => !t.isAffirmation && t.affirmationText),
];

// Original voice discourses of Paramahansa Yogananda
export const SACRED_VOICE_PRESETS: StageMediaPreset[] = ALL_SACRED_TRACKS.filter(
  (t) =>
    t.category === 'Spiritual Wisdom Teachings' ||
    t.speaker === 'Paramahansa Yogananda' ||
    t.title.toLowerCase().includes('yogananda')
);

/**
 * Curated presets mapped per stage ID from the new collections
 */
export const STAGE_MEDIA_PRESETS: Partial<Record<StageId, StageMediaPreset[]>> = {
  chant: [
    // Top beloved cosmic chants from Devotional Albums
    ...DEVOTIONAL_ALBUM_PRESETS.slice(0, 40),
    // High-res Harmonies MP3 chants
    ...HARMONIES_PRESETS.filter((t) => !t.isAffirmation),
  ],
  affirmation: ALL_AFFIRMATION_PRESETS,
  sacred_voices: SACRED_VOICE_PRESETS,
  opening_prayer: [
    {
      id: 'hymn_to_brahma_c4N3fCg8AR0',
      title: 'Hymn to Brahma',
      subtitle: 'Listen to My Soul Song — Sanskrit hymn celebrating cosmic creation & Guru Invocation',
      url: 'https://www.youtube.com/watch?v=c4N3fCg8AR0',
      type: 'youtube',
      album: 'Listen to My Soul Song',
    },
    ...ALL_SACRED_TRACKS.filter(
      (t) =>
        t.url !== 'https://www.youtube.com/watch?v=c4N3fCg8AR0' &&
        (t.title.toLowerCase().includes('brahma') ||
          t.title.toLowerCase().includes('guru') ||
          t.title.toLowerCase().includes('invocation') ||
          t.title.toLowerCase().includes('dawn') ||
          t.title.toLowerCase().includes('glory'))
    ),
    ...DEVOTIONAL_ALBUM_PRESETS.slice(0, 15),
  ],
  closing_prayer: [
    {
      id: 'srf_closing_prayer_god_alone_live',
      title: 'SRF Closing Prayer & God Alone',
      subtitle: 'Communion with God Alone, dedication of meditation fruits (Live at 2:54:06)',
      url: 'https://www.youtube.com/live/JmVnhRu5huk?t=10446&si=lrZxdz4aFMgSrFHr',
      type: 'youtube',
      album: 'Self-Realization Fellowship',
    },
    {
      id: 'hymn_to_brahma_closing',
      title: 'Hymn to Brahma',
      subtitle: 'Listen to My Soul Song — Sanskrit hymn celebrating cosmic creation',
      url: 'https://www.youtube.com/watch?v=c4N3fCg8AR0',
      type: 'youtube',
      album: 'Listen to My Soul Song',
    },
    ...ALL_SACRED_TRACKS.filter(
      (t) =>
        t.title.toLowerCase().includes('samadhi') ||
        t.title.toLowerCase().includes('shanti') ||
        t.title.toLowerCase().includes('peace') ||
        t.title.toLowerCase().includes('alone') ||
        t.title.toLowerCase().includes('feet') ||
        t.title.toLowerCase().includes('ocean of love')
    ),
    ...DEVOTIONAL_ALBUM_PRESETS.slice(15, 30),
  ],
  world_prayer: [
    ...ALL_SACRED_TRACKS.filter((t) =>
      t.title.toLowerCase().includes('healing') ||
      t.title.toLowerCase().includes('aum') ||
      t.title.toLowerCase().includes('om') ||
      t.title.toLowerCase().includes('light') ||
      t.title.toLowerCase().includes('shanti')
    ),
    ...DEVOTIONAL_ALBUM_PRESETS.slice(30, 45),
  ],
};

export const AFFIRMATION_PRESETS = ALL_AFFIRMATION_PRESETS;
