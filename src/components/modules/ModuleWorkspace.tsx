import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Activity, ArrowRight, Bot, Check, CheckCircle2, Circle, Clock3,
  FileText, FolderPlus, Mic, Monitor, Plus, RefreshCw, Save,
  ShieldCheck, Sparkles, Trash2, Volume2, Wifi, WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { AGENTS } from "@/lib/agents";
import {
  activitiesStore, draftsStore, formatDate, memoriesStore, prefsStore,
  projectsStore, reportsStore, tasksStore, type MemoryKind, type Priority,
  type ProjectStatus, type TaskStatus,
} from "@/lib/data";
import { uid } from "@/lib/persisted";
import { playSound } from "@/lib/sound";
import { MODULES } from "@/lib/modules";
import { streamGenerate } from "@/lib/ai-context";
import { useAuth } from "@/lib/auth";
import { getPreferredMaleVoice } from "@/lib/voice";
import { MediaCreator } from "@/components/creator/MediaCreator";
import {
  CardTitle, EmptyState, fieldClass, GlassCard, PageContainer, PageHeader,
  pillButton, primaryButton,
} from "@/components/hud/primitives";

type Section =
  | "meu-espaco" | "projetos" | "tarefas" | "pesquisa" | "criador"
  | "agentes" | "memoria" | "voz" | "integracoes" | "desktop"
  | "seguranca" | "configuracoes";

const META: Record<Section, { title: string; description: string; key: string }> = {
  "meu-espaco": { title: "Meu espaço", description: "Seu centro pessoal de organização e foco.", key: "meu-espaco" },
  projetos: { title: "Projetos", description: "Organize iniciativas, acompanhe etapas e avance com clareza.", key: "projetos" },
  tarefas: { title: "Tarefas", description: "Transforme planos em ações e acompanhe suas prioridades.", key: "tarefas" },
  pesquisa: { title: "Pesquisa e inteligência", description: "Investigue temas e transforme perguntas em relatórios.", key: "pesquisa" },
  criador: { title: "Criador", description: "Um estúdio para escrever, planejar e desenvolver ideias.", key: "criador" },
  agentes: { title: "Agentes", description: "Especialistas que trabalham junto com a TUNAVI.", key: "agentes" },
  memoria: { title: "Memória", description: "Gerencie as informações que ajudam a contextualizar suas conversas.", key: "memoria" },
  voz: { title: "Voz", description: "Configure a experiência de fala e teste os recursos disponíveis.", key: "voz" },
  integracoes: { title: "Integrações", description: "Veja conexões disponíveis e acompanhe o estado de cada serviço.", key: "integracoes" },
  desktop: { title: "TUNAVI Desktop", description: "Acompanhe a preparação da experiência entre dispositivos.", key: "desktop" },
  seguranca: { title: "Segurança", description: "Gerencie sua sessão e conheça os controles de privacidade.", key: "seguranca" },
  configuracoes: { title: "Configurações", description: "Ajuste a experiência da TUNAVI ao seu jeito de trabalhar.", key: "configuracoes" },
};

