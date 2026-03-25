const getAudioContext = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.AudioContext || window.webkitAudioContext || null;
};

export class SoundController {
  constructor(enabled = true) {
    this.enabled = enabled;
    this.context = null;
    this.masterGain = null;
    this.AudioContextCtor = getAudioContext();
  }

  async prime() {
    if (!this.enabled || !this.AudioContextCtor) {
      return false;
    }

    if (!this.context) {
      this.context = new this.AudioContextCtor();
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = 0.18;
      this.masterGain.connect(this.context.destination);
    }

    if (this.context.state === "suspended") {
      await this.context.resume();
    }

    return true;
  }

  setEnabled(nextValue) {
    this.enabled = nextValue;
    return this.enabled;
  }

  playClick() {
    this.#playSequence([
      {
        frequency: 540,
        endFrequency: 640,
        duration: 0.08,
        volume: 0.05,
        type: "triangle",
      },
    ]);
  }

  playReset() {
    this.#playSequence([
      { frequency: 420, endFrequency: 300, duration: 0.12, volume: 0.06, type: "triangle", delay: 0 },
      { frequency: 280, endFrequency: 180, duration: 0.18, volume: 0.07, type: "sine", delay: 0.08 },
    ]);
  }

  playWin() {
    this.#playSequence([
      { frequency: 440, endFrequency: 520, duration: 0.12, volume: 0.06, type: "triangle", delay: 0 },
      { frequency: 660, endFrequency: 760, duration: 0.16, volume: 0.07, type: "sine", delay: 0.08 },
      { frequency: 880, endFrequency: 980, duration: 0.2, volume: 0.08, type: "sine", delay: 0.16 },
    ]);
  }

  playLose() {
    this.#playSequence([
      {
        frequency: 250,
        endFrequency: 120,
        duration: 0.28,
        volume: 0.08,
        type: "sawtooth",
      },
    ]);
  }

  playDraw() {
    this.#playSequence([
      { frequency: 330, endFrequency: 360, duration: 0.12, volume: 0.05, type: "triangle", delay: 0 },
      { frequency: 330, endFrequency: 300, duration: 0.14, volume: 0.05, type: "triangle", delay: 0.1 },
    ]);
  }

  #playSequence(steps) {
    if (!this.enabled || !this.context || !this.masterGain) {
      return;
    }

    const startTime = this.context.currentTime;
    steps.forEach((step) => this.#playTone({ ...step, startTime }));
  }

  #playTone({
    frequency,
    endFrequency = frequency,
    duration,
    volume,
    type,
    delay = 0,
  }) {
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const noteStart = this.context.currentTime + delay;
    const noteEnd = noteStart + duration;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, noteStart);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(endFrequency, 1), noteEnd);

    gain.gain.setValueAtTime(0.0001, noteStart);
    gain.gain.exponentialRampToValueAtTime(volume, noteStart + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);

    oscillator.connect(gain);
    gain.connect(this.masterGain);

    oscillator.start(noteStart);
    oscillator.stop(noteEnd + 0.03);
  }
}
