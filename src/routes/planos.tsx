import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Crown, Minus, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";
import { GlassCard, PageContainer, pillButton, primaryButton } from "@/components/hud/primitives";
import { useAuth } from "@/lib/auth";
import { playSound } from "@/lib/sound";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/planos")({
  head: () => ({
    meta: [
      { title: "Planos — TUNAVI Explorador e Pro" },
      { name: "description", content: "Compare os planos da TUNAVI: Explorador gratuito e Pro com IA avançada, agentes e automações." },
      { property: "og:title", content: "Planos — TUNAVI" },
      { property: "og:description", content: "Explorador gratuito ou TUNAVI Pro com automações estilo J.A.R.V.I.S." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlanosPage,
});

type Cycle = "mensal" | "anual";

const FREE = [
  "50 mensagens com IA por dia",
  "Modelo rápido (Terra)",
  "Holograma com os 5 estados",
  "Voz padrão do navegador",
  "Visão geral, Conversar, Tarefas, Projetos e Meu espaço",
  "Comandos básicos: navegar e criar tarefas",
  "Histórico de 7 dias",
];
const PRO = [
  "Até 500 mensagens com IA por dia",
  "Modelos avançados (Astra e Sol)",
  "Voz neural ultrarrealista",
  "Os 6 agentes especializados",
  "Relatórios, player HUD e abertura de abas",
  "Criador de mídia e pesquisa avançada",
  "Desktop Bridge e casa inteligente",
  "Memória de longo prazo",
  "Selo PRO no seu perfil",
];

const COMPARE: [string, string | boolean, string | boolean][] = [
  ["Mensagens por dia", "50", "500"],
  ["Modelos de IA", "Terra", "Astra · Sol · Terra"],
  ["Agentes especializados", "1", "6"],
  ["Relatórios automáticos", false, true],
  ["Player HUD por voz", false, true],
  ["Criador de mídia", false, true],
  ["Desktop Bridge e IoT", false, true],
  ["Memória", "7 dias", "Ilimitada"],
  ["Suporte", "Comunidade", "Prioritário"],
];

function PlanosPage() {
  const [cycle, setCycle] = useState<Cycle>("anual");
  const { user } = useAuth();
  const price = cycle === "mensal" ? "47" : "33";

  const subscribe = () => {
    playSound("tap");
    toast("Pagamento em breve", { description: "O checkout do TUNAVI Pro será ativado na próxima etapa." });
  };

  return (
    <PageContainer>
      <div className="relative mx-auto max-w-5xl">
        <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full orb-gradient opacity-30 blur-3xl" />
        <header className="relative mb-8 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-lav/50">TUNAVI · Planos</p>
          <h1 className="mt-2 text-2xl font-semibold text-lav sm:text-4xl">Escolha o nível da sua inteligência</h1>
          <p className="mx-auto mt-2 max-w-xl text-[13px] text-lav/60">Comece grátis. Ative o modo Pro quando quiser automações completas.</p>

          <div role="tablist" className="mx-auto mt-6 inline-flex rounded-full p-1 ring-1 ring-lav/20 glass">
            {(["mensal", "anual"] as Cycle[]).map((c) => (
              <button key={c} role="tab" aria-selected={cycle === c} onClick={() => { setCycle(c); playSound("tap"); }}
                className={cn("rounded-full px-5 py-1.5 font-mono text-[11px] uppercase tracking-wider transition",
                  cycle === c ? "bg-vio text-primary-foreground glow" : "text-lav/60 hover:text-lav")}>
                {c}{c === "anual" && <span className="ml-1.5 text-[9px] opacity-80">−30%</span>}
              </button>
            ))}
          </div>
        </header>

        <div className="relative grid gap-5 md:grid-cols-2">
          <GlassCard className="flex flex-col p-6">
            <div className="flex items-center gap-2 text-lav/70"><Zap className="h-4 w-4" /><span className="font-mono text-[11px] uppercase tracking-[0.2em]">Explorador</span></div>
            <p className="mt-4 text-4xl font-semibold text-lav">R$ 0</p>
            <p className="font-mono text-[11px] text-lav/45">para sempre</p>
            <ul className="mt-6 flex-1 space-y-2.5">
              {FREE.map((f) => <li key={f} className="flex gap-2.5 text-[13px] text-lav/75"><Check className="mt-0.5 h-4 w-4 shrink-0 text-lav/50" />{f}</li>)}
            </ul>
            {user
              ? <span className={cn(pillButton, "mt-6 w-full cursor-default")}>Plano atual</span>
              : <Link to="/entrar" className={cn(pillButton, "mt-6 w-full")}>Criar conta grátis</Link>}
          </GlassCard>

          <GlassCard className="relative flex flex-col overflow-hidden p-6 ring-vio/60 glow">
            <div className="pointer-events-none absolute inset-0 scanlines opacity-40" />
            <span className="absolute right-5 top-5 rounded-full bg-vio/20 px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider text-lav ring-1 ring-vio/50">Recomendado</span>
            <div className="relative flex items-center gap-2 text-lav"><Crown className="h-4 w-4 text-vio" /><span className="font-mono text-[11px] uppercase tracking-[0.2em]">TUNAVI Pro</span></div>
            <p className="relative mt-4 text-4xl font-semibold text-lav">R$ {price}<span className="text-base font-normal text-lav/50">/mês</span></p>
            <p className="relative font-mono text-[11px] text-lav/45">{cycle === "anual" ? "R$ 397 cobrados por ano" : "cobrado mensalmente"}</p>
            <ul className="relative mt-6 flex-1 space-y-2.5">
              {PRO.map((f) => <li key={f} className="flex gap-2.5 text-[13px] text-lav/90"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-vio" />{f}</li>)}
            </ul>
            <button type="button" onClick={subscribe} className={cn(primaryButton, "relative mt-6 h-11 w-full text-[13px]")}>Assinar Pro</button>
          </GlassCard>
        </div>

        <GlassCard className="relative mt-8 overflow-x-auto p-0">
          <table className="w-full min-w-[480px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-lav/10 font-mono text-[10px] uppercase tracking-wider text-lav/50">
                <th className="px-5 py-3 font-normal">Recurso</th><th className="px-5 py-3 font-normal">Explorador</th><th className="px-5 py-3 font-normal text-lav">Pro</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map(([label, a, b]) => (
                <tr key={label} className="border-b border-lav/5 last:border-0">
                  <td className="px-5 py-3 text-lav/80">{label}</td>
                  <td className="px-5 py-3 font-mono text-[12px] text-lav/55"><Cell v={a} /></td>
                  <td className="px-5 py-3 font-mono text-[12px] text-lav"><Cell v={b} pro /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassCard>
        <p className="mt-4 text-center font-mono text-[10px] text-lav/40">Cancele quando quiser · Cartão e Pix</p>
      </div>
    </PageContainer>
  );
}

function Cell({ v, pro }: { v: string | boolean; pro?: boolean }) {
  if (v === true) return <Check className={cn("h-4 w-4", pro ? "text-vio" : "text-lav/50")} aria-label="Incluído" />;
  if (v === false) return <Minus className="h-4 w-4 text-lav/25" aria-label="Não incluído" />;
  return <>{v}</>;
}
