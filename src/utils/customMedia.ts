import { StageId } from '../types/meditation';

export interface StageMediaPreset {
  id: string;
  title: string;
  subtitle: string;
  url: string;
  type: 'youtube' | 'mp3';
  affirmationText?: string;
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
      title: 'Paramahansa Yogananda: In the Glory of the Spirit',
      subtitle: 'Original recorded voice and invocation prayer',
      url: 'https://www.youtube.com/watch?v=krd41uFL2s4',
      type: 'youtube',
    },
    {
      id: 'op_invocation_2',
      title: 'Guru Lineage Attunement & Meditation Prayer',
      subtitle: 'Devotional spoken prayer for deep attunement with the Great Ones',
      url: 'https://www.youtube.com/watch?v=Gu45m-enngI',
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
      url: 'https://www.youtube.com/watch?v=avn4ZTxSuyo',
      type: 'youtube',
    },
    {
      id: 'chant_o_god_beautiful',
      title: 'O God Beautiful (Cosmic Chant)',
      subtitle: 'In the forest, in the flowers, in the temple of stillness',
      url: 'https://www.youtube.com/watch?v=hc2x64QAmvo',
      type: 'youtube',
    },
    {
      id: 'chant_temple_of_silence',
      title: 'In the Temple of Silence',
      subtitle: 'SRF Guided Meditation & Devotional Chanting (Brother Chidananda)',
      url: 'https://www.youtube.com/watch?v=MJR06v8qakg',
      type: 'youtube',
    },
    {
      id: 'chant_aum_chanting',
      title: 'AUM (OM) Chanting by Paramahansa Yogananda',
      subtitle: 'Original recording of Master vibrating the sacred cosmic AUM',
      url: 'https://www.youtube.com/watch?v=eaLSahm6Ne8',
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
      title: 'Cosmic AUM World Healing Prayer (SRF)',
      subtitle: 'Vibrating prana and light for all souls and all nations',
      url: 'https://www.youtube.com/watch?v=kzncvlw781g',
      type: 'youtube',
    },
    {
      id: 'wp_global_peace',
      title: 'Global Healing Peace Chant & Affirmation',
      subtitle: 'Broadcasting peace and vitality into the cosmic ether',
      url: 'https://www.youtube.com/watch?v=hP4j5KbfGKY',
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
      subtitle: '“God Alone, God Alone, all else passes away” (Swami Kriyananda)',
      url: 'https://www.youtube.com/watch?v=GCBF_GjfybA',
      type: 'youtube',
    },
    {
      id: 'cp_aum_shanti',
      title: 'Aum, Shanti, Peace, Amen',
      subtitle: 'Closing meditation surrender & blessing vibration',
      url: 'https://www.youtube.com/watch?v=eaLSahm6Ne8',
      type: 'youtube',
    },
  ],
  affirmation: [
    {
      id: 'aff_healing_light',
      title: 'Scientific Healing Affirmation (Paramahansa Yogananda)',
      subtitle: '“I am submerged in Thy eternal light; it permeates every particle of my being.”',
      url: 'https://www.youtube.com/watch?v=PsbA8JFdO98',
      type: 'youtube',
      affirmationText:
        '“I am submerged in Thy eternal light; it permeates every particle of my being. I am alive in that light. The divine presence fills my body with peace, harmony, and perfect health.”',
    },
    {
      id: 'aff_divine_peace',
      title: 'Affirmation for Radiant Peace & Calmness',
      subtitle: '“God is within and around me, protecting me; so banish all fear.”',
      url: 'https://www.youtube.com/watch?v=krd41uFL2s4',
      type: 'youtube',
      affirmationText:
        '“God is within and around me, protecting me; so banish all fear, which comes from the unholy thought of God’s absence. The light of His presence is ever around me.”',
    },
    {
      id: 'aff_divine_will',
      title: 'Affirmation for Will Power & Spiritual Success',
      subtitle: '“Thy infinite power flows through me; I shall succeed in all noble duties.”',
      url: 'https://www.youtube.com/watch?v=rdc5khxI0Hw',
      type: 'youtube',
      affirmationText:
        '“Thy infinite power flows through me; I shall succeed in all noble duties. I will go forward with courage, faith, and patience. God’s grace is my eternal shield.”',
    },
    {
      id: 'aff_vitality',
      title: 'Affirmation for Youthfulness and Vitality',
      subtitle: 'Recharging body batteries with cosmic prana and divine joy',
      url: 'https://www.youtube.com/watch?v=ZXPdmWX8VB4',
      type: 'youtube',
      affirmationText:
        '“O Father, recharge my body cells with Thy cosmic prana; recharge my mind with Thy concentration; recharge my soul with Thine ever-new joy. Divine Joy, fill me!”',
    },
    {
      id: 'aff_wisdom',
      title: 'Affirmation for Intuition & Divine Guidance',
      subtitle: 'Attuning the inner eye to the voice of Omniscience',
      url: 'https://www.youtube.com/watch?v=Gu45m-enngI',
      type: 'youtube',
      affirmationText:
        '“Behind the wave of my consciousness is the infinite ocean of God’s wisdom. I claim my divine heritage of intuitive understanding and spiritual sight.”',
    },
  ],
  sacred_voices: [
    {
      id: 'sv_yogananda_loving_god',
      title: 'Paramahansa Yogananda: “Loving God”',
      subtitle: 'Original archival audio of Master speaking on love for the Divine Mother',
      url: 'https://www.youtube.com/watch?v=krd41uFL2s4',
      type: 'youtube',
      affirmationText:
        '“I will be Thine always. Through life and death, through sunshine and storm, my soul is anchored in Thee, my beloved Lord. Thou art my one and only Love.” — Paramahansa Yogananda',
    },
    {
      id: 'sv_yogananda_destroy_suffering',
      title: 'Paramahansa Yogananda: How to Destroy Suffering by Its Roots',
      subtitle: 'Original archival talk on overcoming all sorrow and finding lasting bliss',
      url: 'https://www.youtube.com/watch?v=rdc5khxI0Hw',
      type: 'youtube',
      affirmationText:
        '“In the temple of silence, in the secret bower of my soul, I lay my offering of pure devotion at Thy lotus feet. Speak to me, Lord, in the stillness.” — Paramahansa Yogananda',
    },
    {
      id: 'sv_yogananda_thinking_of_god',
      title: 'Paramahansa Yogananda: Thinking of Nothing But God',
      subtitle: 'Master’s sacred voice on continuous awareness of the Divine Presence',
      url: 'https://www.youtube.com/watch?v=ZXPdmWX8VB4',
      type: 'youtube',
      affirmationText:
        '“Keep your mind centered in God. He is the life of your life, the heartbeat of your heart, the soul of your soul.” — Paramahansa Yogananda',
    },
    {
      id: 'sv_yogananda_key_to_heaven',
      title: 'Paramahansa Yogananda: The Key to Heaven',
      subtitle: 'Rare recorded voice on perseverance and meditation at the Spiritual Eye',
      url: 'https://www.youtube.com/watch?v=Gu45m-enngI',
      type: 'youtube',
      affirmationText:
        '“Persevere in meditation until the divine light dawns within. You are a child of God, immortal and divine.” — Paramahansa Yogananda',
    },
    {
      id: 'sv_daya_mata_deepest_needs',
      title: 'Sri Daya Mata: Fulfilling the Soul’s Deepest Needs',
      subtitle: 'Spiritual address by SRF President Sri Daya Mata at World Convocation',
      url: 'https://www.youtube.com/watch?v=qZQFm856Coc',
      type: 'youtube',
      affirmationText:
        '“Find God first in the stillness of deep meditation, and then love Him in all human beings, serving Him in all life with joy and unconditional love.” — Sri Daya Mata',
    },
    {
      id: 'sv_daya_mata_peace_balance',
      title: 'Sri Daya Mata: Finding Divine Peace and Balance',
      subtitle: 'Spiritual discourse on bringing deep peace and spiritual poise into life',
      url: 'https://www.youtube.com/watch?v=QKD71YLHRuM',
      type: 'youtube',
      affirmationText:
        '“Hold on to the peace you feel in meditation. Take it into activity, and let nothing disturb the calm sanctuary of your soul.” — Sri Daya Mata',
    },
  ],
};

export const AFFIRMATION_PRESETS = STAGE_MEDIA_PRESETS.affirmation || [];
export const SACRED_VOICE_PRESETS = (STAGE_MEDIA_PRESETS as any).sacred_voices || [];
