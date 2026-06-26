let audioCtx: AudioContext | null = null;

function isMuted(): boolean {
  if (typeof window === "undefined") return false;
  return getComputedStyle(document.documentElement).getPropertyValue("--sound-muted").trim() === "1";
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(frequency: number, duration: number, type: OscillatorType = "sine", volume = 0.3) {
  if (isMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function playNoise(duration: number, volume = 0.15) {
  if (isMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;

  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.5;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 2000;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}

export const sounds = {
  cardDeal() {
    // Realistic card slide + snap
    playNoise(0.06, 0.3);
    setTimeout(() => {
      playTone(2000, 0.02, "sine", 0.2);
      playNoise(0.03, 0.15);
    }, 40);
    setTimeout(() => playTone(1500, 0.03, "sine", 0.1), 70);
  },

  cardFlip() {
    // Quick snap sound
    playNoise(0.04, 0.35);
    playTone(1800, 0.05, "sine", 0.2);
  },

  bet() {
    // Poker chip clinking
    const chipFreqs = [3200, 3800, 4200];
    chipFreqs.forEach((freq, i) => {
      setTimeout(() => {
        playTone(freq, 0.06, "sine", 0.15);
        playTone(freq * 0.5, 0.08, "triangle", 0.1);
      }, i * 50);
    });
    // Stack sound
    setTimeout(() => playNoise(0.05, 0.12), 150);
  },

  pass() {
    // Soft card slide away
    playTone(600, 0.15, "sine", 0.1);
    setTimeout(() => playTone(400, 0.2, "sine", 0.08), 80);
    setTimeout(() => playNoise(0.04, 0.08), 50);
  },

  win() {
    // Winning fanfare
    const melody = [523, 659, 784, 1047, 784, 1047];
    melody.forEach((freq, i) => {
      setTimeout(() => {
        playTone(freq, 0.15, "sine", 0.2);
        playTone(freq * 0.5, 0.15, "triangle", 0.1);
      }, i * 100);
    });
  },

  lose() {
    // Sad descending tone
    playTone(400, 0.4, "sawtooth", 0.08);
    setTimeout(() => playTone(300, 0.4, "sawtooth", 0.06), 200);
    setTimeout(() => playTone(200, 0.5, "sawtooth", 0.05), 400);
  },

  turnStart() {
    // Attention ping
    playTone(1200, 0.08, "sine", 0.2);
    setTimeout(() => playTone(1500, 0.1, "sine", 0.15), 70);
  },

  chipCollect() {
    // Multiple chip sounds
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        playTone(2500 + Math.random() * 2000, 0.03, "sine", 0.08);
      }, i * 30);
    }
  },
};

// Background music - Western Saloon style
let bgmPlaying = false;
let bgmInterval: ReturnType<typeof setInterval> | null = null;

// Western saloon melody notes (pentatonic minor for that old west feel)
const saloonMelody = [
  330, 392, 440, 523, 440, 392, 330, 294,
  330, 392, 523, 587, 523, 440, 392, 330,
  294, 330, 392, 330, 294, 262, 294, 330,
  392, 440, 392, 330, 294, 330, 262, 294,
];

const saloonBass = [
  165, 196, 220, 196, 165, 147, 165, 196,
  220, 262, 220, 196, 165, 147, 131, 147,
];

let melodyIdx = 0;
let bassIdx = 0;

function playSaloonNote() {
  const ctx = getCtx();
  if (!ctx || !bgmPlaying) return;

  // Melody - piano-like sound
  const note = saloonMelody[melodyIdx % saloonMelody.length];
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.value = note;
  gain.gain.setValueAtTime(0.06, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.6);

  // Harmony note (third above, quieter)
  if (melodyIdx % 2 === 0) {
    const harmOsc = ctx.createOscillator();
    const harmGain = ctx.createGain();
    harmOsc.type = "sine";
    harmOsc.frequency.value = note * 1.25;
    harmGain.gain.setValueAtTime(0.025, ctx.currentTime);
    harmGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    harmOsc.connect(harmGain);
    harmGain.connect(ctx.destination);
    harmOsc.start(ctx.currentTime);
    harmOsc.stop(ctx.currentTime + 0.5);
  }

  // Bass - every beat
  const bassNote = saloonBass[bassIdx % saloonBass.length];
  const bassOsc = ctx.createOscillator();
  const bassGain = ctx.createGain();
  bassOsc.type = "sine";
  bassOsc.frequency.value = bassNote;
  bassGain.gain.setValueAtTime(0.05, ctx.currentTime);
  bassGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
  bassOsc.connect(bassGain);
  bassGain.connect(ctx.destination);
  bassOsc.start(ctx.currentTime);
  bassOsc.stop(ctx.currentTime + 0.8);

  // Rhythm - soft strum every 4 notes
  if (melodyIdx % 4 === 0) {
    playNoise(0.08, 0.03);
  }

  melodyIdx++;
  bassIdx++;
}

export const bgm = {
  start() {
    if (bgmPlaying) return;
    bgmPlaying = true;
    melodyIdx = 0;
    bassIdx = 0;
    bgmInterval = setInterval(playSaloonNote, 400);
    playSaloonNote();
  },

  stop() {
    bgmPlaying = false;
    if (bgmInterval) {
      clearInterval(bgmInterval);
      bgmInterval = null;
    }
  },

  isPlaying() {
    return bgmPlaying;
  },
};