function Metric({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return <div className="rounded-2xl bg-ink/35 p-4 ring-1 ring-lav/10"><p className="text-[11px] text-lav/45">{label}</p><p className="mt-1 font-mono text-2xl text-lav">{value}</p>{hint && <p className="mt-1 text-[10px] text-lav/40">{hint}</p>}</div>;
}

function Toggle({ label, checked, onChange, description }: { label: string; checked: boolean; onChange: (v: boolean) => void; description?: string }) {
  return <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl px-3 py-3 ring-1 ring-lav/10 hover:bg-lav/[0.03]"><span className="min-w-0"><span className="block text-[13px] text-lav/85">{label}</span>{description && <span className="mt-0.5 block text-[11px] text-lav/40">{description}</span>}</span><input type="checkbox" className="h-4 w-4 accent-violet-500" checked={checked} onChange={(e) => onChange(e.target.checked)} /></label>;
}

export function ModuleWorkspace({ section }: { section: Section }) {
  const meta = META[section];
  return <PageContainer><PageHeader title={meta.title} description={meta.description} /><ModuleBody section={section} /></PageContainer>;
}

function ModuleBody({ section }: { section: Section }) {
  switch (section) {
    case "tarefas": return <Tasks />;
    case "projetos": return <Projects />;
    case "meu-espaco": return <MySpace />;
    case "pesquisa": return <Generator mode="pesquisa" />;
    case "criador": return <MediaCreator />;
    case "agentes": return <Agents />;
    case "memoria": return <Memory />;
    case "voz": return <Voice />;
    case "integracoes": return <Integrations />;
    case "desktop": return <Desktop />;
    case "seguranca": return <Security />;
    case "configuracoes": return <Settings />;
  }
}

function Tasks() {
  const tasks = tasksStore.useValue();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("media");
  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");
  const [editingId,setEditingId]=useState<string|null>(null);
  const [editingTitle,setEditingTitle]=useState("");
  const visible = tasks.filter((t) => filter === "all" || (filter === "pending" ? t.status !== "done" : t.status === "done")).sort((a,b) => ({ alta:0, media:1, baixa:2 }[a.priority] - { alta:0, media:1, baixa:2 }[b.priority]));
  const add = () => {
    if (!title.trim()) return;
    tasksStore.set((p) => [{ id: uid(), title: title.trim(), status: "todo", priority, createdAt: Date.now() }, ...p]);
    playSound("tap");
    activitiesStore.set((p) => [{ id: uid(), text: "Tarefa criada: " + title.trim(), at: Date.now() }, ...p].slice(0,50));
    setTitle(""); toast.success("Tarefa adicionada.");
  };
  const cycle = (id: string, status: TaskStatus) => { tasksStore.set((p) => p.map((t) => t.id === id ? { ...t, status: status === "todo" ? "doing" : status === "doing" ? "done" : "todo" } : t)); playSound("tap"); };
  const saveEdit=()=>{if(!editingId||!editingTitle.trim())return;tasksStore.set(p=>p.map(t=>t.id===editingId?{...t,title:editingTitle.trim()}:t));setEditingId(null);setEditingTitle("");playSound("tap");toast.success("Tarefa atualizada.");};
  return <div className="grid gap-5 xl:grid-cols-[1.4fr_.8fr]">
    <GlassCard><CardTitle aside={`${tasks.filter(t=>t.status==="done").length}/${tasks.length} concluídas`}>Quadro de tarefas</CardTitle>
      <div className="mt-4 flex flex-wrap gap-2">{(["all","pending","done"] as const).map((f) => <button key={f} onClick={()=>setFilter(f)} className={`rounded-full px-3 py-1.5 text-[11px] ring-1 ${filter===f?"bg-vio/25 text-lav ring-vio/50":"text-lav/55 ring-lav/15"}`}>{({all:"Todas",pending:"Pendentes",done:"Concluídas"} as const)[f]}</button>)}</div>
      <div className="mt-4 space-y-2">{visible.map((t) => <div key={t.id} className="flex items-center gap-3 rounded-xl bg-ink/30 p-3 ring-1 ring-lav/10">
        <button aria-label="Alterar status" onClick={()=>cycle(t.id,t.status)} className="text-lav/65">{t.status==="done"?<CheckCircle2 className="h-5 w-5 text-emerald-300"/>:t.status==="doing"?<Activity className="h-5 w-5 text-vio"/>:<Circle className="h-5 w-5"/>}</button>
        <div className="min-w-0 flex-1">{editingId===t.id?<div className="flex gap-2"><input className={fieldClass} value={editingTitle} onChange={e=>setEditingTitle(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")saveEdit();}}/><button className={pillButton} onClick={saveEdit}>Salvar</button></div>:<button className={`text-left text-[13px] ${t.status==="done"?"text-lav/35 line-through":"text-lav/85"}`} onClick={()=>{setEditingId(t.id);setEditingTitle(t.title);}} title="Clique para editar">{t.title}</button>}</div>
        <span className="rounded-full bg-lav/5 px-2 py-1 text-[9px] uppercase text-lav/45">{t.priority}</span>
        <button aria-label="Excluir tarefa" onClick={()=>{tasksStore.set(p=>p.filter(x=>x.id!==t.id));playSound("off");}} className="text-lav/30 hover:text-red-300"><Trash2 className="h-4 w-4"/></button>
      </div>)}{visible.length===0&&<EmptyState title="Nenhuma tarefa neste filtro" description="Adicione uma tarefa ou selecione outra visualização."/>}</div>
    </GlassCard>
    <GlassCard><CardTitle>Nova tarefa</CardTitle><form className="mt-4 space-y-3" onSubmit={(e)=>{e.preventDefault();add();}}>
      <input className={fieldClass} value={title} onChange={e=>setTitle(e.target.value)} placeholder="O que precisa ser feito?" maxLength={120}/>
      <label className="block text-[11px] text-lav/50">Prioridade</label><select className={fieldClass} value={priority} onChange={e=>setPriority(e.target.value as Priority)}><option value="alta">Alta</option><option value="media">Média</option><option value="baixa">Baixa</option></select>
      <button className={primaryButton} type="submit"><Plus className="h-4 w-4"/> Adicionar tarefa</button>
    </form><div className="mt-6 grid grid-cols-3 gap-2"><Metric label="A fazer" value={tasks.filter(t=>t.status==="todo").length}/><Metric label="Andamento" value={tasks.filter(t=>t.status==="doing").length}/><Metric label="Feitas" value={tasks.filter(t=>t.status==="done").length}/></div></GlassCard>
  </div>;
}

function Projects() {
  const projects = projectsStore.useValue();
  const [name,setName] = useState(""); const [description,setDescription] = useState("");
  const add = () => { if(!name.trim()) return; projectsStore.set(p=>[{id:uid(),name:name.trim(),description:description.trim(),status:"planejamento",progress:0,createdAt:Date.now()},...p]); setName("");setDescription("");toast.success("Projeto criado."); };
  const advance = (id:string, status:ProjectStatus, progress:number) => projectsStore.set(p=>p.map(x=>x.id===id?{...x,status,progress}:x));
  return <div className="grid gap-5 xl:grid-cols-[1.4fr_.8fr]"><div className="grid gap-3 md:grid-cols-2">{projects.map(p=><GlassCard key={p.id}><div className="flex items-start justify-between gap-2"><div><h3 className="text-[15px] font-semibold text-lav">{p.name}</h3><p className="mt-1 text-[12px] text-lav/45">{p.description||"Sem descrição."}</p></div><span className="rounded-full bg-vio/15 px-2 py-1 text-[9px] text-lav/65">{p.status}</span></div><div className="mt-5 flex justify-between font-mono text-[11px] text-lav/55"><span>Progresso</span><span>{p.progress}%</span></div><div className="mt-2 h-1.5 rounded-full bg-lav/10"><div className="h-full rounded-full bg-vio transition-all" style={{width:p.progress+"%"}}/></div><div className="mt-4 flex flex-wrap gap-2"><button className={pillButton} onClick={()=>advance(p.id,p.progress>=100?"concluido":"andamento",Math.min(100,p.progress+10))}>Avançar 10%</button><button className={pillButton} onClick={()=>advance(p.id,"pausado",p.progress)}>Pausar</button><button className={pillButton} onClick={()=>projectsStore.set(s=>s.filter(x=>x.id!==p.id))}><Trash2 className="h-3.5 w-3.5"/></button></div></GlassCard>)}{projects.length===0&&<GlassCard><EmptyState title="Seu próximo projeto começa aqui" description="Crie um projeto para acompanhar progresso e etapas."/></GlassCard>}</div>
    <GlassCard><CardTitle>Novo projeto</CardTitle><form className="mt-4 space-y-3" onSubmit={e=>{e.preventDefault();add();}}><input className={fieldClass} value={name} onChange={e=>setName(e.target.value)} placeholder="Nome do projeto"/><textarea className={fieldClass+" min-h-24"} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Objetivo e contexto (opcional)"/><button className={primaryButton}><FolderPlus className="h-4 w-4"/> Criar projeto</button></form></GlassCard></div>;
}

function MySpace() {
  const prefs = prefsStore.useValue(); const tasks=tasksStore.useValue(); const projects=projectsStore.useValue(); const activities=activitiesStore.useValue();
  const [focus,setFocus]=useState(prefs.focusNote); const [notes,setNotes]=useState(prefs.quickNotes);
  const widgets = [{id:"relogio",label:"Relógio"},{id:"foco",label:"Foco"},{id:"tarefas",label:"Tarefas"},{id:"projetos",label:"Projetos"},{id:"notas",label:"Notas"},{id:"modulos",label:"Módulos"},{id:"uso",label:"Uso"}] as const;
  const enabled=(id:string)=>prefs.widgets.find(w=>w.id===id)?.enabled??false;
  return <div className="space-y-5"><GlassCard><CardTitle aside="Personalizável">Widgets do seu espaço</CardTitle><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{widgets.map(w=><Toggle key={w.id} label={w.label} checked={enabled(w.id)} onChange={v=>prefsStore.set(p=>({...p,widgets:p.widgets.map(x=>x.id===w.id?{...x,enabled:v}:x)}))}/>)}</div></GlassCard>
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{enabled("relogio")&&<GlassCard><Clock3 className="h-5 w-5 text-vio"/><p className="mt-3 font-mono text-3xl text-lav">{new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit",hour12:!prefs.clock24})}</p><p className="text-[11px] text-lav/45">{new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long"})}</p></GlassCard>}{enabled("foco")&&<GlassCard><CardTitle>Meu foco</CardTitle><textarea className={fieldClass+" mt-3 min-h-24"} value={focus} onChange={e=>setFocus(e.target.value)} placeholder="Qual é a prioridade de hoje?"/><button className={pillButton+" mt-2"} onClick={()=>prefsStore.set(p=>({...p,focusNote:focus}))}><Save className="h-3.5 w-3.5"/> Salvar foco</button></GlassCard>}{enabled("tarefas")&&<GlassCard><CardTitle>Tarefas abertas</CardTitle><Metric label="Pendentes" value={tasks.filter(t=>t.status!=="done").length}/><Link to="/tarefas" className="mt-3 inline-flex text-[12px] text-lav/60">Ver tarefas <ArrowRight className="ml-1 h-3 w-3"/></Link></GlassCard>}{enabled("projetos")&&<GlassCard><CardTitle>Projetos ativos</CardTitle><Metric label="Em andamento" value={projects.filter(p=>p.status==="andamento").length}/><Link to="/projetos" className="mt-3 inline-flex text-[12px] text-lav/60">Ver projetos <ArrowRight className="ml-1 h-3 w-3"/></Link></GlassCard>}{enabled("notas")&&<GlassCard><CardTitle>Notas rápidas</CardTitle><textarea className={fieldClass+" mt-3 min-h-24"} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Anote uma ideia..."/><button className={pillButton+" mt-2"} onClick={()=>prefsStore.set(p=>({...p,quickNotes:notes}))}><Save className="h-3.5 w-3.5"/> Salvar notas</button></GlassCard>}</div>{enabled("modulos")&&<GlassCard><CardTitle>Módulos da plataforma</CardTitle><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{MODULES.map(m=><Link key={m.key} to={m.path} className="rounded-xl px-3 py-2 text-[11px] text-lav/70 ring-1 ring-lav/10 hover:bg-vio/10">{m.short}</Link>)}</div></GlassCard>}{enabled("uso")&&<GlassCard><CardTitle>Resumo diário</CardTitle><div className="mt-3 grid grid-cols-2 gap-2"><Metric label="Tarefas concluídas" value={tasks.filter(t=>t.status==="done").length}/><Metric label="Atividades recentes" value={activities.filter(a=>new Date(a.at).toDateString()===new Date().toDateString()).length}/></div><div className="mt-3 space-y-2">{activities.slice(0,4).map(a=><p key={a.id} className="text-[11px] text-lav/55">{a.text}</p>)}</div></GlassCard>}</div>;
}

function Generator({mode}:{mode:"pesquisa"|"criador"}) {
  const [prompt,setPrompt]=useState(""); const [kind,setKind]=useState(mode==="pesquisa"?"Relatório de mercado":"Texto"); const [result,setResult]=useState(""); const [busy,setBusy]=useState(false);
  const isResearch=mode==="pesquisa";
  const generate=async()=>{if(prompt.trim().length<3){toast.error("Escreva um pedido com pelo menos 3 caracteres.");return;}setBusy(true);setResult("");try{const full=await streamGenerate({mode,kind,prompt},setResult);if(isResearch)reportsStore.set(p=>[{id:uid(),topic:prompt.trim(),content:full,createdAt:Date.now()},...p]);else draftsStore.set(p=>[{id:uid(),kind,brief:prompt.trim(),content:full,createdAt:Date.now()},...p]);toast.success(isResearch?"Relatório salvo.":"Criação salva.");}catch(e){toast.error(e instanceof Error?e.message:"Não foi possível gerar o conteúdo.");}finally{setBusy(false);}};
  const saved = isResearch
    ? reportsStore.useValue().slice(0, 6).map((item) => ({ id: item.id, title: item.topic, createdAt: item.createdAt }))
    : draftsStore.useValue().slice(0, 6).map((item) => ({ id: item.id, title: item.brief, createdAt: item.createdAt }));
  return <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]"><GlassCard><CardTitle>{isResearch?"Nova investigação":"Novo projeto criativo"}</CardTitle><div className="mt-4 space-y-3"><label className="text-[11px] text-lav/50">Formato</label><select className={fieldClass} value={kind} onChange={e=>setKind(e.target.value)}>{(isResearch?["Relatório de mercado","Análise de concorrentes","Análise de tendências","Plano estratégico"]:["Texto","Post para redes sociais","Roteiro","E-mail","Código","Plano de conteúdo"]).map(x=><option key={x}>{x}</option>)}</select><textarea className={fieldClass+" min-h-40"} value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder={isResearch?"Ex.: Analise oportunidades de IA para pequenos negócios no Brasil...":"Descreva o que deseja criar, público, objetivo e tom..."}/><button className={primaryButton} disabled={busy} onClick={()=>void generate()}>{busy?<RefreshCw className="h-4 w-4 animate-spin"/>:<Sparkles className="h-4 w-4"/>}{busy?" Gerando...":" Gerar com TUNAVI"}</button><p className="text-[10px] text-lav/35">A geração usa a IA configurada no ambiente. A disponibilidade depende da autenticação e dos limites da conta.</p></div></GlassCard>
    <GlassCard><CardTitle aside={busy?"gerando":result?"resultado":"aguardando"}>Resultado</CardTitle><div className="mt-4 max-h-[520px] overflow-auto whitespace-pre-wrap text-[13px] leading-6 text-lav/80">{result||"O conteúdo gerado aparecerá aqui. Você poderá revisar e reutilizar o resultado."}</div></GlassCard>
    <GlassCard className="xl:col-span-2"><CardTitle>{isResearch?"Relatórios recentes":"Criações recentes"}</CardTitle><div className="mt-3 grid gap-2 md:grid-cols-2">{saved.map((item)=><div key={item.id} className="flex items-center gap-3 rounded-xl p-3 ring-1 ring-lav/10"><FileText className="h-4 w-4 shrink-0 text-vio"/><div className="min-w-0 flex-1"><p className="truncate text-[12px] text-lav/80">{item.title}</p><p className="text-[10px] text-lav/35">{formatDate(item.createdAt)}</p></div><button className="text-lav/35 hover:text-red-300" onClick={()=>isResearch?reportsStore.set(p=>p.filter(x=>x.id!==item.id)):draftsStore.set(p=>p.filter(x=>x.id!==item.id))}><Trash2 className="h-4 w-4"/></button></div>)}{saved.length===0&&<p className="text-[12px] text-lav/40">Nenhum item salvo ainda.</p>}</div></GlassCard></div>;
}

function Agents() {
  const prefs=prefsStore.useValue();
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{AGENTS.map(a=>{const available=prefs.agentStatus[a.id]!==false;const active=prefs.activeAgent===a.id;return <GlassCard key={a.id}><div className="flex items-center justify-between"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-vio/15 text-lav"><Bot className="h-5 w-5"/></span><span className={`rounded-full px-2 py-1 text-[9px] ${available?"bg-emerald-400/10 text-emerald-200":"bg-lav/5 text-lav/35"}`}>{available?(active?"Selecionado":"Disponível"):"Pausado"}</span></div><h3 className="mt-4 text-[16px] font-semibold text-lav">{a.name}</h3><p className="text-[11px] text-vio">{a.role}</p><p className="mt-2 min-h-10 text-[12px] text-lav/50">{a.description}</p><div className="mt-3 flex flex-wrap gap-1.5">{a.skills.map(s=><span key={s} className="rounded-full bg-lav/5 px-2 py-1 text-[9px] text-lav/50">{s}</span>)}</div><div className="mt-4 grid grid-cols-2 gap-2"><button className={primaryButton+" w-full"} disabled={!available} onClick={()=>{prefsStore.set(p=>({...p,activeAgent:a.id}));playSound("on");}}>{active?"Agente ativo":"Selecionar"}</button><button className={pillButton+" w-full"} onClick={()=>prefsStore.set(p=>({...p,agentStatus:{...p.agentStatus,[a.id]:!available},activeAgent:available&&p.activeAgent===a.id?null:p.activeAgent}))}>{available?"Pausar":"Ativar"}</button></div><Link to="/conversar" className="mt-3 block text-center text-[11px] text-lav/55 hover:text-lav">Conversar com {a.name} →</Link></GlassCard>})}</div>;
}

function Memory() {
  const memories=memoriesStore.useValue(); const prefs=prefsStore.useValue(); const [text,setText]=useState("");const [kind,setKind]=useState<MemoryKind>("preferencia");
  const add=()=>{if(!text.trim())return;memoriesStore.set(p=>[{id:uid(),kind,text:text.trim(),createdAt:Date.now()},...p]);setText("");toast.success("Memória salva neste dispositivo.");};
  return <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]"><GlassCard><CardTitle>Adicionar memória</CardTitle><div className="mt-4 space-y-3"><select className={fieldClass} value={kind} onChange={e=>setKind(e.target.value as MemoryKind)}><option value="preferencia">Preferência</option><option value="fato">Fato</option><option value="contexto">Contexto</option></select><textarea className={fieldClass+" min-h-28"} value={text} onChange={e=>setText(e.target.value)} placeholder="O que a TUNAVI deve considerar nas próximas conversas?"/><button className={primaryButton} onClick={add}><Plus className="h-4 w-4"/> Salvar memória</button><Toggle label="Usar memórias nas conversas" checked={prefs.sendMemories} onChange={v=>prefsStore.set(p=>({...p,sendMemories:v}))}/><p className="text-[10px] text-lav/35">As memórias atuais são armazenadas localmente neste navegador.</p></div></GlassCard><GlassCard><CardTitle aside={memories.length+" itens"}>Memórias salvas</CardTitle><div className="mt-3 space-y-2">{memories.map(m=><div key={m.id} className="flex items-start gap-3 rounded-xl p-3 ring-1 ring-lav/10"><span className="mt-0.5 rounded-full bg-vio/15 px-2 py-1 text-[9px] text-lav/65">{m.kind}</span><div className="min-w-0 flex-1"><p className="text-[12px] text-lav/80">{m.text}</p><p className="mt-1 text-[10px] text-lav/35">{formatDate(m.createdAt)}</p></div><button aria-label="Excluir memória" onClick={()=>memoriesStore.set(p=>p.filter(x=>x.id!==m.id))} className="text-lav/30 hover:text-red-300"><Trash2 className="h-4 w-4"/></button></div>)}{memories.length===0&&<EmptyState title="Memória vazia" description="Adicione preferências e informações úteis para personalizar suas conversas."/>}</div></GlassCard></div>;
}

type SpeechRecognitionLike = {
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }> | undefined> }) => void) | null;
  start: () => void;
};

