import { useSyncExternalStore } from "react";

export type AssistantState = "repouso" | "ouvindo" | "processando" | "respondendo" | "executando";

export const ASSISTANT_STATES: { key: AssistantState; label: string; hint: string }[] = [
  { key: "repouso", label: "Repouso", hint: "Brilho suave e respiração lenta" },
  { key: "ouvindo", label: "Ouvindo", hint: "Ondas e pulsos luminosos" },
  { key: "processando", label: "Processando", hint: "Anéis orbitais e partículas" },
  { key: "respondendo", label: "Respondendo", hint: "Pulsação e espectrograma de voz" },
  { key: "executando", label: "Executando", hint: "Progresso e indicadores de atividade" },
];

/**
 * Live activity sources (chat, mic, voice, generation) take priority over the
 * manual demo state chosen in the state selector.
 */
type VoiceViseme = "rest" | "open" | "wide" | "round" | "closed" | "teeth";
type FaceExpression = "neutral" | "friendly" | "curious" | "serious";
type Snapshot = { manual: AssistantState | null; sources: Record<string, AssistantState>; mouthLevel: number; viseme: VoiceViseme; expression: FaceExpression };
let snap: Snapshot = { manual: null, sources: {}, mouthLevel: 0, viseme: "rest", expression: "neutral" };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

const PRIORITY: AssistantState[] = ["ouvindo", "respondendo", "processando", "executando"];

export function setManualState(state: AssistantState | null) {
  snap = { ...snap, manual: state };
  emit();
}

export function setVoiceMouthLevel(level: number) {
  const mouthLevel = Math.max(0, Math.min(1, level));
  if (Math.abs(snap.mouthLevel - mouthLevel) < 0.04) return;
  snap = { ...snap, mouthLevel };
  emit();
}

export function setVoiceViseme(viseme: VoiceViseme) {
  if (snap.viseme === viseme) return;
  snap = { ...snap, viseme };
  emit();
}

export function setFaceExpression(expression: FaceExpression) {
  if (snap.expression === expression) return;
  snap = { ...snap, expression };
  emit();
}

export function setActivity(source: string, state: AssistantState | null) {
  const sources = { ...snap.sources };
  if (state) sources[source] = state;
  else delete sources[source];
  if (sources[source] === snap.sources[source] && !!state === !!snap.sources[source]) return;
  snap = { ...snap, sources };
  emit();
}

export function resolveState(s: Snapshot): AssistantState {
  const active = Object.values(s.sources);
  for (const p of PRIORITY) if (active.includes(p)) return p;
  return s.manual ?? "repouso";
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

const serverSnap: Snapshot = { manual: null, sources: {}, mouthLevel: 0, viseme: "rest", expression: "neutral" };

export function useAssistantState() {
  const s = useSyncExternalStore(subscribe, () => snap, () => serverSnap);
  return { state: resolveState(s), manual: s.manual, live: Object.keys(s.sources).length > 0, mouthLevel: s.mouthLevel, viseme: s.viseme, expression: s.expression };
}

export const STATE_LABEL: Record<AssistantState, string> = {
  repouso: "Sincronizado",
  ouvindo: "Ouvindo",
  processando: "Processando",
  respondendo: "Respondendo",
  executando: "Executando",
};
