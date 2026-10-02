/**
 * Web Audio API Sound Synthesizer & Procedural 90s Arcade BGM
 * No external audio files required - 100% standalone and deterministic.
 */

export class SoundController {
  private ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  
  private isMuted: boolean = false;
  private isMusicEnabled: boolean = true;
  private sfxVolume: number = 0.7;
  private musicVolume: number = 0.45;

  // BGM synthesizer state
  private bgmPlaying: boolean = false;
  private bgmIntervalId: number | null = null;
  private bgmStep: number = 0;
  private bgmTempo: number = 142; // energetic 90s shmup tempo
  private bossMode: boolean = false;

  constructor() {}

  public init(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
    this.musicGain.connect(this.masterGain);
  }

  public setVolumes(sfx: number, music: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, sfx));
    this.musicVolume = Math.max(0, Math.min(1, music));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(this.sfxVolume, this.ctx.currentTime, 0.05);
    }
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(this.musicVolume, this.ctx.currentTime, 0.05);
    }
  }

  public setMusicEnabled(enabled: boolean): void {
    this.isMusicEnabled = enabled;
    if (!enabled && this.bgmPlaying) {
      this.stopBgm();
    } else if (enabled && !this.bgmPlaying) {
      this.startBgm(this.bossMode);
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 1.0, this.ctx.currentTime, 0.05);
    }
  }

  // --- Sound Effects ---

  public playVulcanShoot(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const t = this.ctx.currentTime;
    
    // Punchy arcade bullet sound: fast pitched sawtooth + noise pop
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(680, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.07);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.07);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.07);
  }

  public playLaserHum(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Resonant futuristic plasma beam sound
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';

    const baseFreq = 540 + Math.random() * 80;
    osc1.frequency.setValueAtTime(baseFreq, t);
    osc1.frequency.linearRampToValueAtTime(baseFreq * 1.5, t + 0.06);

    osc2.frequency.setValueAtTime(baseFreq * 2, t);
    osc2.frequency.linearRampToValueAtTime(baseFreq * 3, t + 0.06);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.06);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.06);
    osc2.stop(t + 0.06);
  }

  public playMissileLaunch(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(540, t + 0.12);

    gain.gain.setValueAtTime(0.14, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  public playExplosion(type: 'small' | 'medium' | 'boss' | 'bomb' = 'small'): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const t = this.ctx.currentTime;

    const dur = type === 'boss' ? 1.6 : (type === 'bomb' ? 1.8 : (type === 'medium' ? 0.45 : 0.22));
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-3 * (i / bufferSize));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const initFreq = type === 'bomb' ? 350 : (type === 'boss' ? 500 : 900);
    filter.frequency.setValueAtTime(initFreq, t);
    filter.frequency.exponentialRampToValueAtTime(30, t + dur);

    const gain = this.ctx.createGain();
    const vol = type === 'bomb' ? 0.8 : (type === 'boss' ? 0.65 : 0.35);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(t);

    // If it's a bomb or boss, also add deep sub-bass drop
    if (type === 'bomb' || type === 'boss') {
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(140, t);
      subOsc.frequency.exponentialRampToValueAtTime(25, t + dur * 0.9);
      subGain.gain.setValueAtTime(0.5, t);
      subGain.gain.exponentialRampToValueAtTime(0.01, t + dur * 0.9);

      subOsc.connect(subGain);
      subGain.connect(this.sfxGain);
      subOsc.start(t);
      subOsc.stop(t + dur * 0.9);
    }
  }

  public playBombWhistle(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.3);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  public playItem(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.05);

      gain.gain.setValueAtTime(0.18, t + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, t + (idx + 1) * 0.05 + 0.08);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t + idx * 0.05);
      osc.stop(t + (idx + 1) * 0.05 + 0.08);
    });
  }

  public playMedal(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1174.66, t); // D6
    osc.frequency.setValueAtTime(1760.00, t + 0.06); // A6
    gain.gain.setValueAtTime(0.16, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.22);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  public playWarning(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const startT = t + i * 0.25;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, startT);
      osc.frequency.linearRampToValueAtTime(440, startT + 0.2);

      gain.gain.setValueAtTime(0.2, startT);
      gain.gain.exponentialRampToValueAtTime(0.01, startT + 0.2);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(startT);
      osc.stop(startT + 0.2);
    }
  }

  // --- Procedural Arcade Chiptune BGM ---

  public startBgm(isBoss: boolean = false): void {
    this.bossMode = isBoss;
    if (!this.isMusicEnabled || this.bgmPlaying) return;
    this.init();
    if (!this.ctx) return;

    this.bgmPlaying = true;
    this.bgmStep = 0;

    const intervalTime = (60 / this.bgmTempo) * 1000 / 4; // 16th notes
    this.bgmIntervalId = window.setInterval(() => {
      this.tickBgm();
    }, intervalTime);
  }

  public stopBgm(): void {
    this.bgmPlaying = false;
    if (this.bgmIntervalId !== null) {
      clearInterval(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }
  }

  public toggleBossBgm(isBoss: boolean): void {
    this.bossMode = isBoss;
    this.bgmTempo = isBoss ? 154 : 142;
    if (this.bgmPlaying) {
      this.stopBgm();
      this.startBgm(isBoss);
    }
  }

  private tickBgm(): void {
    if (!this.ctx || !this.musicGain || this.isMuted || !this.isMusicEnabled) return;
    const t = this.ctx.currentTime;
    const step = this.bgmStep % 32;

    // Normal Stage: Classic driving synth progression (Em - C - D - Bm)
    // Boss Stage: Tense industrial battle motif (F#m - D#dim - Gm)
    const stageBassNotes = [
      // Em
      82.41, 82.41, 164.81, 82.41,  82.41, 123.47, 82.41, 164.81,
      // C
      65.41, 65.41, 130.81, 65.41,  65.41, 98.00,  65.41, 130.81,
      // D
      73.42, 73.42, 146.83, 73.42,  73.42, 110.00, 73.42, 146.83,
      // Bm
      61.74, 61.74, 123.47, 61.74,  61.74, 92.50,  61.74, 123.47
    ];

    const bossBassNotes = [
      92.50, 92.50, 185.00, 92.50,  92.50, 110.00, 92.50, 146.83,
      98.00, 98.00, 196.00, 98.00,  98.00, 123.47, 98.00, 164.81,
      87.31, 87.31, 174.61, 87.31,  87.31, 116.54, 87.31, 155.56,
      92.50, 92.50, 185.00, 92.50,  123.47, 138.59, 146.83, 164.81
    ];

    const bassFreq = this.bossMode ? bossBassNotes[step] : stageBassNotes[step];

    // Bass Synth (Sawtooth + lowpass filter)
    const bassOsc = this.ctx.createOscillator();
    const bassFilter = this.ctx.createBiquadFilter();
    const bassGain = this.ctx.createGain();

    bassOsc.type = 'sawtooth';
    bassOsc.frequency.setValueAtTime(bassFreq, t);

    bassFilter.type = 'lowpass';
    bassFilter.frequency.setValueAtTime(450, t);
    bassFilter.Q.setValueAtTime(4, t);

    bassGain.gain.setValueAtTime(0.08, t);
    bassGain.gain.exponentialRampToValueAtTime(0.005, t + 0.1);

    bassOsc.connect(bassFilter);
    bassFilter.connect(bassGain);
    bassGain.connect(this.musicGain);

    bassOsc.start(t);
    bassOsc.stop(t + 0.1);

    // Percussion
    // Kick drum on 0, 4, 8, 12, 16, 20, 24, 28
    if (step % 4 === 0) {
      const kickOsc = this.ctx.createOscillator();
      const kickGain = this.ctx.createGain();
      kickOsc.frequency.setValueAtTime(140, t);
      kickOsc.frequency.exponentialRampToValueAtTime(35, t + 0.09);
      kickGain.gain.setValueAtTime(0.14, t);
      kickGain.gain.exponentialRampToValueAtTime(0.005, t + 0.09);
      kickOsc.connect(kickGain);
      kickGain.connect(this.musicGain);
      kickOsc.start(t);
      kickOsc.stop(t + 0.09);
    }

    // Snare / clap on steps 4, 12, 20, 28
    if (step % 8 === 4) {
      const snareNoise = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.08), this.ctx.sampleRate);
      const data = snareNoise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = snareNoise;
      const snareFilter = this.ctx.createBiquadFilter();
      snareFilter.type = 'highpass';
      snareFilter.frequency.setValueAtTime(1000, t);
      const snareGain = this.ctx.createGain();
      snareGain.gain.setValueAtTime(0.09, t);
      snareGain.gain.exponentialRampToValueAtTime(0.005, t + 0.08);
      noiseSource.connect(snareFilter);
      snareFilter.connect(snareGain);
      snareGain.connect(this.musicGain);
      noiseSource.start(t);
    }

    // Hi-hat on off-beats
    if (step % 2 === 1) {
      const hatNoise = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.03), this.ctx.sampleRate);
      const data = hatNoise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = hatNoise;
      const hatFilter = this.ctx.createBiquadFilter();
      hatFilter.type = 'highpass';
      hatFilter.frequency.setValueAtTime(6000, t);
      const hatGain = this.ctx.createGain();
      hatGain.gain.setValueAtTime(0.03, t);
      hatGain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
      noiseSource.connect(hatFilter);
      hatFilter.connect(hatGain);
      hatGain.connect(this.musicGain);
      noiseSource.start(t);
    }

    // Lead Arpeggio Melody (Classic Arcade FM style)
    const leadNotes = [
      329.63, 392.00, 493.88, 659.25, 493.88, 392.00, 329.63, 493.88,
      261.63, 329.63, 392.00, 523.25, 392.00, 329.63, 261.63, 392.00,
      293.66, 369.99, 440.00, 587.33, 440.00, 369.99, 293.66, 440.00,
      246.94, 293.66, 369.99, 493.88, 369.99, 293.66, 246.94, 369.99
    ];

    if (step % 2 === 0) {
      const leadOsc = this.ctx.createOscillator();
      const leadGain = this.ctx.createGain();
      leadOsc.type = 'square';
      leadOsc.frequency.setValueAtTime(leadNotes[step], t);
      leadGain.gain.setValueAtTime(0.025, t);
      leadGain.gain.exponentialRampToValueAtTime(0.002, t + 0.1);
      leadOsc.connect(leadGain);
      leadGain.connect(this.musicGain);
      leadOsc.start(t);
      leadOsc.stop(t + 0.1);
    }

    this.bgmStep++;
  }
}

export const sounds = new SoundController();
