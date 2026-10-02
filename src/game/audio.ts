// ------------------------------------------------------------------
// Procedural Web Audio — engine synth, skid/boost noise, stingers,
// and a lightweight synthwave loop. Zero audio assets.
// ------------------------------------------------------------------

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfx: GainNode | null = null;
  private musicBus: GainNode | null = null;

  private engOsc1: OscillatorNode | null = null;
  private engOsc2: OscillatorNode | null = null;
  private engSub: OscillatorNode | null = null;
  private engFilter: BiquadFilterNode | null = null;
  private engGain: GainNode | null = null;

  private skidGain: GainNode | null = null;
  private boostGain: GainNode | null = null;
  private boostFilter: BiquadFilterNode | null = null;
  private draftGain: GainNode | null = null;
  private draftFilter: BiquadFilterNode | null = null;

  private noiseBuf: AudioBuffer | null = null;
  private muted = false;
  private musicOn = true;
  private musicTimer: number | null = null;
  private step = 0;

  private ready = false;
  private sfxVol = 0.8;
  private musicVol = 0.75;
  private engineVolMult = 0.85;

  /** must be called from a user gesture */
  ensure() {
    if (this.ready) {
      if (this.ctx && this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const AC: typeof AudioContext | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.master.connect(ctx.destination);

    this.sfx = ctx.createGain();
    this.sfx.gain.value = this.sfxVol;
    this.sfx.connect(this.master);

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = this.musicVol * 0.45;
    this.musicBus.connect(this.master);

    // white noise buffer
    const len = ctx.sampleRate * 1.2;
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    // --- engine voice: 2 detuned saws + sub through a lowpass ---
    this.engFilter = ctx.createBiquadFilter();
    this.engFilter.type = "lowpass";
    this.engFilter.frequency.value = 700;
    this.engFilter.Q.value = 2.2;
    this.engGain = ctx.createGain();
    this.engGain.gain.value = 0;
    this.engFilter.connect(this.engGain);
    this.engGain.connect(this.master);

    this.engOsc1 = ctx.createOscillator();
    this.engOsc1.type = "sawtooth";
    this.engOsc2 = ctx.createOscillator();
    this.engOsc2.type = "square";
    this.engSub = ctx.createOscillator();
    this.engSub.type = "sine";
    const g1 = ctx.createGain(); g1.gain.value = 0.5;
    const g2 = ctx.createGain(); g2.gain.value = 0.22;
    const g3 = ctx.createGain(); g3.gain.value = 0.55;
    this.engOsc1.connect(g1); g1.connect(this.engFilter);
    this.engOsc2.connect(g2); g2.connect(this.engFilter);
    this.engSub.connect(g3); g3.connect(this.engFilter);
    this.engOsc1.start(); this.engOsc2.start(); this.engSub.start();

    // --- skid voice: bandpassed noise ---
    const skidSrc = ctx.createBufferSource();
    skidSrc.buffer = this.noiseBuf;
    skidSrc.loop = true;
    const skidFilter = ctx.createBiquadFilter();
    skidFilter.type = "bandpass";
    skidFilter.frequency.value = 900;
    skidFilter.Q.value = 1.1;
    this.skidGain = ctx.createGain();
    this.skidGain.gain.value = 0;
    skidSrc.connect(skidFilter); skidFilter.connect(this.skidGain); this.skidGain.connect(this.master);
    skidSrc.start();

    // --- boost whoosh: lowpassed noise ---
    const boostSrc = ctx.createBufferSource();
    boostSrc.buffer = this.noiseBuf;
    boostSrc.loop = true;
    this.boostFilter = ctx.createBiquadFilter();
    this.boostFilter.type = "lowpass";
    this.boostFilter.frequency.value = 400;
    this.boostGain = ctx.createGain();
    this.boostGain.gain.value = 0;
    boostSrc.connect(this.boostFilter); this.boostFilter.connect(this.boostGain); this.boostGain.connect(this.master);
    boostSrc.start(Math.random());

    // --- draft slipstream whoosh: resonant bandpassed air vortex ---
    const draftSrc = ctx.createBufferSource();
    draftSrc.buffer = this.noiseBuf;
    draftSrc.loop = true;
    this.draftFilter = ctx.createBiquadFilter();
    this.draftFilter.type = "bandpass";
    this.draftFilter.frequency.value = 1600;
    this.draftFilter.Q.value = 3.2;
    this.draftGain = ctx.createGain();
    this.draftGain.gain.value = 0;
    draftSrc.connect(this.draftFilter); this.draftFilter.connect(this.draftGain); this.draftGain.connect(this.master);
    draftSrc.start(Math.random());

    this.ready = true;
    if (this.musicOn) this.startMusic();
  }

  setSfxVolume(pct: number) {
    this.sfxVol = Math.max(0, Math.min(1, pct / 100));
    if (this.sfx && this.ctx) {
      this.sfx.gain.setTargetAtTime(this.sfxVol, this.ctx.currentTime, 0.03);
    }
  }

  setMusicVolume(pct: number) {
    this.musicVol = Math.max(0, Math.min(1, pct / 100));
    if (this.musicBus && this.ctx) {
      this.musicBus.gain.setTargetAtTime(this.musicVol * 0.45, this.ctx.currentTime, 0.03);
    }
  }

  setEngineVolume(pct: number) {
    this.engineVolMult = Math.max(0, Math.min(1, pct / 100));
  }

  /** continuous per-frame state */
  setEngine(rpm: number, throttle: boolean, active: boolean) {
    if (!this.ctx || !this.engOsc1 || !this.engOsc2 || !this.engSub || !this.engFilter || !this.engGain) return;
    const t = this.ctx.currentTime;
    const f = 52 + rpm * 195 + (throttle ? 12 : 0);
    this.engOsc1.frequency.setTargetAtTime(f, t, 0.03);
    this.engOsc2.frequency.setTargetAtTime(f * 1.494, t, 0.03);
    this.engSub.frequency.setTargetAtTime(f * 0.5, t, 0.04);
    this.engFilter.frequency.setTargetAtTime(280 + rpm * 2600 + (throttle ? 900 : 0), t, 0.05);
    const vol = active ? (0.045 + rpm * 0.075 + (throttle ? 0.05 : 0)) * this.engineVolMult : 0;
    this.engGain.gain.setTargetAtTime(this.muted ? 0 : vol, t, 0.06);
  }

  setSkid(amount: number) {
    if (!this.ctx || !this.skidGain) return;
    this.skidGain.gain.setTargetAtTime(this.muted ? 0 : Math.min(0.16, amount * 0.16), this.ctx.currentTime, 0.05);
  }

  setBoost(amount: number) {
    if (!this.ctx || !this.boostGain || !this.boostFilter) return;
    const t = this.ctx.currentTime;
    this.boostGain.gain.setTargetAtTime(this.muted ? 0 : amount * 0.14, t, 0.05);
    this.boostFilter.frequency.setTargetAtTime(380 + amount * 1600, t, 0.06);
  }

  setDraft(amount: number) {
    if (!this.ctx || !this.draftGain || !this.draftFilter) return;
    const t = this.ctx.currentTime;
    this.draftGain.gain.setTargetAtTime(this.muted ? 0 : Math.min(0.2, amount * 0.2), t, 0.08);
    this.draftFilter.frequency.setTargetAtTime(1200 + amount * 1800, t, 0.08);
  }

  beep(freq: number, dur = 0.14, delay = 0) {
    if (!this.ctx || !this.sfx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    o.type = "square";
    o.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.12, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(this.sfx);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  thud(strength = 1) {
    if (!this.ctx || !this.sfx || !this.noiseBuf || this.muted) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 500 + strength * 400;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.4 * strength, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    src.connect(lp); lp.connect(g); g.connect(this.sfx);
    src.start(t);
    const o = this.ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.18);
    const og = this.ctx.createGain();
    og.gain.setValueAtTime(0.35 * strength, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
    o.connect(og); og.connect(this.sfx);
    o.start(t); o.stop(t + 0.3);
  }

  jingle(win: boolean) {
    const notes = win ? [523, 659, 784, 1047] : [392, 330, 262];
    notes.forEach((f, i) => this.beep(f, 0.22, i * 0.14));
  }

  cash(repeat = 1) {
    if (!this.ctx || !this.sfx || this.muted) return;
    const notes = [987.77, 1318.51, 1567.98];
    for (let r = 0; r < repeat; r++) {
      notes.forEach((f, i) => {
        this.beep(f, 0.08, r * 0.18 + i * 0.05);
      });
    }
  }

  upgrade() {
    if (!this.ctx || !this.sfx || this.muted) return;
    const t0 = this.ctx.currentTime;
    // Mechanical ratchet clicks + triumphant synth blip
    for (let i = 0; i < 3; i++) {
      const o = this.ctx.createOscillator();
      o.type = "triangle";
      o.frequency.setValueAtTime(320 + i * 160, t0 + i * 0.04);
      o.frequency.exponentialRampToValueAtTime(80, t0 + i * 0.04 + 0.03);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.18, t0 + i * 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + i * 0.04 + 0.03);
      o.connect(g);
      g.connect(this.sfx);
      o.start(t0 + i * 0.04);
      o.stop(t0 + i * 0.04 + 0.04);
    }
    this.beep(880, 0.18, 0.15);
  }

  revCar(carId: string) {
    if (!this.ctx || !this.sfx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const isV12 = carId.includes("furia");
    const isBoxer = carId.includes("falcon");
    const isCyber = carId.includes("spectre");
    const isMuscle = carId.includes("venom");

    if (isCyber) {
      // Futuristic EV hyperdrive whine sweep
      const osc = this.ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(180, t0);
      osc.frequency.exponentialRampToValueAtTime(1600, t0 + 0.35);
      osc.frequency.exponentialRampToValueAtTime(320, t0 + 0.7);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.001, t0);
      g.gain.linearRampToValueAtTime(0.24, t0 + 0.25);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.8);
      osc.connect(g);
      g.connect(this.sfx);
      osc.start(t0);
      osc.stop(t0 + 0.85);
    } else {
      // Internal combustion roar: V8, V12, Boxer, or Muscle
      const baseFreq = isV12 ? 95 : isMuscle ? 45 : isBoxer ? 62 : 68;
      const peakFreq = isV12 ? 380 : isMuscle ? 190 : isBoxer ? 240 : 280;

      const o1 = this.ctx.createOscillator();
      o1.type = "sawtooth";
      o1.frequency.setValueAtTime(baseFreq, t0);
      o1.frequency.exponentialRampToValueAtTime(peakFreq, t0 + 0.32);
      o1.frequency.exponentialRampToValueAtTime(baseFreq * 1.1, t0 + 0.75);

      const o2 = this.ctx.createOscillator();
      o2.type = isMuscle ? "square" : "sawtooth";
      o2.frequency.setValueAtTime(baseFreq * 1.5, t0);
      o2.frequency.exponentialRampToValueAtTime(peakFreq * 1.48, t0 + 0.32);
      o2.frequency.exponentialRampToValueAtTime(baseFreq * 1.4, t0 + 0.75);

      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(450, t0);
      filter.frequency.exponentialRampToValueAtTime(3200, t0 + 0.3);
      filter.frequency.exponentialRampToValueAtTime(600, t0 + 0.75);

      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.001, t0);
      g.gain.linearRampToValueAtTime(0.26, t0 + 0.1);
      g.gain.setValueAtTime(0.25, t0 + 0.35);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.8);

      o1.connect(filter);
      o2.connect(filter);
      filter.connect(g);
      g.connect(this.sfx);

      o1.start(t0);
      o2.start(t0);
      o1.stop(t0 + 0.85);
      o2.stop(t0 + 0.85);

      if (isBoxer || !isMuscle) {
        window.setTimeout(() => {
          this.thud(0.6);
        }, 340);
      }
    }
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.03);
  }

  get isMuted() { return this.muted; }

  setMusicOn(on: boolean) {
    this.musicOn = on;
    if (on) this.startMusic();
    else this.stopMusic();
  }

  private startMusic() {
    if (!this.ctx || this.musicTimer !== null) return;
    this.step = 0;
    this.musicTimer = window.setInterval(() => this.scheduleStep(), 92);
  }

  private stopMusic() {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  // 8th-note sequencer, 16 steps (2 bars of 4/4) @ ~104 bpm
  private scheduleStep() {
    const ctx = this.ctx;
    const bus = this.musicBus;
    if (!ctx || !bus || this.muted) { this.step = (this.step + 1) % 16; return; }
    const t = ctx.currentTime + 0.06;
    const s = this.step % 16;
    const stepDur = 60 / 104 / 2;

    // bass riff — A minor
    const bass = [55, 0, 55, 55, 65.4, 0, 55, 49, 43.65, 0, 43.65, 43.65, 49, 0, 82.4, 73.4][s];
    if (bass > 0) {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = bass;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 620;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.16, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + stepDur * 0.92);
      o.connect(lp); lp.connect(g); g.connect(bus);
      o.start(t); o.stop(t + stepDur);
    }
    // kick on beats
    if (s % 4 === 0) {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(44, t + 0.11);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
      o.connect(g); g.connect(bus);
      o.start(t); o.stop(t + 0.16);
    }
    // hats off-beat
    if (s % 2 === 1 && this.noiseBuf) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 7000;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.05, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
      src.connect(hp); hp.connect(g); g.connect(bus);
      src.start(t); src.stop(t + 0.06);
    }
    // pad on bar starts
    if (s === 0 || s === 8) {
      const chord = s === 0 ? [220, 261.6, 329.6] : [174.6, 220, 261.6];
      for (const f of chord) {
        const o = ctx.createOscillator();
        o.type = "triangle";
        o.frequency.value = f;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.028, t + stepDur * 2);
        g.gain.linearRampToValueAtTime(0.0001, t + stepDur * 8);
        o.connect(g); g.connect(bus);
        o.start(t); o.stop(t + stepDur * 8 + 0.05);
      }
    }
    this.step = (this.step + 1) % 16;
  }

  thunder() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    try {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(55, t);
      osc.frequency.exponentialRampToValueAtTime(24, t + 1.8);
      g.gain.setValueAtTime(0.38, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.9);
      osc.connect(g);
      g.connect(this.sfx!);
      osc.start(t);
      osc.stop(t + 1.9);

      if (this.noiseBuf) {
        const src = this.ctx.createBufferSource();
        const flt = this.ctx.createBiquadFilter();
        const ng = this.ctx.createGain();
        src.buffer = this.noiseBuf;
        flt.type = "lowpass";
        flt.frequency.setValueAtTime(360, t);
        flt.frequency.linearRampToValueAtTime(80, t + 1.6);
        ng.gain.setValueAtTime(0.42, t);
        ng.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
        src.connect(flt);
        flt.connect(ng);
        ng.connect(this.sfx!);
        src.start(t);
        src.stop(t + 1.8);
      }
    } catch {
      // ignore audio errors
    }
  }
}

// module-level singleton so it survives React StrictMode remounts
let singleton: AudioEngine | null = null;
export function getAudio(): AudioEngine {
  if (!singleton) singleton = new AudioEngine();
  return singleton;
}
