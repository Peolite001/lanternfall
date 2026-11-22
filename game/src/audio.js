// Every sound in Lanternfall is synthesised here with the Web Audio API: no files, no
// samples, nothing to load. A lantern hum for the table, a struck bell for a Keeper, and a
// deep swell when the Flame takes a hit.

let context = null;
let muted = false;

function audio() {
  if (muted) return null;
  if (!context) {
    const Ctor = window.AudioContext ?? window.webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
  }
  if (context.state === 'suspended') context.resume();
  return context;
}

export function setMuted(value) {
  muted = value;
}

export function isMuted() {
  return muted;
}

export function unlockAudio() {
  audio();
}

function tone({ freq = 220, type = 'sine', gain = 0.12, attack = 0.008, decay = 0.25, slide = 0, delay = 0 }) {
  const ctx = audio();
  if (!ctx) return;
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), start + decay);
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(gain, start + attack);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + decay);
  osc.connect(amp).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + decay + 0.05);
}

function noise({ decay = 0.18, gain = 0.16, delay = 0, filter = 1200 }) {
  const ctx = audio();
  if (!ctx) return;
  const start = ctx.currentTime + delay;
  const frames = Math.floor(ctx.sampleRate * decay);
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / frames) ** 2;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = filter;
  const amp = ctx.createGain();
  amp.gain.value = gain;
  source.connect(band).connect(amp).connect(ctx.destination);
  source.start(start);
}

export const sfx = {
  select() {
    tone({ freq: 520, type: 'triangle', gain: 0.05, decay: 0.09 });
  },
  deal() {
    noise({ decay: 0.11, gain: 0.06, filter: 2600 });
  },
  play(tide) {
    const base = { salt: 300, ember: 240, gale: 400, moss: 200 }[tide] ?? 280;
    tone({ freq: base, type: 'triangle', gain: 0.1, decay: 0.2, slide: 60 });
  },
  strike() {
    noise({ decay: 0.16, gain: 0.14, filter: 1500 });
    tone({ freq: 150, type: 'sawtooth', gain: 0.05, decay: 0.16, slide: -60 });
  },
  hurt() {
    tone({ freq: 90, type: 'sine', gain: 0.16, decay: 0.35, slide: -30 });
  },
  death() {
    tone({ freq: 180, type: 'square', gain: 0.06, decay: 0.3, slide: -120 });
    noise({ decay: 0.3, gain: 0.1, filter: 800 });
  },
  heal() {
    tone({ freq: 480, type: 'sine', gain: 0.08, decay: 0.3, slide: 220 });
    tone({ freq: 720, type: 'sine', gain: 0.05, decay: 0.35, slide: 160, delay: 0.06 });
  },
  tide() {
    for (const [index, freq] of [196, 294, 392].entries()) {
      tone({ freq, type: 'sine', gain: 0.07, decay: 0.7, delay: index * 0.12 });
    }
  },
  win() {
    for (const [index, freq] of [392, 494, 587, 784].entries()) {
      tone({ freq, type: 'triangle', gain: 0.1, decay: 0.6, delay: index * 0.13 });
    }
  },
  lose() {
    for (const [index, freq] of [330, 262, 196, 147].entries()) {
      tone({ freq, type: 'sine', gain: 0.1, decay: 0.55, delay: index * 0.16 });
    }
  },
};
