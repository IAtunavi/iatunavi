import { createPersisted, uid } from "./persisted";

export type Priority = "alta" | "media" | "baixa";
export type TaskStatus = "todo" | "doing" | "done";
export type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
  due?: string;
  projectId?: string;
  createdAt: number;
  example?: boolean;
};
export type ProjectStatus = "planejamento" | "andamento" | "pausado" | "concluido";
export type Project = {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  progress: number;
  createdAt: number;
  example?: boolean;
};
export type Activity = { id: string; text: string; at: number; example?: boolean };
export type MemoryKind = "fato" | "preferencia" | "contexto";
export type Memory = { id: string; kind: MemoryKind; text: string; createdAt: number; example?: boolean };
export type Report = { id: string; topic: string; content: string; createdAt: number; example?: boolean };
export type Draft = { id: string; kind: string; brief: string; content: string; createdAt: number };
export type Notice = { id: string; title: string; body: string; at: number; read: boolean };

function todayAt(h: number, m: number) {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

const now = Date.now();

export const tasksStore = createPersisted<Task[]>("tasks", [
  { id: "t1", title: "Revisar proposta Orbital", status: "done", priority: "alta", createdAt: now - 3000, example: true },
  { id: "t2", title: "Call com equipe Nébula, 22:30", status: "todo", priority: "media", createdAt: now - 2000, example: true },
  { id: "t3", title: "Enviar relatório semanal", status: "todo", priority: "baixa", createdAt: now - 1000, example: true },
]);

export const projectsStore = createPersisted<Project[]>("projects", [
  { id: "p1", name: "App Vértice", description: "Aplicativo de gestão para clientes (exemplo).", status: "andamento", progress: 72, createdAt: now - 2000, example: true },
  { id: "p2", name: "Estudo de mercado Q4", description: "Levantamento de tendências do trimestre (exemplo).", status: "andamento", progress: 41, createdAt: now - 1000, example: true },
]);

export const activitiesStore = createPersisted<Activity[]>("activities", [
  { id: "a1", text: "Agente Atlas resumiu 12 e-mails", at: todayAt(21, 12), example: true },
  { id: "a2", text: "Memória salva: preferências de viagem", at: todayAt(19, 40), example: true },
  { id: "a3", text: "Reunião movida para sexta", at: todayAt(18, 5), example: true },
]);

export const memoriesStore = createPersisted<Memory[]>("memories", [
  { id: "m1", kind: "preferencia", text: "Prefere voos pela manhã e assento no corredor.", createdAt: now - 5000, example: true },
  { id: "m2", kind: "fato", text: "Trabalha com produtos digitais.", createdAt: now - 4000, example: true },
]);

export const reportsStore = createPersisted<Report[]>("reports", [
  {
    id: "r1",
    topic: "Tendências de IA para pequenas empresas",
    createdAt: now - 86400000,
    example: true,
    content:
      "## Resumo (exemplo)\n\n- Assistentes virtuais no atendimento ganham espaço.\n- Automação de tarefas repetitivas reduz custos operacionais.\n- Conteúdo personalizado com IA melhora conversão.\n\n> Relatório demonstrativo. Gere um novo para obter uma análise real.",
  },
]);

export const draftsStore = createPersisted<Draft[]>("drafts", []);

export const noticesStore = createPersisted<Notice[]>("notices", [
  { id: "n1", title: "Bem-vindo à TUNAVI", body: "Explore os módulos no menu lateral e converse com a TUNAVI.", at: now, read: false },
  { id: "n2", title: "Integrações em desenvolvimento", body: "Agenda, e-mail e outras conexões chegam nas próximas etapas.", at: now - 1000, read: false },
]);

export type WidgetId = "relogio" | "foco" | "tarefas" | "projetos" | "notas" | "modulos" | "uso";
export type Prefs = {
  name: string;
  sound: boolean;
  reducedMotion: boolean;
  clock24: boolean;
  voiceRate: number;
  voicePitch: number;
  voiceName: string;
  autoSpeak: boolean;
  sendMemories: boolean;
  saveHistory: boolean;
  activeAgent: string | null;
  agentStatus: Record<string, boolean>;
  widgets: { id: WidgetId; enabled: boolean }[];
  focusNote: string;
  quickNotes: string;
  notifyIntegrations: string[];
  lastSyncAt: number | null;
};

export const prefsStore = createPersisted<Prefs>("prefs", {
  name: "",
  sound: true,
  reducedMotion: false,
  clock24: true,
  voiceRate: 1,
  voicePitch: 1,
  voiceName: "",
  autoSpeak: false,
  sendMemories: true,
  saveHistory: true,
  activeAgent: null,
  agentStatus: { atlas: true, nebula: true, orion: true, lyra: true, vega: false, sirius: true },
  widgets: [
    { id: "relogio", enabled: true },
    { id: "foco", enabled: true },
    { id: "tarefas", enabled: true },
    { id: "projetos", enabled: true },
    { id: "notas", enabled: true },
    { id: "modulos", enabled: false },
    { id: "uso", enabled: false },
  ],
  focusNote: "",
  quickNotes: "",
  notifyIntegrations: [],
  lastSyncAt: null,
});

export function logActivity(text: string) {
  activitiesStore.set((prev) => [{ id: uid(), text, at: Date.now() }, ...prev].slice(0, 50));
}

export function pushNotice(title: string, body: string) {
  noticesStore.set((prev) => [{ id: uid(), title, body, at: Date.now(), read: false }, ...prev].slice(0, 30));
}

export const ALL_STORES = {
  tasks: tasksStore,
  projects: projectsStore,
  activities: activitiesStore,
  memories: memoriesStore,
  reports: reportsStore,
  drafts: draftsStore,
  notices: noticesStore,
  prefs: prefsStore,
};

export function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
