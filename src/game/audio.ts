// High-performance procedural Web Audio synthesizer for Nitro League
class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.8;

  // Active continuous sounds
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private boostNoise: AudioBufferSourceNode | null = null;
  private boostGain: GainNode | null = null;
  private isEngineRunning: boolean = false;
  private isBoostingPlaying: boolean = false;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.ctx) {
      if (this.engineGain) this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
      if (this.boostGain) this.boostGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  // Engine loop
  public updateEngine(speedRatio: number, isAccelerating: boolean) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    if (!this.isEngineRunning) {
      try {
        const osc = this.ctx.createOscillator();
        const subOsc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        subOsc.type = 'triangle';
        filter.type = 'lowpass';
        filter.frequency.value = 600;

        osc.connect(filter);
        subOsc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        gain.gain.setValueAtTime(0.04 * this.volume, this.ctx.currentTime);
        osc.start();
        subOsc.start();

        this.engineOsc = osc;
        this.engineGain = gain;
        this.isEngineRunning = true;
      } catch {
        // Audio error suppression
      }
    }

    if (this.engineOsc && this.engineGain) {
      const baseFreq = 55 + (speedRatio * 140) + (isAccelerating ? 25 : 0);
      this.engineOsc.frequency.setTargetAtTime(baseFreq, this.ctx.currentTime, 0.05);
      const targetGain = (0.03 + speedRatio * 0.05) * this.volume;
      this.engineGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
    }
  }

  // Boost whoosh loop
  public updateBoost(isBoosting: boolean) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    if (isBoosting && !this.isBoostingPlaying) {
      try {
        // Create noise buffer
        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = buffer;
        whiteNoise.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(950, this.ctx.currentTime);
        filter.Q.setValueAtTime(1.2, this.ctx.currentTime);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.01, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.18 * this.volume, this.ctx.currentTime + 0.1);

        whiteNoise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        whiteNoise.start();

        this.boostNoise = whiteNoise;
        this.boostGain = gain;
        this.isBoostingPlaying = true;
      } catch {
        // Audio error suppression
      }
    } else if (!isBoosting && this.isBoostingPlaying && this.boostGain) {
      try {
        this.boostGain.gain.setTargetAtTime(0.001, this.ctx.currentTime, 0.05);
        setTimeout(() => {
          if (!this.isBoostingPlaying && this.boostNoise) {
            try { this.boostNoise.stop(); } catch {}
            this.boostNoise = null;
          }
        }, 120);
        this.isBoostingPlaying = false;
      } catch {}
    }
  }

  // Jump sound (pneumatic pop)
  public playJump() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(480, this.ctx.currentTime + 0.14);

    gain.gain.setValueAtTime(0.25 * this.volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.19);
  }

  // Dodge / Flip sound (metallic boost jet)
  public playDodge() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140, this.ctx.currentTime + 0.22);

    gain.gain.setValueAtTime(0.3 * this.volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.24);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  // Ball Hit (punchy resonant impact)
  public playBallHit(speed: number = 20) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const intensity = Math.min(1.5, Math.max(0.4, speed / 25));
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(110 + intensity * 60, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(45, this.ctx.currentTime + 0.18);

    gain.gain.setValueAtTime(0.4 * intensity * this.volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.22);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.23);
  }

  // Drift Screech
  public playDrift() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800 + Math.random() * 200, this.ctx.currentTime);
    filter.type = 'bandpass';
    filter.frequency.value = 1200;

    gain.gain.setValueAtTime(0.06 * this.volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.005, this.ctx.currentTime + 0.1);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.11);
  }

  // Supersonic Boom
  public playSupersonic() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.35 * this.volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.36);
  }

  // Boost Pad Pickup
  public playBoostPickup(isBig: boolean) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    const startFreq = isBig ? 330 : 520;
    osc.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(startFreq * 2, this.ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.2 * this.volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  // Goal Explosion Boom & Stadium Horn
  public playGoalExplosion(isBasketball: boolean = false) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Sub-bass detonation
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(140, now);
    subOsc.frequency.exponentialRampToValueAtTime(25, now + 0.8);
    subGain.gain.setValueAtTime(0.8 * this.volume, now);
    subGain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 1.25);

    // Arena celebration horn or buzzer
    const hornOsc = this.ctx.createOscillator();
    const hornGain = this.ctx.createGain();
    hornOsc.type = 'sawtooth';
    hornOsc.frequency.setValueAtTime(isBasketball ? 220 : 185, now + 0.1);
    hornGain.gain.setValueAtTime(0.001, now);
    hornGain.gain.linearRampToValueAtTime(0.35 * this.volume, now + 0.15);
    hornGain.gain.setValueAtTime(0.35 * this.volume, now + 1.0);
    hornGain.gain.exponentialRampToValueAtTime(0.01, now + 1.6);
    hornOsc.connect(hornGain);
    hornGain.connect(this.ctx.destination);
    hornOsc.start(now + 0.1);
    hornOsc.stop(now + 1.65);
  }

  // Countdown Beep
  public playCountdownBeep(isFinal: boolean = false) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isFinal ? 880 : 440, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.25 * this.volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + (isFinal ? 0.4 : 0.2));

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + (isFinal ? 0.42 : 0.22));
  }

  public cleanup() {
    if (this.isEngineRunning && this.engineOsc) {
      try { this.engineOsc.stop(); } catch {}
      this.isEngineRunning = false;
    }
    if (this.isBoostingPlaying && this.boostNoise) {
      try { this.boostNoise.stop(); } catch {}
      this.isBoostingPlaying = false;
    }
  }
}

export const sound = new SoundEngine();