function Voice() {
  const prefs=prefsStore.useValue();const [sample,setSample]=useState("Olá! Eu sou a TUNAVI. Como posso ajudar você hoje?");const [listening,setListening]=useState(false);
  const speak=()=>{if(!("speechSynthesis" in window)){toast.error("Este navegador não oferece síntese de voz.");return;}window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(sample);u.lang="pt-BR";u.rate=prefs.voiceRate;u.pitch=prefs.voicePitch;const voices=window.speechSynthesis.getVoices();const voice=voices.find(v=>v.name===prefs.voiceName)??getPreferredMaleVoice();if(voice)u.voice=voice;window.speechSynthesis.speak(u);};
  const listen=()=>{const browser=window as Window & {SpeechRecognition?:new()=>SpeechRecognitionLike;webkitSpeechRecognition?:new()=>SpeechRecognitionLike};const SR=browser.SpeechRecognition??browser.webkitSpeechRecognition;if(!SR){toast.error("Reconhecimento de voz não disponível neste navegador.");return;}const rec=new SR();rec.lang="pt-BR";rec.onstart=()=>setListening(true);rec.onend=()=>setListening(false);rec.onerror=()=>{setListening(false);toast.error("Não foi possível acessar o microfone.");};rec.onresult=(event)=>setSample(event.results[0]?.[0]?.transcript ?? "");rec.start();};
  const voices=typeof window!=="undefined"&&"speechSynthesis" in window?window.speechSynthesis.getVoices().filter(v=>v.lang.toLowerCase().startsWith("pt")):[];
  return <div className="grid gap-5 lg:grid-cols-2"><GlassCard><CardTitle>Prévia de voz</CardTitle><textarea className={fieldClass+" mt-4 min-h-28"} value={sample} onChange={e=>setSample(e.target.value)}/><div className="mt-3 flex flex-wrap gap-2"><button className={primaryButton} onClick={speak}><Volume2 className="h-4 w-4"/> Ouvir prévia</button><button className={pillButton} onClick={listen}><Mic className="h-4 w-4"/> {listening?"Ouvindo...":"Testar microfone"}</button><button className={pillButton} onClick={()=>window.speechSynthesis?.cancel()}>Parar</button></div></GlassCard><GlassCard><CardTitle>Configurações de voz</CardTitle><div className="mt-4 space-y-4"><label className="block text-[12px] text-lav/65">Voz em português<select className={fieldClass+" mt-2"} value={prefs.voiceName} onChange={e=>prefsStore.set(p=>({...p,voiceName:e.target.value}))}><option value="">Automática (masculina, se disponível)</option>{voices.map(v=><option key={v.name} value={v.name}>{v.name}</option>)}</select></label><label className="block text-[12px] text-lav/65">Velocidade: {prefs.voiceRate.toFixed(1)}<input className="mt-2 w-full accent-violet-500" type="range" min=".6" max="1.6" step=".1" value={prefs.voiceRate} onChange={e=>prefsStore.set(p=>({...p,voiceRate:Number(e.target.value)}))}/></label><label className="block text-[12px] text-lav/65">Entonação: {prefs.voicePitch.toFixed(1)}<input className="mt-2 w-full accent-violet-500" type="range" min=".6" max="1.6" step=".1" value={prefs.voicePitch} onChange={e=>prefsStore.set(p=>({...p,voicePitch:Number(e.target.value)}))}/></label><Toggle label="Ler respostas automaticamente" checked={prefs.autoSpeak} onChange={v=>prefsStore.set(p=>({...p,autoSpeak:v}))}/><Toggle label="Ativar palavra-chave “Olá, Tunavi”" checked={prefs.wakeWordEnabled} onChange={v=>prefsStore.set(p=>({...p,wakeWordEnabled:v}))} description="A escuta contínua fica ativa somente na página Conversar, enquanto ela estiver aberta e visível."/></div></GlassCard><GlassCard className="lg:col-span-2"><p className="text-[11px] text-lav/45">A síntese e o reconhecimento de voz usam recursos nativos do navegador. A TUNAVI prioriza uma voz masculina em pt-BR quando disponível; os nomes e gêneros das vozes variam por dispositivo. A palavra-chave depende do suporte do navegador e não funciona com a página fechada ou em segundo plano.</p></GlassCard></div>;
}

