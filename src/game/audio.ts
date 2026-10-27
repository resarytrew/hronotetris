let ctx: AudioContext | null = null;
let muted = false;

export const setMuted = (m: boolean) => {
  muted = m;
};
export const isMuted = () => muted;

function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType = "square", vol = 0.06, delay = 0, slide = 0) {
  if (muted) return;
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.linearRampToValueAtTime(freq + slide, t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

export const sfx = {
  move: () => tone(330, 0.05, "square", 0.03),
  blocked: () => tone(120, 0.08, "sawtooth", 0.04),
  drop: () => tone(180, 0.12, "triangle", 0.08, 0, -90),
  correct: () => {
    tone(523, 0.12, "square", 0.05);
    tone(659, 0.12, "square", 0.05, 0.09);
    tone(784, 0.2, "square", 0.05, 0.18);
  },
  wrong: () => {
    tone(220, 0.25, "sawtooth", 0.06, 0, -120);
    tone(150, 0.3, "sawtooth", 0.06, 0.15, -80);
  },
  bonus: () => {
    [660, 880, 1100, 1320].forEach((f, i) => tone(f, 0.1, "triangle", 0.06, i * 0.06));
  },
  level: () => {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.16, "square", 0.05, i * 0.09));
  },
  over: () => {
    [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, "sawtooth", 0.06, i * 0.18));
  },
  start: () => {
    [262, 392, 523].forEach((f, i) => tone(f, 0.12, "square", 0.05, i * 0.08));
  },
};
