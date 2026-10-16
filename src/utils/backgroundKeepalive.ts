/**
 * Background Keepalive & Screen Wake Lock Manager
 *
 * Keeps the meditation session running continuously even when:
 * 1. Mobile or PC screen reaches lock timeout / display sleep (via Screen Wake Lock API)
 * 2. Mobile browser background-throttles setInterval (via Timestamp-based delta time)
 * 3. Mobile OS locks screen (via HTML5 Audio Keepalive + MediaSession API)
 */

class BackgroundKeepaliveManager {
  private wakeLock: any | null = null;
  private keepaliveAudio: HTMLAudioElement | null = null;
  private isWakeLockRequested: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      // Re-request wake lock if tab regains focus/visibility
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.isWakeLockRequested) {
          this.requestWakeLock();
        }
      });
    }
  }

  /**
   * Request Screen Wake Lock to prevent PC and Mobile from dimming or locking screen
   */
  public async requestWakeLock(): Promise<boolean> {
    this.isWakeLockRequested = true;
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
        this.wakeLock.addEventListener('release', () => {
          this.wakeLock = null;
        });
        return true;
      } catch (err) {
        // Wake lock can fail if battery saver is on or permission denied
        return false;
      }
    }
    return false;
  }

  /**
   * Release Screen Wake Lock when session ends
   */
  public releaseWakeLock() {
    this.isWakeLockRequested = false;
    if (this.wakeLock) {
      try {
        this.wakeLock.release();
      } catch {}
      this.wakeLock = null;
    }
    this.stopAudioKeepalive();
  }

  /**
   * Starts a silent HTML5 audio loop to maintain background audio priority
   * on iOS Safari and Android Chrome when locked.
   */
  public startAudioKeepalive() {
    if (typeof window === 'undefined') return;

    if (!this.keepaliveAudio) {
      // Tiny silent WAV base64 data URI (1 frame of silence)
      const silentWav =
        'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAP8A';
      const audio = new Audio(silentWav);
      audio.loop = true;
      audio.volume = 0.01;
      this.keepaliveAudio = audio;
    }

    try {
      this.keepaliveAudio.play().catch(() => {});
    } catch {}
  }

  public stopAudioKeepalive() {
    if (this.keepaliveAudio) {
      try {
        this.keepaliveAudio.pause();
      } catch {}
    }
  }

  /**
   * Updates OS Lock Screen Media Controls (MediaSession API)
   */
  public updateMediaSession(
    title: string,
    subtitle: string,
    isPlaying: boolean,
    handlers?: {
      onPlay?: () => void;
      onPause?: () => void;
      onNext?: () => void;
      onPrev?: () => void;
    }
  ) {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist: 'Paramahansa Yogananda Kriya Yoga',
        album: subtitle || 'Meditation Session',
        artwork: [
          {
            src: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=512&q=80',
            sizes: '512x512',
            type: 'image/jpeg',
          },
        ],
      });

      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

      if (handlers?.onPlay) {
        navigator.mediaSession.setActionHandler('play', handlers.onPlay);
      }
      if (handlers?.onPause) {
        navigator.mediaSession.setActionHandler('pause', handlers.onPause);
      }
      if (handlers?.onNext) {
        navigator.mediaSession.setActionHandler('nexttrack', handlers.onNext);
      }
      if (handlers?.onPrev) {
        navigator.mediaSession.setActionHandler('previoustrack', handlers.onPrev);
      }
    } catch {}
  }
}

export const backgroundKeepalive = new BackgroundKeepaliveManager();
