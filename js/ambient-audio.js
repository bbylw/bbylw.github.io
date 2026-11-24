export class AmbientPulse {
  constructor() {
    this.ctx = null;
    this.analyser = null;
    this.masterGain = null;
    this.bins = null;
    this.active = false;
    this.nodes = [];
    this.lfoTimer = null;
  }

  async toggle() {
    if (!this.ctx) {
      this._init();
    }

    if (this.active) {
      this.active = false;
      this.masterGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.12);
      return false;
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    this.active = true;
    this.masterGain.gain.setTargetAtTime(0.11, this.ctx.currentTime, 0.18);
    return true;
  }

  isActive() {
    return this.active;
  }

  _init() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 64;
    this.analyser.smoothingTimeConstant = 0.82;
    this.bins = new Uint8Array(this.analyser.frequencyBinCount);

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.0001;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 480;
    filter.Q.value = 1.4;

    // Warm dark-ambient chord (F#2, C#3, A3) + slow LFO pulse
    const freqs = [92.5, 138.59, 220.0];
    freqs.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = i === 0 ? 'triangle' : 'sine';
      osc.frequency.value = freq;
      oscGain.gain.value = i === 0 ? 0.55 : 0.22;
      osc.connect(oscGain);
      oscGain.connect(filter);
      osc.start();
      this.nodes.push(osc);
    });

    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 0.45;
    lfoGain.gain.value = 160;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();
    this.nodes.push(lfo);

    filter.connect(this.analyser);
    this.analyser.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
  }

  sample() {
    if (!this.active || !this.analyser) return 0;
    this.analyser.getByteFrequencyData(this.bins);
    let sum = 0;
    for (let i = 0; i < this.bins.length; i += 1) {
      sum += this.bins[i];
    }
    return sum / (this.bins.length * 255);
  }

  getColumnBoost(nx) {
    if (!this.active || !this.bins) return 0;
    const idx = Math.min(this.bins.length - 1, Math.max(0, Math.floor(nx * (this.bins.length - 1))));
    return (this.bins[idx] / 255) * 0.35;
  }
}
