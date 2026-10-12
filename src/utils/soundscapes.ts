/**
 * Web Audio API procedural soundscape generator.
 * 100% offline, zero external audio asset dependencies.
 * Compatible with all browsers and GitHub Pages hosting.
 */

export type SoundscapeType =
  | 'om_drone'
  | 'singing_bowl'
  | 'tanpura'
  | 'sacred_stream'
  | 'water_flowing'
  | 'ocean'
  | 'waves'
  | 'fire'
  | 'temple_chimes'
  | 'theta_waves'
  | 'forest_sanctuary'
  | 'temple_rain'
  | 'silence';

export interface SoundscapeInfo {
  id: SoundscapeType;
  name: string;
  subtitle: string;
  description: string;
  icon: string;
}

export const SOUNDSCAPES: SoundscapeInfo[] = [
  {
    id: 'om_drone',
    name: 'Cosmic OM (136.1 Hz)',
    subtitle: 'Sacred Earth Frequency',
    description: 'Deep resonant 136.1 Hz cosmic vibration with warm overtone harmonics and gentle meditative pulsing.',
    icon: '🕉️',
  },
  {
    id: 'singing_bowl',
    name: 'Tibetan Singing Bowl',
    subtitle: 'Warm Harmonic Resonance',
    description: 'Authentic multi-harmonic singing bowl overtone drone with subtle acoustic beating.',
    icon: '🥣',
  },
  {
    id: 'tanpura',
    name: 'Sacred Tanpura',
    subtitle: 'Indian Classical Drone',
    description: 'Resonant acoustic Pa-Sa string drone providing an uplifting devotional foundation.',
    icon: '🪕',
  },
  {
    id: 'fire',
    name: 'Sacred Fire Altar',
    subtitle: 'Warm Crackling Embers',
    description: 'Calming crackling hearth fire with glowing wood embers, deep comforting flame warmth, and gentle pops.',
    icon: '🔥',
  },
  {
    id: 'water_flowing',
    name: 'Flowing Mountain Waters',
    subtitle: 'Gentle River Rapids',
    description: 'Refreshing water flowing gracefully over river pebbles with natural soothing bubbling ripples.',
    icon: '💧',
  },
  {
    id: 'ocean',
    name: 'Deep Ocean Sanctuary',
    subtitle: 'Vast Meditative Undertone',
    description: 'Expansive deep blue ocean resonance with slow tidal breathing, sub-bass calmness, and endless serenity.',
    icon: '🐋',
  },
  {
    id: 'waves',
    name: 'Shoreline Ocean Waves',
    subtitle: 'Rolling Surf & White Foam',
    description: 'Rhythmic ocean waves breaking softly against a tranquil sandy shore, followed by peaceful receding foam.',
    icon: '🌊',
  },
  {
    id: 'sacred_stream',
    name: 'Ganges Mountain Stream',
    subtitle: 'Gentle Flowing Water',
    description: 'Procedural mountain brook with soothing bubbling eddies and natural water frequencies.',
    icon: '🏞️',
  },
  {
    id: 'temple_chimes',
    name: 'Temple Wind Chimes',
    subtitle: 'Gentle Pentatonic Bells',
    description: 'Soft random breeze chimes tuned to tranquil ancient temple scales with lush acoustic decay.',
    icon: '🎐',
  },
  {
    id: 'theta_waves',
    name: 'Deep Theta Waves (6 Hz)',
    subtitle: 'Spiritual Eye & Deep Focus',
    description: 'Binaural carrier with 6 Hz theta pulse designed to encourage stillness and inner absorption.',
    icon: '✨',
  },
  {
    id: 'forest_sanctuary',
    name: 'Ashram Forest Sanctuary',
    subtitle: 'Breeze & Distant Nature',
    description: 'Peaceful rustling trees with warm dawn atmosphere and occasional tranquil flute harmonics.',
    icon: '🍃',
  },
  {
    id: 'temple_rain',
    name: 'Monastery Rain',
    subtitle: 'Soft Healing Raindrops',
    description: 'Gentle steady rain pattering softly on courtyard leaves, washing away inner restlessness.',
    icon: '🌧️',
  },
  {
    id: 'silence',
    name: 'Noble Silence + Bells',
    subtitle: 'Pure Stillness',
    description: 'Pure silence during meditation, with temple bells only at start, half-way, and finish.',
    icon: '🔔',
  },
];

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private soundGain: GainNode | null = null;
  private bellGain: GainNode | null = null;

  private currentSound: SoundscapeType = 'silence';
  private isPlaying: boolean = false;
  private volume: number = 0.65; // 0 to 1
  private isMuted: boolean = false;

  // Active procedural nodes to stop on switch
  private activeCleanup: (() => void)[] = [];
  private chimeTimer: number | null = null;
  private hasAttachedUnlock: boolean = false;

  constructor() {
    // Lazy AudioContext initialized on first user interaction
    if (typeof window !== 'undefined') {
      const unlock = () => {
        this.unlockAudio();
      };
      ['touchstart', 'touchend', 'click', 'keydown', 'pointerdown'].forEach((evt) => {
        window.addEventListener(evt, unlock, { once: true, capture: true, passive: true });
      });
    }
  }

  private initContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.soundGain = this.ctx.createGain();
      this.soundGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.soundGain.connect(this.masterGain);

      this.bellGain = this.ctx.createGain();
      this.bellGain.gain.setValueAtTime(0.45, this.ctx.currentTime); // Soft, subtle transition bell volume
      this.bellGain.connect(this.masterGain);
    }
    if (this.ctx.state === 'suspended' || (this.ctx.state as string) === 'interrupted') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Universal Mobile/iPad/Android/iOS & PC AudioContext unlocker.
   * Plays a 1-sample silent buffer on any initial touch/click to unlock Web Audio hardware & policies.
   */
  public unlockAudio() {
    try {
      const ctx = this.initContext();
      if (ctx.state === 'suspended' || (ctx.state as string) === 'interrupted') {
        ctx.resume().catch(() => {});
      }
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
    } catch {}
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.soundGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.soundGain.gain.cancelScheduledValues(now);
      this.soundGain.gain.setTargetAtTime(this.volume, now, 0.05);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public setBellVolume(vol: number) {
    if (this.bellGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.bellGain.gain.cancelScheduledValues(now);
      this.bellGain.gain.setTargetAtTime(Math.max(0, Math.min(1, vol)), now, 0.05);
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 1, now, 0.05);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public async playSoundscape(type: SoundscapeType) {
    this.currentSound = type;
    this.isPlaying = true;
    const ctx = this.initContext();
    if (ctx.state === 'suspended' || (ctx.state as string) === 'interrupted') {
      await ctx.resume().catch(() => {});
    }
    this.stopActiveSoundscape(false);

    if (type === 'silence') {
      return;
    }

    switch (type) {
      case 'om_drone':
        this.startOmDrone(ctx);
        break;
      case 'singing_bowl':
        this.startSingingBowlDrone(ctx);
        break;
      case 'tanpura':
        this.startTanpuraDrone(ctx);
        break;
      case 'sacred_stream':
        this.startStream(ctx);
        break;
      case 'water_flowing':
        this.startWaterFlowing(ctx);
        break;
      case 'ocean':
        this.startOcean(ctx);
        break;
      case 'waves':
        this.startWaves(ctx);
        break;
      case 'fire':
        this.startFire(ctx);
        break;
      case 'temple_chimes':
        this.startTempleChimes(ctx);
        break;
      case 'theta_waves':
        this.startThetaWaves(ctx);
        break;
      case 'forest_sanctuary':
        this.startForest(ctx);
        break;
      case 'temple_rain':
        this.startRain(ctx);
        break;
    }
  }

  public stopSoundscape() {
    this.isPlaying = false;
    this.stopActiveSoundscape(true);
  }

  private stopActiveSoundscape(fade: boolean) {
    if (this.chimeTimer) {
      window.clearInterval(this.chimeTimer);
      this.chimeTimer = null;
    }

    if (this.activeCleanup.length > 0) {
      const cleanups = [...this.activeCleanup];
      this.activeCleanup = [];
      cleanups.forEach((fn) => {
        try {
          fn();
        } catch {}
      });
    }
  }

  /**
   * Subtle, meditative Tibetan Temple Bell / Singing Bowl chime
   * Soft felt transient, warm harmonic overtones, gentle attack ramp,
   * designed to announce stage transitions gently without jarring the meditator.
   */
  public playTempleBell(strikeCount: 1 | 3 = 1) {
    const ctx = this.initContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;

    const strike = (delayTime: number, pitchMultiplier = 1.0) => {
      const t = now + delayTime;
      const baseFreq = 276 * pitchMultiplier; // Deep warm C#4/D4 Tibetan Singing Bowl fundamental

      // Subtle, warm harmonic partials (softened high frequencies for soothing tone)
      const partials = [
        { mult: 1.0, gain: 0.28, decay: 5.5 },
        { mult: 2.76, gain: 0.14, decay: 4.2 },
        { mult: 4.12, gain: 0.06, decay: 2.8 },
        { mult: 5.4, gain: 0.025, decay: 1.8 },
        { mult: 8.92, gain: 0.008, decay: 1.1 },
      ];

      partials.forEach(({ mult, gain: pGain, decay }) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();

        osc.type = 'sine';
        // Gentle micro-detuning for singing bowl beating
        osc.frequency.setValueAtTime(baseFreq * mult + (Math.random() * 0.4 - 0.2), t);

        g.gain.setValueAtTime(0.0001, t);
        // Smooth 35ms attack for subtle, non-abrupt entry
        g.gain.exponentialRampToValueAtTime(pGain * 0.7, t + 0.035);
        g.gain.exponentialRampToValueAtTime(0.00001, t + decay);

        osc.connect(g);
        if (this.bellGain) {
          g.connect(this.bellGain);
        } else if (this.masterGain) {
          g.connect(this.masterGain);
        }

        osc.start(t);
        osc.stop(t + decay + 0.1);
      });

      // Soft, cushioned felt mallet strike (warm and muted, non-jarring)
      const clickBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.035), ctx.sampleRate);
      const data = clickBuf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.008));
      }
      const clickSource = ctx.createBufferSource();
      clickSource.buffer = clickBuf;
      const clickFilter = ctx.createBiquadFilter();
      clickFilter.type = 'lowpass';
      clickFilter.frequency.setValueAtTime(700, t);
      const clickGain = ctx.createGain();
      clickGain.gain.setValueAtTime(0.045, t);
      clickGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
      clickSource.connect(clickFilter);
      clickFilter.connect(clickGain);
      if (this.bellGain) clickGain.connect(this.bellGain);
      clickSource.start(t);
    };

    if (strikeCount === 1) {
      strike(0);
    } else {
      strike(0, 0.98);
      strike(2.0, 1.0);
      strike(4.0, 1.02);
    }
  }

  /**
   * Tactile mala bead click sound
   */
  public playBeadClick() {
    const ctx = this.initContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.06);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);

    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.25, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

    osc.connect(filter);
    filter.connect(g);
    if (this.bellGain) g.connect(this.bellGain);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  /**
   * Subtle, resonant Tibetan Temple Gong & Singing Bowl transition cues for Inhale, Hold, and Exhale.
   * Soft, gentle harmonic transitions with cushioned felt transient and lookahead scheduling.
   */
  public playBreathCue(phase: 'inhale' | 'hold' | 'exhale') {
    const ctx = this.initContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // Schedule slightly into the future to guarantee thread stability and zero jitter
    const t = Math.max(ctx.currentTime, 0) + 0.025;

    // Harmonic sacred frequencies:
    // Inhale: 432 Hz (Sacred cosmic A4 tuning)
    // Hold: 528 Hz (Sacred Solfeggio golden pause)
    // Exhale: 288 Hz (Deep D4 grounding relaxation)
    const baseFreq = phase === 'inhale' ? 432.0 : phase === 'hold' ? 528.0 : 288.0;

    // Subtle singing bowl partial ratios & decay profile
    const partials = [
      { mult: 1.0, gain: 0.28, decay: 3.2 },
      { mult: 2.76, gain: 0.14, decay: 2.5 },
      { mult: 4.12, gain: 0.06, decay: 1.8 },
      { mult: 5.4, gain: 0.025, decay: 1.2 },
    ];

    partials.forEach(({ mult, gain: pGain, decay }) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();

      osc.type = 'sine';
      // Subtle micro-beating for organic singing bowl warmth
      osc.frequency.setValueAtTime(baseFreq * mult + (Math.random() * 0.4 - 0.2), t);

      g.gain.setValueAtTime(0.0001, t);
      // Gentle 30ms rise for subtle transition entry
      g.gain.exponentialRampToValueAtTime(pGain * 0.7, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.00001, t + decay);

      osc.connect(g);
      if (this.bellGain) {
        g.connect(this.bellGain);
      } else if (this.masterGain) {
        g.connect(this.masterGain);
      }

      osc.start(t);
      osc.stop(t + decay + 0.1);
    });

    // Padded soft felt mallet strike transient
    const clickLen = Math.floor(ctx.sampleRate * 0.03);
    const clickBuf = ctx.createBuffer(1, clickLen, ctx.sampleRate);
    const cData = clickBuf.getChannelData(0);
    for (let i = 0; i < clickLen; i++) {
      cData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.007));
    }
    const malletSource = ctx.createBufferSource();
    malletSource.buffer = clickBuf;

    const malletFilter = ctx.createBiquadFilter();
    malletFilter.type = 'lowpass';
    malletFilter.frequency.setValueAtTime(phase === 'hold' ? 850 : 650, t);

    const malletGain = ctx.createGain();
    malletGain.gain.setValueAtTime(0.045, t);
    malletGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);

    malletSource.connect(malletFilter);
    malletFilter.connect(malletGain);
    if (this.bellGain) malletGain.connect(this.bellGain);

    malletSource.start(t);
  }

  // --- PROCEDURAL GENERATORS ---

  private startOmDrone(ctx: AudioContext) {
    if (!this.soundGain) return;
    const now = ctx.currentTime;
    const root = 136.1; // C#3 OM Earth Year frequency

    const containerGain = ctx.createGain();
    containerGain.gain.setValueAtTime(0.001, now);
    containerGain.gain.linearRampToValueAtTime(0.6, now + 2.5);
    containerGain.connect(this.soundGain);

    const oscs: OscillatorNode[] = [];
    const harmonics = [
      { freq: root, gain: 0.45, type: 'sine' as const },
      { freq: root * 2, gain: 0.28, type: 'sine' as const },
      { freq: root * 3, gain: 0.16, type: 'sine' as const },
      { freq: root * 4, gain: 0.09, type: 'triangle' as const },
      { freq: root / 2, gain: 0.35, type: 'sine' as const }, // Deep 68Hz sub-base
    ];

    harmonics.forEach((h) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = h.type;
      osc.frequency.setValueAtTime(h.freq, now);

      // Subtle slow pitch drifting
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.setValueAtTime(0.12 + Math.random() * 0.08, now);
      lfoGain.gain.setValueAtTime(0.35, now);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(now);

      g.gain.setValueAtTime(h.gain, now);
      osc.connect(g);
      g.connect(containerGain);
      osc.start(now);

      oscs.push(osc, lfo);
    });

    this.activeCleanup.push(() => {
      const stopTime = ctx.currentTime + 1.5;
      containerGain.gain.cancelScheduledValues(ctx.currentTime);
      containerGain.gain.linearRampToValueAtTime(0.0001, stopTime);
      setTimeout(() => {
        oscs.forEach((o) => {
          try {
            o.stop();
            o.disconnect();
          } catch {}
        });
        containerGain.disconnect();
      }, 1600);
    });
  }

  private startSingingBowlDrone(ctx: AudioContext) {
    if (!this.soundGain) return;
    const now = ctx.currentTime;
    const containerGain = ctx.createGain();
    containerGain.gain.setValueAtTime(0.001, now);
    containerGain.gain.linearRampToValueAtTime(0.5, now + 2.0);
    containerGain.connect(this.soundGain);

    const base = 216; // A3 Singing Bowl
    const oscs: OscillatorNode[] = [];

    // Singing bowl partials with subtle acoustic beating
    const partials = [
      { f: base, beating: 0.4, vol: 0.35 },
      { f: base * 2.76, beating: 0.7, vol: 0.22 },
      { f: base * 5.4, beating: 1.1, vol: 0.12 },
    ];

    partials.forEach((p) => {
      [p.f - p.beating / 2, p.f + p.beating / 2].forEach((freq) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        g.gain.setValueAtTime(p.vol / 2, now);
        osc.connect(g);
        g.connect(containerGain);
        osc.start(now);
        oscs.push(osc);
      });
    });

    this.activeCleanup.push(() => {
      const stopTime = ctx.currentTime + 1.2;
      containerGain.gain.cancelScheduledValues(ctx.currentTime);
      containerGain.gain.linearRampToValueAtTime(0.0001, stopTime);
      setTimeout(() => {
        oscs.forEach((o) => {
          try {
            o.stop();
            o.disconnect();
          } catch {}
        });
        containerGain.disconnect();
      }, 1300);
    });
  }

  private startTanpuraDrone(ctx: AudioContext) {
    if (!this.soundGain) return;
    const now = ctx.currentTime;
    const containerGain = ctx.createGain();
    containerGain.gain.setValueAtTime(0.001, now);
    containerGain.gain.linearRampToValueAtTime(0.55, now + 2.0);
    containerGain.connect(this.soundGain);

    // Standard Indian classical Pa-Sa-Sa-Sa tuning (e.g. C# tuning)
    const sa = 138.6; // C#3
    const pa = 207.65; // G#3 (Fifth)
    const saHigh = 277.2; // C#4
    const saLow = 69.3; // C#2

    const strings = [pa, saHigh, saHigh, saLow];
    const oscs: OscillatorNode[] = [];

    strings.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = idx === 3 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(f, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, now);
      filter.Q.setValueAtTime(2.5, now);

      // Subtle envelope rhythmic strumming
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.setValueAtTime(0.25 + idx * 0.05, now);
      lfoGain.gain.setValueAtTime(0.08, now);
      lfo.connect(lfoGain);

      g.gain.setValueAtTime(0.2, now);
      lfoGain.connect(g.gain);

      osc.connect(filter);
      filter.connect(g);
      g.connect(containerGain);

      osc.start(now);
      lfo.start(now);
      oscs.push(osc, lfo);
    });

    this.activeCleanup.push(() => {
      const stopTime = ctx.currentTime + 1.2;
      containerGain.gain.cancelScheduledValues(ctx.currentTime);
      containerGain.gain.linearRampToValueAtTime(0.0001, stopTime);
      setTimeout(() => {
        oscs.forEach((o) => {
          try {
            o.stop();
            o.disconnect();
          } catch {}
        });
        containerGain.disconnect();
      }, 1300);
    });
  }

  private startStream(ctx: AudioContext) {
    if (!this.soundGain) return;
    const now = ctx.currentTime;
    const containerGain = ctx.createGain();
    containerGain.gain.setValueAtTime(0.001, now);
    containerGain.gain.linearRampToValueAtTime(0.45, now + 2.0);
    containerGain.connect(this.soundGain);

    // Procedural pink noise filtered with multi-bandpass filters
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.1;
      b6 = white * 0.115926;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter1 = ctx.createBiquadFilter();
    filter1.type = 'lowpass';
    filter1.frequency.setValueAtTime(650, now);

    const filter2 = ctx.createBiquadFilter();
    filter2.type = 'bandpass';
    filter2.frequency.setValueAtTime(380, now);
    filter2.Q.setValueAtTime(1.5, now);

    // Water bubbling LFO
    const bubbleLfo = ctx.createOscillator();
    const bubbleGain = ctx.createGain();
    bubbleLfo.frequency.setValueAtTime(0.6, now);
    bubbleGain.gain.setValueAtTime(150, now);
    bubbleLfo.connect(bubbleGain);
    bubbleGain.connect(filter2.frequency);

    whiteNoise.connect(filter1);
    filter1.connect(filter2);
    filter2.connect(containerGain);

    whiteNoise.start(now);
    bubbleLfo.start(now);

    this.activeCleanup.push(() => {
      const stopTime = ctx.currentTime + 1.2;
      containerGain.gain.cancelScheduledValues(ctx.currentTime);
      containerGain.gain.linearRampToValueAtTime(0.0001, stopTime);
      setTimeout(() => {
        try {
          whiteNoise.stop();
          bubbleLfo.stop();
          whiteNoise.disconnect();
          containerGain.disconnect();
        } catch {}
      }, 1300);
    });
  }

  private startTempleChimes(ctx: AudioContext) {
    if (!this.soundGain) return;
    const containerGain = ctx.createGain();
    containerGain.gain.setValueAtTime(0.5, ctx.currentTime);
    containerGain.connect(this.soundGain);

    // Pentatonic scale frequencies (C# pentatonic)
    const notes = [554.37, 622.25, 739.99, 830.61, 987.77, 1108.73, 1244.51];

    const ringChime = () => {
      if (!this.isPlaying || !this.soundGain) return;
      const t = ctx.currentTime;
      const freq = notes[Math.floor(Math.random() * notes.length)];

      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.00001, t + 3.8);

      osc.connect(g);
      g.connect(containerGain);
      osc.start(t);
      osc.stop(t + 4.0);
    };

    // Initial chime
    ringChime();
    setTimeout(() => ringChime(), 1200);

    // Periodic random chimes
    this.chimeTimer = window.setInterval(() => {
      ringChime();
      if (Math.random() > 0.45) {
        setTimeout(ringChime, 300 + Math.random() * 800);
      }
    }, 2800);

    this.activeCleanup.push(() => {
      if (this.chimeTimer) clearInterval(this.chimeTimer);
      containerGain.disconnect();
    });
  }

  private startThetaWaves(ctx: AudioContext) {
    if (!this.soundGain) return;
    const now = ctx.currentTime;
    const containerGain = ctx.createGain();
    containerGain.gain.setValueAtTime(0.001, now);
    containerGain.gain.linearRampToValueAtTime(0.4, now + 2.0);
    containerGain.connect(this.soundGain);

    const carrier = 108; // Sacred 108Hz
    const thetaBeat = 6; // 6 Hz deep meditation

    const merger = ctx.createChannelMerger(2);

    const leftOsc = ctx.createOscillator();
    leftOsc.type = 'sine';
    leftOsc.frequency.setValueAtTime(carrier, now);

    const rightOsc = ctx.createOscillator();
    rightOsc.type = 'sine';
    rightOsc.frequency.setValueAtTime(carrier + thetaBeat, now);

    leftOsc.connect(merger, 0, 0);
    rightOsc.connect(merger, 0, 1);
    merger.connect(containerGain);

    leftOsc.start(now);
    rightOsc.start(now);

    this.activeCleanup.push(() => {
      const stopTime = ctx.currentTime + 1.2;
      containerGain.gain.cancelScheduledValues(ctx.currentTime);
      containerGain.gain.linearRampToValueAtTime(0.0001, stopTime);
      setTimeout(() => {
        try {
          leftOsc.stop();
          rightOsc.stop();
          leftOsc.disconnect();
          rightOsc.disconnect();
          containerGain.disconnect();
        } catch {}
      }, 1300);
    });
  }

  private startForest(ctx: AudioContext) {
    if (!this.soundGain) return;
    const now = ctx.currentTime;
    const containerGain = ctx.createGain();
    containerGain.gain.setValueAtTime(0.001, now);
    containerGain.gain.linearRampToValueAtTime(0.4, now + 2.0);
    containerGain.connect(this.soundGain);

    // Warm ambient filtered breeze
    const bufSize = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;

    const breeze = ctx.createBufferSource();
    breeze.buffer = buf;
    breeze.loop = true;

    const breezeFilter = ctx.createBiquadFilter();
    breezeFilter.type = 'lowpass';
    breezeFilter.frequency.setValueAtTime(450, now);

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.setValueAtTime(0.18, now);
    lfoGain.gain.setValueAtTime(120, now);
    lfo.connect(lfoGain);
    lfoGain.connect(breezeFilter.frequency);

    breeze.connect(breezeFilter);
    breezeFilter.connect(containerGain);

    breeze.start(now);
    lfo.start(now);

    // Distant peaceful flute tone interval
    const playFlute = () => {
      if (!this.isPlaying) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      const notes = [440, 523.25, 587.33, 659.25];
      osc.frequency.setValueAtTime(notes[Math.floor(Math.random() * notes.length)], t);

      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.08, t + 0.6);
      g.gain.linearRampToValueAtTime(0.00001, t + 3.2);

      osc.connect(g);
      g.connect(containerGain);
      osc.start(t);
      osc.stop(t + 3.3);
    };

    this.chimeTimer = window.setInterval(playFlute, 5000);

    this.activeCleanup.push(() => {
      if (this.chimeTimer) clearInterval(this.chimeTimer);
      const stopTime = ctx.currentTime + 1.0;
      containerGain.gain.cancelScheduledValues(ctx.currentTime);
      containerGain.gain.linearRampToValueAtTime(0.0001, stopTime);
      setTimeout(() => {
        try {
          breeze.stop();
          lfo.stop();
          containerGain.disconnect();
        } catch {}
      }, 1100);
    });
  }

  private startRain(ctx: AudioContext) {
    if (!this.soundGain) return;
    const now = ctx.currentTime;
    const containerGain = ctx.createGain();
    containerGain.gain.setValueAtTime(0.001, now);
    containerGain.gain.linearRampToValueAtTime(0.45, now + 2.0);
    containerGain.connect(this.soundGain);

    const bufSize = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;

    const rainSrc = ctx.createBufferSource();
    rainSrc.buffer = buf;
    rainSrc.loop = true;

    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'lowpass';
    rainFilter.frequency.setValueAtTime(1100, now);

    rainSrc.connect(rainFilter);
    rainFilter.connect(containerGain);
    rainSrc.start(now);

    this.activeCleanup.push(() => {
      const stopTime = ctx.currentTime + 1.0;
      containerGain.gain.cancelScheduledValues(ctx.currentTime);
      containerGain.gain.linearRampToValueAtTime(0.0001, stopTime);
      setTimeout(() => {
        try {
          rainSrc.stop();
          rainSrc.disconnect();
          containerGain.disconnect();
        } catch {}
      }, 1100);
    });
  }

  /**
   * Sacred Fire Altar:
   * Warm low convection flame roar + organic wood embers crackling and gentle popping.
   */
  private startFire(ctx: AudioContext) {
    if (!this.soundGain) return;
    const now = ctx.currentTime;
    const containerGain = ctx.createGain();
    containerGain.gain.setValueAtTime(0.001, now);
    containerGain.gain.linearRampToValueAtTime(0.5, now + 1.8);
    containerGain.connect(this.soundGain);

    // 1. Deep low-frequency flame body (convection roar)
    const bufSize = Math.min(ctx.sampleRate * 2, 96000);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.07;
      b1 = 0.985 * b1 + white * 0.15;
      b2 = 0.95 * b2 + white * 0.3;
      d[i] = (b0 + b1 + b2) * 0.22;
    }

    const flameNoise = ctx.createBufferSource();
    flameNoise.buffer = buf;
    flameNoise.loop = true;

    const flameFilter = ctx.createBiquadFilter();
    flameFilter.type = 'lowpass';
    flameFilter.frequency.setValueAtTime(240, now);

    // Subtle convection flicker LFO
    const flickerLfo = ctx.createOscillator();
    const flickerGain = ctx.createGain();
    flickerLfo.frequency.setValueAtTime(0.28, now);
    flickerGain.gain.setValueAtTime(45, now);
    flickerLfo.connect(flickerGain);
    flickerGain.connect(flameFilter.frequency);

    flameNoise.connect(flameFilter);
    flameFilter.connect(containerGain);

    flameNoise.start(now);
    flickerLfo.start(now);

    // 2. Realistic crackling embers & snapping wood pops
    const triggerCrackle = () => {
      if (!this.isPlaying) return;
      const t = ctx.currentTime;
      const count = Math.random() < 0.22 ? 2 : 1;
      for (let c = 0; c < count; c++) {
        const offset = c * (0.015 + Math.random() * 0.025);
        const popTime = t + offset;
        const popLen = Math.floor(ctx.sampleRate * (0.012 + Math.random() * 0.02));
        const popBuf = ctx.createBuffer(1, popLen, ctx.sampleRate);
        const pData = popBuf.getChannelData(0);
        for (let i = 0; i < popLen; i++) {
          pData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.0035));
        }

        const popSrc = ctx.createBufferSource();
        popSrc.buffer = popBuf;

        const popFilter = ctx.createBiquadFilter();
        popFilter.type = 'bandpass';
        // Wood resonant frequency between 1600Hz and 3400Hz
        popFilter.frequency.setValueAtTime(1600 + Math.random() * 1800, popTime);
        popFilter.Q.setValueAtTime(5.5 + Math.random() * 3.0, popTime);

        const popGain = ctx.createGain();
        const amp = 0.08 + Math.random() * 0.22;
        popGain.gain.setValueAtTime(amp, popTime);
        popGain.gain.exponentialRampToValueAtTime(0.0001, popTime + 0.025);

        popSrc.connect(popFilter);
        popFilter.connect(popGain);
        popGain.connect(containerGain);

        popSrc.start(popTime);
        popSrc.stop(popTime + 0.04);
      }
    };

    // Staggered crackle timer
    const crackleInterval = window.setInterval(() => {
      if (Math.random() < 0.68) {
        triggerCrackle();
      }
    }, 110);

    this.activeCleanup.push(() => {
      clearInterval(crackleInterval);
      const stopTime = ctx.currentTime + 1.2;
      containerGain.gain.cancelScheduledValues(ctx.currentTime);
      containerGain.gain.linearRampToValueAtTime(0.0001, stopTime);
      setTimeout(() => {
        try {
          flameNoise.stop();
          flickerLfo.stop();
          flameNoise.disconnect();
          containerGain.disconnect();
        } catch {}
      }, 1300);
    });
  }

  /**
   * Flowing Mountain Waters:
   * Continuous crystal river stream with cascading water eddies and gentle droplet ripples.
   */
  private startWaterFlowing(ctx: AudioContext) {
    if (!this.soundGain) return;
    const now = ctx.currentTime;
    const containerGain = ctx.createGain();
    containerGain.gain.setValueAtTime(0.001, now);
    containerGain.gain.linearRampToValueAtTime(0.48, now + 2.0);
    containerGain.connect(this.soundGain);

    const bufSize = Math.min(ctx.sampleRate * 2.5, 120000);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0;
    for (let i = 0; i < bufSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.998 * b0 + white * 0.055;
      b1 = 0.99 * b1 + white * 0.075;
      b2 = 0.96 * b2 + white * 0.16;
      b3 = 0.86 * b3 + white * 0.32;
      d[i] = (b0 + b1 + b2 + b3) * 0.12;
    }

    const waterNoise = ctx.createBufferSource();
    waterNoise.buffer = buf;
    waterNoise.loop = true;

    // Dual resonant bandpass layers for active flowing river dynamics
    const lowStreamFilter = ctx.createBiquadFilter();
    lowStreamFilter.type = 'lowpass';
    lowStreamFilter.frequency.setValueAtTime(520, now);

    const rippleFilter = ctx.createBiquadFilter();
    rippleFilter.type = 'bandpass';
    rippleFilter.frequency.setValueAtTime(820, now);
    rippleFilter.Q.setValueAtTime(2.2, now);

    const rippleLfo = ctx.createOscillator();
    const rippleGain = ctx.createGain();
    rippleLfo.frequency.setValueAtTime(0.65, now);
    rippleGain.gain.setValueAtTime(180, now);
    rippleLfo.connect(rippleGain);
    rippleGain.connect(rippleFilter.frequency);

    waterNoise.connect(lowStreamFilter);
    waterNoise.connect(rippleFilter);
    lowStreamFilter.connect(containerGain);
    rippleFilter.connect(containerGain);

    waterNoise.start(now);
    rippleLfo.start(now);

    // Natural fluid water drop trickle
    const playWaterDrop = () => {
      if (!this.isPlaying) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      const startF = 720 + Math.random() * 320;
      osc.frequency.setValueAtTime(startF, t);
      osc.frequency.exponentialRampToValueAtTime(startF + 160, t + 0.04);

      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.06, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.00001, t + 0.065);

      osc.connect(g);
      g.connect(containerGain);
      osc.start(t);
      osc.stop(t + 0.08);
    };

    const dropTimer = window.setInterval(() => {
      if (Math.random() < 0.55) {
        playWaterDrop();
      }
    }, 750);

    this.activeCleanup.push(() => {
      clearInterval(dropTimer);
      const stopTime = ctx.currentTime + 1.2;
      containerGain.gain.cancelScheduledValues(ctx.currentTime);
      containerGain.gain.linearRampToValueAtTime(0.0001, stopTime);
      setTimeout(() => {
        try {
          waterNoise.stop();
          rippleLfo.stop();
          waterNoise.disconnect();
          containerGain.disconnect();
        } catch {}
      }, 1300);
    });
  }

  /**
   * Deep Ocean Sanctuary:
   * Vast low-frequency tidal surge, sub-bass calmness, and endless meditative swell.
   */
  private startOcean(ctx: AudioContext) {
    if (!this.soundGain) return;
    const now = ctx.currentTime;
    const containerGain = ctx.createGain();
    containerGain.gain.setValueAtTime(0.001, now);
    containerGain.gain.linearRampToValueAtTime(0.55, now + 2.5);
    containerGain.connect(this.soundGain);

    // 1. Sub-bass ocean grounding drone (55Hz A1 root)
    const subOsc = ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(55, now);
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.2, now);
    subOsc.connect(subGain);
    subGain.connect(containerGain);
    subOsc.start(now);

    // 2. Vast deep tidal swell noise
    const bufSize = Math.min(ctx.sampleRate * 3, 144000);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.08;
      b1 = 0.985 * b1 + white * 0.18;
      b2 = 0.95 * b2 + white * 0.35;
      d[i] = (b0 + b1 + b2) * 0.16;
    }

    const oceanNoise = ctx.createBufferSource();
    oceanNoise.buffer = buf;
    oceanNoise.loop = true;

    const oceanFilter = ctx.createBiquadFilter();
    oceanFilter.type = 'lowpass';
    oceanFilter.frequency.setValueAtTime(140, now);

    // Ultra-slow 11-second deep tidal breathing cycle
    const tideLfo = ctx.createOscillator();
    const tideGain = ctx.createGain();
    tideLfo.frequency.setValueAtTime(0.085, now); // ~11.7 sec cycle
    tideGain.gain.setValueAtTime(65, now);
    tideLfo.connect(tideGain);
    tideGain.connect(oceanFilter.frequency);

    oceanNoise.connect(oceanFilter);
    oceanFilter.connect(containerGain);

    oceanNoise.start(now);
    tideLfo.start(now);

    this.activeCleanup.push(() => {
      const stopTime = ctx.currentTime + 1.2;
      containerGain.gain.cancelScheduledValues(ctx.currentTime);
      containerGain.gain.linearRampToValueAtTime(0.0001, stopTime);
      setTimeout(() => {
        try {
          subOsc.stop();
          oceanNoise.stop();
          tideLfo.stop();
          oceanNoise.disconnect();
          containerGain.disconnect();
        } catch {}
      }, 1300);
    });
  }

  /**
   * Shoreline Ocean Waves:
   * Rhythmic ocean waves breaking softly onto sandy shores, rolling surf swell, and white foam wash.
   */
  private startWaves(ctx: AudioContext) {
    if (!this.soundGain) return;
    const now = ctx.currentTime;
    const containerGain = ctx.createGain();
    containerGain.gain.setValueAtTime(0.001, now);
    containerGain.gain.linearRampToValueAtTime(0.52, now + 2.0);
    containerGain.connect(this.soundGain);

    const bufSize = Math.min(ctx.sampleRate * 3, 144000);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.08;
      b1 = 0.985 * b1 + white * 0.16;
      b2 = 0.95 * b2 + white * 0.32;
      d[i] = (b0 + b1 + b2) * 0.18;
    }

    const waveNoise = ctx.createBufferSource();
    waveNoise.buffer = buf;
    waveNoise.loop = true;

    // Body of the wave (low-mid rolling surf)
    const surfFilter = ctx.createBiquadFilter();
    surfFilter.type = 'lowpass';
    surfFilter.frequency.setValueAtTime(280, now);

    // White foam spray when cresting & washing on shore
    const foamFilter = ctx.createBiquadFilter();
    foamFilter.type = 'bandpass';
    foamFilter.frequency.setValueAtTime(1400, now);
    foamFilter.Q.setValueAtTime(1.8, now);

    // Natural 8.5 second wave rhythm LFOs
    const surfLfo = ctx.createOscillator();
    const surfLfoGain = ctx.createGain();
    surfLfo.frequency.setValueAtTime(0.12, now); // ~8.3 second cycle
    surfLfoGain.gain.setValueAtTime(160, now);
    surfLfo.connect(surfLfoGain);
    surfLfoGain.connect(surfFilter.frequency);

    const foamLfo = ctx.createOscillator();
    const foamLfoGain = ctx.createGain();
    foamLfo.frequency.setValueAtTime(0.12, now);
    foamLfoGain.gain.setValueAtTime(600, now);
    foamLfo.connect(foamLfoGain);
    foamLfoGain.connect(foamFilter.frequency);

    // Foam gain node modulated to peak right at wave break
    const foamVolumeGain = ctx.createGain();
    foamVolumeGain.gain.setValueAtTime(0.22, now);

    waveNoise.connect(surfFilter);
    waveNoise.connect(foamFilter);
    surfFilter.connect(containerGain);
    foamFilter.connect(foamVolumeGain);
    foamVolumeGain.connect(containerGain);

    waveNoise.start(now);
    surfLfo.start(now);
    foamLfo.start(now);

    this.activeCleanup.push(() => {
      const stopTime = ctx.currentTime + 1.2;
      containerGain.gain.cancelScheduledValues(ctx.currentTime);
      containerGain.gain.linearRampToValueAtTime(0.0001, stopTime);
      setTimeout(() => {
        try {
          waveNoise.stop();
          surfLfo.stop();
          foamLfo.stop();
          waveNoise.disconnect();
          containerGain.disconnect();
        } catch {}
      }, 1300);
    });
  }
}

export const soundEngine = new SoundEngine();