function Integrations() {
  const prefs=prefsStore.useValue();
  const items=[
    {id:"google",name:"Google Workspace",desc:"Calendar, Drive e Gmail",icon:"G"},
    {id:"github",name:"GitHub",desc:"Repositórios, issues e pull requests",icon:"GH"},
    {id:"slack",name:"Slack",desc:"Mensagens e canais de equipe",icon:"S"},
    {id:"notion",name:"Notion",desc:"Páginas, notas e bases de conhecimento",icon:"N"},
    {id:"discord",name:"Discord",desc:"Comunidades e mensagens",icon:"D"},
    {id:"supabase",name:"Supabase",desc:"Autenticação e banco da plataforma",icon:"DB"},
    {id:"lovable",name:"Lovable AI",desc:"Geração de conteúdo e respostas",icon:"AI"},
    {id:"microsoft",name:"Microsoft 365",desc:"Outlook, OneDrive e calendário",icon:"M"},
  ];
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map(item=>{const enabled=prefs.notifyIntegrations.includes(item.id);const native=item.id==="supabase"||item.id==="lovable";return <GlassCard key={item.id}><div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-vio/15 font-mono text-[12px] text-lav">{item.icon}</span><div className="min-w-0 flex-1"><h3 className="text-[14px] font-semibold text-lav">{item.name}</h3><p className="text-[11px] text-lav/45">{item.desc}</p></div></div><div className="mt-4 flex items-center justify-between gap-2"><span className="text-[10px] text-lav/40">{native?"Serviço usado pela plataforma":enabled?"Ativado nesta interface":"Não conectado"}</span><button className={enabled?pillButton:primaryButton} onClick={()=>{prefsStore.set(p=>({...p,notifyIntegrations:enabled?p.notifyIntegrations.filter(x=>x!==item.id):[...p.notifyIntegrations,item.id]}));playSound(enabled?"off":"on");}}>{enabled?"Desativar":"Ativar"}</button></div><p className="mt-2 text-[10px] leading-4 text-lav/30">Ativar aqui registra sua preferência. A conexão real exige OAuth, credenciais e permissões do serviço.</p></GlassCard>})}</div>;
}

function Desktop() {
  const prefs=prefsStore.useValue();
  const shortcuts=[{to:"/conversar",label:"Conversar com TUNAVI",desc:"Abrir seu assistente"},{to:"/tarefas",label:"Central de tarefas",desc:"Ver prioridades"},{to:"/projetos",label:"Projetos",desc:"Acompanhar entregas"},{to:"/pesquisa",label:"Pesquisa",desc:"Criar um relatório"},{to:"/criador",label:"Estúdio criativo",desc:"Gerar conteúdo"},{to:"/configuracoes",label:"Preferências",desc:"Ajustar seu espaço"}] as const;
  return <div className="space-y-5"><GlassCard><div className="flex items-center gap-3"><Monitor className="h-7 w-7 text-vio"/><div><h2 className="text-[15px] font-semibold text-lav">Experiência Desktop</h2><p className="text-[11px] text-lav/45">Painel operacional e atalhos</p></div></div><div className="mt-5 flex items-center gap-2 rounded-xl bg-amber-400/5 p-3 text-[12px] text-amber-100/75 ring-1 ring-amber-300/15"><WifiOff className="h-4 w-4"/> Aplicativo desktop ainda não vinculado</div><p className="mt-4 text-[12px] leading-6 text-lav/55">A plataforma web funciona neste dispositivo. A instalação nativa e a sincronização entre dispositivos exigem um aplicativo desktop e um serviço dedicado; este painel não simula uma conexão inexistente.</p></GlassCard><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{shortcuts.map(s=><Link key={s.to} to={s.to} className="rounded-2xl p-4 ring-1 ring-lav/12 glass transition hover:ring-vio/50"><p className="text-[13px] font-semibold text-lav">{s.label}</p><p className="mt-1 text-[11px] text-lav/45">{s.desc}</p><span className="mt-3 inline-flex text-[11px] text-vio">Abrir módulo →</span></Link>)}</div><GlassCard><CardTitle>Estado do dispositivo</CardTitle><div className="mt-4 grid gap-3 sm:grid-cols-3"><Metric label="Plataforma" value={typeof navigator!=="undefined"?navigator.platform:"Web"}/><Metric label="Armazenamento" value="LocalStorage" hint="Dados locais do navegador"/><Metric label="Última verificação" value={prefs.lastSyncAt?new Date(prefs.lastSyncAt).toLocaleTimeString("pt-BR"):"Ainda não realizada"}/></div><button className={pillButton+" mt-4"} onClick={()=>{prefsStore.set(p=>({...p,lastSyncAt:Date.now()}));toast.success("Estado local atualizado.");}}><RefreshCw className="h-4 w-4"/> Atualizar estado local</button></GlassCard></div>;
}

function Security() {
  const {user,session,signOut}=useAuth();const [confirm,setConfirm]=useState(false);const activities=activitiesStore.useValue();const prefs=prefsStore.useValue();
  return <div className="grid gap-5 lg:grid-cols-2"><GlassCard><div className="flex items-center gap-3"><ShieldCheck className="h-6 w-6 text-emerald-200"/><div><h2 className="text-[15px] font-semibold text-lav">Status de proteção</h2><p className="text-[11px] text-lav/45">Autenticação e controles de privacidade</p></div></div><div className="mt-4 space-y-3"><Metric label="Proteção da sessão" value={session?"Ativa":"Sem sessão"}/><Metric label="Armazenamento de histórico" value={prefs.saveHistory?"Ativado":"Desativado"}/><Metric label="Memórias no contexto" value={prefs.sendMemories?"Ativadas":"Desativadas"}/></div><dl className="mt-5 space-y-3 text-[12px]"><div className="flex justify-between gap-3"><dt className="text-lav/45">Conta</dt><dd className="text-lav/80">{user?.email??"Não autenticado"}</dd></div><div className="flex justify-between gap-3"><dt className="text-lav/45">Provedor</dt><dd className="text-lav/80">{user?.app_metadata?.provider??"—"}</dd></div></dl>{user&&<button className={pillButton+" mt-5"} onClick={()=>setConfirm(true)}>Encerrar sessão</button>}{confirm&&<div className="mt-3 rounded-xl bg-red-400/5 p-3 text-[12px] text-lav/70 ring-1 ring-red-300/20">Deseja sair desta conta?<div className="mt-3 flex gap-2"><button className={primaryButton} onClick={()=>void signOut()}>Sair</button><button className={pillButton} onClick={()=>setConfirm(false)}>Cancelar</button></div></div>}</GlassCard><GlassCard><CardTitle>Histórico de atividades neste navegador</CardTitle><div className="mt-3 space-y-2">{activities.slice(0,12).map(a=><div key={a.id} className="flex justify-between gap-3 rounded-xl px-3 py-2 ring-1 ring-lav/10"><span className="text-[11px] text-lav/75">{a.text}</span><span className="shrink-0 text-[10px] text-lav/35">{new Date(a.at).toLocaleString("pt-BR")}</span></div>)}{activities.length===0&&<p className="text-[11px] text-lav/40">Nenhuma atividade registrada localmente.</p>}</div></GlassCard><GlassCard className="lg:col-span-2"><CardTitle>Opções de privacidade</CardTitle><div className="mt-3 space-y-2"><Toggle label="Salvar histórico de conversas" checked={prefs.saveHistory} onChange={v=>prefsStore.set(p=>({...p,saveHistory:v}))}/><Toggle label="Incluir memórias no contexto da IA" checked={prefs.sendMemories} onChange={v=>prefsStore.set(p=>({...p,sendMemories:v}))}/><p className="text-[10px] leading-5 text-lav/35">O histórico mostrado aqui é local e não representa um registro completo de auditoria do servidor. Eventos administrativos são registrados separadamente no Supabase.</p></div></GlassCard></div>;
}

function Settings() {
  const prefs=prefsStore.useValue();
  return <div className="grid gap-5 lg:grid-cols-2"><GlassCard><CardTitle>Experiência</CardTitle><div className="mt-3 space-y-2"><label className="block text-[11px] text-lav/50">Como deseja ser chamado?<input className={fieldClass+" mt-2"} value={prefs.name} onChange={e=>prefsStore.set(p=>({...p,name:e.target.value}))} placeholder="Seu nome"/></label><Toggle label="Sons da interface" checked={prefs.sound} onChange={v=>prefsStore.set(p=>({...p,sound:v}))}/><Toggle label="Reduzir animações" checked={prefs.reducedMotion} onChange={v=>prefsStore.set(p=>({...p,reducedMotion:v}))}/><Toggle label="Relógio de 24 horas" checked={prefs.clock24} onChange={v=>prefsStore.set(p=>({...p,clock24:v}))}/></div></GlassCard><GlassCard><CardTitle>Privacidade e dados</CardTitle><div className="mt-3 space-y-2"><Toggle label="Usar memórias no contexto da IA" checked={prefs.sendMemories} onChange={v=>prefsStore.set(p=>({...p,sendMemories:v}))}/><Toggle label="Salvar histórico de conversas" checked={prefs.saveHistory} onChange={v=>prefsStore.set(p=>({...p,saveHistory:v}))}/><p className="pt-2 text-[10px] leading-5 text-lav/35">As preferências deste painel são salvas neste navegador. Dados de conta e autenticação permanecem no Supabase.</p></div></GlassCard><GlassCard className="lg:col-span-2"><CardTitle>Preferências locais</CardTitle><p className="mt-2 text-[12px] text-lav/45">Você pode redefinir as preferências sem apagar suas tarefas, projetos ou memórias.</p><button className={pillButton+" mt-4"} onClick={()=>{prefsStore.reset();toast.success("Preferências restauradas.");}}><RefreshCw className="h-4 w-4"/> Restaurar padrões</button></GlassCard></div>;
}
