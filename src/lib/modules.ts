import {
  LayoutDashboard,
  MessagesSquare,
  Orbit,
  FolderKanban,
  ListChecks,
  Telescope,
  Wand2,
  Bot,
  BrainCircuit,
  AudioLines,
  Plug,
  MonitorSmartphone,
  ShieldCheck,
  Settings2,
  type LucideIcon,
} from "lucide-react";

export type ModuleKey =
  | "visao-geral"
  | "conversar"
  | "meu-espaco"
  | "projetos"
  | "tarefas"
  | "pesquisa"
  | "criador"
  | "agentes"
  | "memoria"
  | "voz"
  | "integracoes"
  | "desktop"
  | "seguranca"
  | "configuracoes";

export type ModuleDef = {
  key: ModuleKey;
  label: string;
  short: string;
  path: string;
  icon: LucideIcon;
  /** Core modules can't be switched off from the Super Painel. */
  core?: boolean;
  description: string;
};

export const MODULES: ModuleDef[] = [
  { key: "visao-geral", label: "Visão geral", short: "Visão geral", path: "/", icon: LayoutDashboard, core: true, description: "Painel principal com o holograma e seus resumos." },
  { key: "conversar", label: "Conversar com TUNAVI", short: "Conversar", path: "/conversar", icon: MessagesSquare, description: "Converse com a TUNAVI por texto ou voz." },
  { key: "meu-espaco", label: "Meu espaço", short: "Meu espaço", path: "/meu-espaco", icon: Orbit, description: "Seu painel pessoal com widgets." },
  { key: "projetos", label: "Projetos", short: "Projetos", path: "/projetos", icon: FolderKanban, description: "Acompanhe projetos e progresso." },
  { key: "tarefas", label: "Tarefas", short: "Tarefas", path: "/tarefas", icon: ListChecks, description: "Quadro de tarefas com prioridades." },
  { key: "pesquisa", label: "Pesquisa e inteligência", short: "Pesquisa", path: "/pesquisa", icon: Telescope, description: "Relatórios de mercado e tendências." },
  { key: "criador", label: "Criador", short: "Criador", path: "/criador", icon: Wand2, description: "Estúdio para gerar conteúdo e código." },
  { key: "agentes", label: "Agentes", short: "Agentes", path: "/agentes", icon: Bot, description: "Agentes especializados da TUNAVI." },
  { key: "memoria", label: "Memória", short: "Memória", path: "/memoria", icon: BrainCircuit, description: "Fatos, preferências e contexto salvos." },
  { key: "voz", label: "Voz", short: "Voz", path: "/voz", icon: AudioLines, description: "Teste de voz, entonação e microfone." },
  { key: "integracoes", label: "Integrações", short: "Integrações", path: "/integracoes", icon: Plug, description: "Conexões com outros serviços." },
  { key: "desktop", label: "TUNAVI Desktop", short: "Desktop", path: "/desktop", icon: MonitorSmartphone, description: "Sincronização e backup do seu espaço." },
  { key: "seguranca", label: "Segurança", short: "Segurança", path: "/seguranca", icon: ShieldCheck, description: "Privacidade, sessão e auditoria." },
  { key: "configuracoes", label: "Configurações", short: "Configurações", path: "/configuracoes", icon: Settings2, core: true, description: "Preferências do sistema." },
];

export function moduleByKey(key: ModuleKey) {
  return MODULES.find((m) => m.key === key)!;
}
