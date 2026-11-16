import { prefsStore } from "./data";

let ctx: AudioContext | null = null;

type Tone = "tap" | "send" | "receive" | "on" | "off" | "error";

const TONES: Record<Tone, { f: number[]; d: number; type: OscillatorType; g: number }> = {
  tap: { f: [880], d: 0.05, type: "sine", g: 0.03 },
  send: { f: [660, 990], d: 0.08, type: "sine", g: 0.04 },
  receive: { f: [990, 1320], d: 0.09, type: "triangle", g: 0.035 },
  on: { f: [520, 780, 1040], d: 0.07, type: "sine", g: 0.04 },
  off: { f: [780, 520], d: 0.07, type: "sine", g: 0.035 },
  error: { f: [300, 220], d: 0.12, type: "square", g: 0.02 },
};

/** Subtle futuristic UI blips; respects the header mute button. */
export function playSound(tone: Tone) {
  if (typeof window === "undefined" || !prefsStore.get().sound) return;
  try {
    ctx ??= new AudioContext();
    const t0 = ctx.currentTime;
    const spec = TONES[tone];
    spec.f.forEach((freq, i) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = spec.type;
      osc.frequency.value = freq;
      const start = t0 + i * spec.d * 0.8;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(spec.g, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + spec.d);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(start);
      osc.stop(start + spec.d + 0.02);
    });
  } catch {
    /* audio unavailable */
  }
}
