const audioCtx = typeof window !== "undefined" ? new (window.AudioContext || (window as any).webkitAudioContext)() : null;

function playTone(frequency: number, duration: number, type: OscillatorType = "sine", volume = 0.3) {
  if (!audioCtx) return;
  if (audioCtx.state === "suspended") audioCtx.resume();

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + duration);
}

function playNoise(duration: number, volume = 0.15) {
  if (!audioCtx) return;
  if (audioCtx.state === "suspended") audioCtx.resume();

  const bufferSize = audioCtx.sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.5;
  }

  const source = audioCtx.createBufferSource();
  source.buffer = buffer;

  const filter = audioCtx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 2000;

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  source.start();
}

export const sounds = {
  cardDeal() {
    playNoise(0.08, 0.2);
    setTimeout(() => playTone(800, 0.05, "sine", 0.1), 30);
  },

  cardFlip() {
    playNoise(0.06, 0.25);
    playTone(1200, 0.08, "sine", 0.15);
  },

  bet() {
    playTone(523, 0.1, "sine", 0.25);
    setTimeout(() => playTone(659, 0.1, "sine", 0.25), 80);
    setTimeout(() => playTone(784, 0.15, "sine", 0.2), 160);
  },

  pass() {
    playTone(400, 0.12, "triangle", 0.15);
    setTimeout(() => playTone(300, 0.15, "triangle", 0.1), 100);
  },

  win() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.2, "sine", 0.25), i * 120);
    });
  },

  lose() {
    playTone(300, 0.3, "sawtooth", 0.12);
    setTimeout(() => playTone(200, 0.4, "sawtooth", 0.1), 200);
  },

  turnStart() {
    playTone(880, 0.08, "sine", 0.2);
    setTimeout(() => playTone(1100, 0.1, "sine", 0.15), 60);
  },

  chipCollect() {
    for (let i = 0; i < 3; i++) {
      setTimeout(() => playTone(1500 + Math.random() * 500, 0.04, "sine", 0.1), i * 40);
    }
  },
};
