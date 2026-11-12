/* =========================================================
   SOUND — tiny synthesized soundtrack (no audio files needed)
   ========================================================= */

class SoundFX {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.enabled = true;
    this.noiseBuffer = null;
    this.windGain = null;
  }

  init() {
    if (this.ctx) {
      this.resume();
      return;
    }

    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) {
      this.enabled = false;
      return;
    }

    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      this.noiseBuffer = this._makeNoiseBuffer(2.2);
      this._startWind();
    } catch (err) {
      this.enabled = false;
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.linearRampToValueAtTime(muted ? 0 : 0.5, t + 0.15);
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  _makeNoiseBuffer(seconds) {
    const rate = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, Math.floor(rate * seconds), rate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = last * 0.72 + white * 0.28;
      data[i] = last;
    }
    return buffer;
  }

  _startWind() {
    if (!this.ctx) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 420;
    filter.Q.value = 0.4;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.022;

    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.09;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.008;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start();
    lfo.start();
    this.windGain = gain;
  }

  tone({ freq = 440, to = null, dur = 0.18, type = "sine", vol = 0.18, delay = 0, attack = 0.006 }) {
    if (!this.enabled || !this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), t0);
    if (to !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
    }
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  noise({ dur = 0.2, vol = 0.12, freq = 900, type = "lowpass", delay = 0, q = 0.8 }) {
    if (!this.enabled || !this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t0);
    filter.Q.value = q;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.03);
  }

  click() {
    this.tone({ freq: 620, to: 780, dur: 0.06, type: "triangle", vol: 0.08 });
  }

  jump() {
    this.tone({ freq: 250, to: 520, dur: 0.17, type: "sine", vol: 0.13 });
    this.noise({ dur: 0.12, vol: 0.045, freq: 1300, type: "highpass" });
  }

  land() {
    this.noise({ dur: 0.1, vol: 0.06, freq: 600, type: "lowpass" });
  }

  vault() {
    this.tone({ freq: 150, to: 880, dur: 0.3, type: "sawtooth", vol: 0.08 });
    this.tone({ freq: 300, to: 1200, dur: 0.24, type: "triangle", vol: 0.1, delay: 0.03 });
    this.noise({ dur: 0.22, vol: 0.08, freq: 1800, type: "highpass" });
  }

  collect(index = 0) {
    const base = 523.25 * Math.pow(2, (index % 4) / 12);
    const notes = [1, 1.25, 1.5, 2];
    notes.forEach((n, i) => {
      this.tone({
        freq: base * n,
        dur: 0.22,
        type: "triangle",
        vol: 0.13,
        delay: i * 0.055,
      });
    });
    this.tone({ freq: 2093, to: 2637, dur: 0.18, type: "sine", vol: 0.06, delay: 0.16 });
    this.noise({ dur: 0.3, vol: 0.03, freq: 5000, type: "highpass", delay: 0.04 });
  }

  miss() {
    this.tone({ freq: 420, to: 230, dur: 0.24, type: "triangle", vol: 0.1 });
    this.tone({ freq: 210, to: 150, dur: 0.2, type: "sine", vol: 0.06, delay: 0.08 });
  }

  hit() {
    this.tone({ freq: 130, to: 48, dur: 0.28, type: "square", vol: 0.15 });
    this.tone({ freq: 90, to: 40, dur: 0.32, type: "sine", vol: 0.18, delay: 0.02 });
    this.noise({ dur: 0.26, vol: 0.14, freq: 500, type: "lowpass" });
  }

  levelUp() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => {
      this.tone({ freq: f, dur: 0.26, type: "triangle", vol: 0.1, delay: i * 0.085 });
    });
    this.tone({ freq: 1318.5, dur: 0.5, type: "sine", vol: 0.07, delay: 0.34 });
  }

  gameOver() {
    const notes = [392, 329.63, 261.63, 196];
    notes.forEach((f, i) => {
      this.tone({ freq: f, dur: 0.42, type: "triangle", vol: 0.12, delay: i * 0.16 });
      this.tone({ freq: f / 2, dur: 0.5, type: "sine", vol: 0.06, delay: i * 0.16 });
    });
    this.noise({ dur: 0.8, vol: 0.03, freq: 300, type: "lowpass", delay: 0.2 });
  }

  victory() {
    const melody = [523.25, 659.25, 783.99, 1046.5, 987.77, 1046.5, 1318.5, 1567.98];
    melody.forEach((f, i) => {
      this.tone({ freq: f, dur: 0.36, type: "triangle", vol: 0.12, delay: i * 0.12 });
    });
    const bass = [130.81, 164.81, 196, 261.63];
    bass.forEach((f, i) => {
      this.tone({ freq: f, dur: 0.9, type: "sine", vol: 0.1, delay: i * 0.24 });
    });
    this.tone({ freq: 2093, dur: 1.2, type: "sine", vol: 0.05, delay: 0.9 });
    this.noise({ dur: 1.4, vol: 0.04, freq: 3000, type: "highpass", delay: 0.9 });
  }

  shenron() {
    this.tone({ freq: 55, to: 42, dur: 2.2, type: "sawtooth", vol: 0.05 });
    this.tone({ freq: 110, to: 82, dur: 2.4, type: "sine", vol: 0.06, delay: 0.1 });
    this.noise({ dur: 1.8, vol: 0.04, freq: 220, type: "lowpass", delay: 0.2 });
  }
}
