import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { ArrowRight, Check } from "lucide-react";
import { Hologram } from "@/components/hologram/Hologram";
import { StateSelector } from "@/components/hologram/StateSelector";
import { QuickComposer } from "@/components/hud/QuickComposer";
import { CardTitle, GlassCard, ModuleGate } from "@/components/hud/primitives";
import { activitiesStore, formatTime, projectsStore, tasksStore } from "@/lib/data";
import { getChat, messageText } from "@/lib/chat-client";
import { MODULES } from "@/lib/modules";
import { isModuleEnabled, useAppSettings } from "@/lib/settings";
import { playSound } from "@/lib/sound";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Visão geral — TUNAVI" },
      { name: "description", content: "Painel principal da TUNAVI: holograma do assistente, tarefas do dia, projetos e atividades recentes." },
      { property: "og:title", content: "Visão geral — TUNAVI" },
      { property: "og:description", content: "Sua inteligência. Seu mundo. Suas possibilidades." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <ModuleGate module="visao-geral"><Overview /></ModuleGate>,
});

const QUICK = [
  { label: "Organizar agenda", prompt: "TUNAVI, organize minha agenda." },
  { label: "Pesquisar mercado", prompt: "Pesquise as tendências do mercado." },
];

function Overview() {
  const tasks = tasksStore.useValue();
  const projects = projectsStore.useValue();
  const activities = activitiesStore.useValue();
  const navigate = useNavigate();
  const done = tasks.filter((t) => t.status === "done").length;
  const dayTasks = [...tasks].sort((a, b) => a.createdAt - b.createdAt).slice(0, 4);
  const running = projects.filter((p) => p.status === "andamento").slice(0, 3);

  const ask = (prompt: string) => {
    playSound("send");
    void getChat().sendMessage({ text: prompt });
    navigate({ to: "/conversar" });
  };

  return (
    <div className="flex flex-col items-center px-4 pb-10 pt-4 sm:px-6 lg:px-10">
      <h1 className="sr-only">Visão geral</h1>
      <Hologram className="max-sm:hidden" />
      <Hologram className="sm:hidden" scale={0.8} />

      <QuickComposer className="mt-7" />

      <div className="mt-4 flex flex-wrap justify-center gap-3 text-[12px]">
        {QUICK.map((q) => (
          <button key={q.label} type="button" onClick={() => ask(q.prompt)} className="h-9 rounded-full px-4 text-lav/80 ring-1 ring-lav/20 hover:bg-vio/20">
            {q.label}
          </button>
        ))}
      </div>

      <StateSelector className="mt-4" />

      <div className="mt-8 grid w-full max-w-[1100px] grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        <GlassCard>
          <CardTitle aside={`${done}/${tasks.length}`}>Tarefas do Dia</CardTitle>
          {dayTasks.length === 0 ? (
            <p className="mt-4 text-[13px] text-lav/50">
              Nenhuma tarefa ainda.{" "}
              <Link to="/tarefas" className="text-lav underline-offset-2 hover:underline">
                Criar tarefa
              </Link>
            </p>
          ) : (
            <ul className="mt-4 space-y-2.5 text-[13px]">
              {dayTasks.map((t) => {
                const isDone = t.status === "done";
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => {
                        playSound("tap");
                        tasksStore.set((prev) => prev.map((x) => (x.id === t.id ? { ...x, status: isDone ? "todo" : "done" } : x)));
                      }}
                      className={cn("flex w-full items-center gap-3 text-left", isDone ? "text-lav/40 line-through" : "text-lav/85 hover:text-lav")}
                      aria-pressed={isDone}
                    >
                      <span className={cn("grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full", isDone ? "bg-vio" : "ring-1 ring-lav/40")}>
                        {isDone && <Check className="h-2.5 w-2.5 text-primary-foreground opacity-0" />}
                      </span>
                      <span className="truncate">{t.title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </GlassCard>

        <GlassCard>
          <CardTitle>Projetos em Andamento</CardTitle>
          {running.length === 0 ? (
            <p className="mt-4 text-[13px] text-lav/50">
              Nenhum projeto em andamento.{" "}
              <Link to="/projetos" className="text-lav underline-offset-2 hover:underline">
                Criar projeto
              </Link>
            </p>
          ) : (
            <div className="mt-4 space-y-3.5 text-[13px]">
              {running.map((p, i) => (
                <Link key={p.id} to="/projetos" className="block">
                  <div className="flex justify-between gap-3 text-lav/85">
                    <span className="truncate">{p.name}</span>
                    <span className="font-mono text-[11px] text-lav/50">{p.progress}%</span>
                  </div>
                  <div className="mt-1.5 h-1 rounded-full bg-lav/10">
                    <div className={cn("h-1 rounded-full transition-all", i === 0 ? "bg-vio" : "bg-lav/70")} style={{ width: `${p.progress}%` }} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard className="md:col-span-2 xl:col-span-1">
          <CardTitle>Atividades Recentes</CardTitle>
          <ul className="mt-4 space-y-2.5 text-[13px] text-lav/80">
            {activities.slice(0, 3).map((a) => (
              <li key={a.id} className="flex justify-between gap-3">
                <span className="truncate">{a.text}</span>
                <span className="shrink-0 font-mono text-[11px] text-lav/40">{formatTime(a.at)}</span>
              </li>
            ))}
            {activities.length === 0 && <li className="text-lav/50">Sem atividades ainda.</li>}
          </ul>
        </GlassCard>
      </div>

      <SecondaryRow />
    </div>
  );
}

function SecondaryRow() {
  const { messages, status } = useChat({ chat: getChat() });
  const { data: settings } = useAppSettings();
  const recent = messages.filter((m) => m.role === "user").slice(-3).reverse();
  const shortcuts = MODULES.filter((m) => ["tarefas", "pesquisa", "criador", "memoria"].includes(m.key));
  const enabledCount = MODULES.filter((m) => isModuleEnabled(settings, m.key)).length;
  const tasks = tasksStore.useValue();
  const projects = projectsStore.useValue();

  return (
    <div className="mt-5 grid w-full max-w-[1100px] grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      <GlassCard>
        <CardTitle aside={status === "streaming" ? "respondendo" : undefined}>Conversas Recentes</CardTitle>
        {recent.length === 0 ? (
          <p className="mt-4 text-[13px] text-lav/50">Você ainda não conversou com a TUNAVI. Use o campo acima para começar.</p>
        ) : (
          <ul className="mt-4 space-y-2.5 text-[13px] text-lav/80">
            {recent.map((m) => (
              <li key={m.id}>
                <Link to="/conversar" className="block truncate hover:text-lav">
                  “{messageText(m)}”
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link to="/conversar" className="mt-4 inline-flex items-center gap-1.5 text-[12px] text-lav/60 hover:text-lav">
          Abrir conversa <ArrowRight className="h-3 w-3" />
        </Link>
      </GlassCard>

      <GlassCard>
        <CardTitle>Atalhos Rápidos</CardTitle>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {shortcuts.map((m) => {
            const Icon = m.icon;
            return (
              <Link key={m.key} to={m.path} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[12px] text-lav/75 ring-1 ring-lav/10 hover:bg-vio/15 hover:text-lav">
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                <span className="truncate">{m.short}</span>
              </Link>
            );
          })}
        </div>
      </GlassCard>

      <GlassCard className="md:col-span-2 xl:col-span-1">
        <CardTitle>Estado e Utilização</CardTitle>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-[12px]">
          {[
            ["Módulos ativos", `${enabledCount}/${MODULES.length}`],
            ["Mensagens", String(messages.length)],
            ["Tarefas abertas", String(tasks.filter((t) => t.status !== "done").length)],
            ["Projetos", String(projects.length)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl px-3 py-2 ring-1 ring-lav/10">
              <dt className="text-lav/50">{k}</dt>
              <dd className="mt-0.5 font-mono text-[15px] text-lav">{v}</dd>
            </div>
          ))}
        </dl>
      </GlassCard>
    </div>
  );
}
