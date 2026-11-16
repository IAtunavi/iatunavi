import { createPersisted } from "./persisted";

export type PlayerStyle = "foco_lofi" | "synthwave" | "cyber_ambient" | "chuva_estudio";
export type PlayerState = { playing: boolean; style: PlayerStyle; volume: number; trackIndex: number };
export const playerStore = createPersisted<PlayerState>("hud-player", { playing: false, style: "cyber_ambient", volume: 35, trackIndex: 0 });

const styles: Record<PlayerStyle, { title: string; frequencies: [number, number, number] }> = {
  foco_lofi: { title: "Foco Lo-Fi", frequencies: [110, 164.81, 220] },
  synthwave: { title: "Synthwave", frequencies: [55, 110, 164.81] },
  cyber_ambient: { title: "Cyber Ambient", frequencies: [82.41, 123.47, 185] },
  chuva_estudio: { title: "Chuva no Estúdio", frequencies: [146.83, 220, 293.66] },
};
let context: AudioContext | null = null;
let master: GainNode | null = null;
let oscillators: OscillatorNode[] = [];

export function currentTrackTitle(state = playerStore.get()) {
  return styles[state.style].title;
}
function stopNodes() {
  oscillators.forEach((o) => { try { o.stop(); } catch { /* already stopped */ } });
  oscillators = [];
}
export function stopHudAudio() {
  stopNodes();
  master?.gain.setTargetAtTime(0, context?.currentTime ?? 0, 0.08);
  playerStore.set((p) => ({ ...p, playing: false }));
}
export async function startHudAudio(style?: PlayerStyle) {
  const nextStyle = style ?? playerStore.get().style;
  const AudioContextCtor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) throw new Error("Áudio Web não suportado neste navegador.");
  context ??= new AudioContextCtor();
  await context.resume();
  stopNodes();
  master ??= context.createGain();
  master.gain.setValueAtTime(0, context.currentTime);
  master.gain.setTargetAtTime(playerStore.get().volume / 100 * 0.12, context.currentTime, 0.5);
  master.connect(context.destination);
  const lowpass = context.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = nextStyle === "chuva_estudio" ? 420 : 900;
  lowpass.connect(master);
  styles[nextStyle].frequencies.forEach((frequency, index) => {
    const oscillator = context!.createOscillator();
    const gain = context!.createGain();
    oscillator.type = index === 0 ? "sine" : "triangle";
    oscillator.frequency.value = frequency;
    gain.gain.value = index === 0 ? 0.55 : 0.16;
    oscillator.connect(gain);
    gain.connect(lowpass);
    oscillator.start();
    oscillators.push(oscillator);
  });
  playerStore.set((p) => ({ ...p, style: nextStyle, playing: true }));
}
export function setHudVolume(volume: number) {
  const safe = Math.max(0, Math.min(100, volume));
  if (master && context) master.gain.setTargetAtTime(safe / 100 * 0.12, context.currentTime, 0.08);
  playerStore.set((p) => ({ ...p, volume: safe }));
}
export async function controlHudPlayer(input: { acao: "tocar" | "pausar" | "proxima" | "anterior" | "volume"; estilo?: PlayerStyle; volume?: number }) {
  if (input.volume !== undefined) setHudVolume(input.volume);
  if (input.estilo) {
    if (playerStore.get().playing) await startHudAudio(input.estilo);
    else playerStore.set((p) => ({ ...p, style: input.estilo! }));
  }
  if (input.acao === "pausar") stopHudAudio();
  if (input.acao === "tocar" || input.acao === "proxima" || input.acao === "anterior") {
    const order: PlayerStyle[] = ["foco_lofi","synthwave","cyber_ambient","chuva_estudio"];
    const idx = order.indexOf(playerStore.get().style);
    const style = input.estilo ?? (input.acao === "proxima" ? order[(idx + 1) % order.length] : input.acao === "anterior" ? order[(idx + order.length - 1) % order.length] : playerStore.get().style);
    await startHudAudio(style);
  }
}
