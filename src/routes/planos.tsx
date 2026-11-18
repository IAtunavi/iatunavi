import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Crown, Minus, Sparkles, Zap, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { GlassCard, PageContainer, pillButton, primaryButton } from "@/components/hud/primitives";
import { useAuth } from "@/lib/auth";
import { useUserPlan } from "@/lib/use-plan";
import { supabase } from "@/integrations/supabase/client";
import { playSound } from "@/lib/sound";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/planos")({
  head: () => ({ meta: [
    { title: "Planos — TUNAVI Explorador, Pro e Ultra" },
    { name: "description", content: "Compare os planos TUNAVI e escolha seu nível de inteligência artificial." },
  ] }),
  component: PlanosPage,
});

type Cycle = "mensal" | "anual";
type Settings = {
  pro_price_monthly: number; pro_price_yearly: number;
  ultra_price_monthly: number; ultra_price_yearly: number;
  free_daily_limit: number; pro_daily_limit: number; ultra_daily_limit: number;
  free_max_tokens: number; pro_max_tokens: number; ultra_max_tokens: number;
  pro_modules: unknown; ultra_modules: unknown;
};
const DEFAULTS: Settings = {
  pro_price_monthly: 49.9, pro_price_yearly: 397,
  ultra_price_monthly: 97, ultra_price_yearly: 797,
  free_daily_limit: 50, pro_daily_limit: 300, ultra_daily_limit: 1000,
  free_max_tokens: 2048, pro_max_tokens: 8192, ultra_max_tokens: 16384,
  pro_modules: [], ultra_modules: [],
};
const fmt = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const features = {
  free: ["50 mensagens/dia com modelo rápido (Groq / Terra)", "Holograma básico com 5 estados", "Comandos essenciais: navegar telas e criar tarefas", "Histórico de 7 dias"],
  pro: ["300 mensagens/dia com modelos avançados", "Voz otimizada e 6 agentes especializados", "Criador de Mídia e Pesquisa Avançada", "Relatórios executivos e player de áudio HUD", "Histórico e memória de 30 dias", "Selo PRO luminoso no perfil"],
  ultra: ["1.000 mensagens/dia com raciocínio profundo", "Assistente virtual completo com ações automatizadas", "Desktop Bridge (agente local para PC) e Casa Inteligente (IoT)", "Voz neural ultrarrealista com viva-voz contínuo", "Memória permanente perpétua", "Selo ULTRA dourado no HUD"],
};
function PlanosPage() {
  const [cycle, setCycle] = useState<Cycle>("mensal");
  const { user, isAdmin } = useAuth();
  const plan = useUserPlan();
  const settingsQuery = useQuery({
    queryKey: ["app-settings", "plan-pricing"],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings").select("*").single();
      if (error) throw error;
      return data as Settings;
    },
    staleTime: 60_000,
  });
  const settings = { ...DEFAULTS, ...(settingsQuery.data ?? {}) };
  const comparisons: [string, string, string, string][] = [
    ["Mensagens diárias", String(settings.free_daily_limit), String(settings.pro_daily_limit), settings.ultra_daily_limit.toLocaleString("pt-BR")],
    ["Tokens por resposta", settings.free_max_tokens.toLocaleString("pt-BR"), settings.pro_max_tokens.toLocaleString("pt-BR"), settings.ultra_max_tokens.toLocaleString("pt-BR")],
    ["Modelos", "Rápido (Groq / Terra)", "Modelos avançados", "Raciocínio profundo"],
    ["Agentes", "Essenciais", "6 especializados", "Todos"],
    ["Relatórios executivos", "—", "Incluído", "Incluído"],
    ["Player de áudio HUD", "—", "Incluído", "Incluído"],
    ["Módulos exclusivos", "—", "Criador de mídia e pesquisa", "Automação completa"],
    ["Desktop Bridge / IoT", "—", "—", "Incluído"],
  ];
  const activeTier = plan.tier;
  const savings = useMemo(() => {
    const monthly = settings.pro_price_monthly * 12;
    return monthly > 0 ? Math.floor((1 - settings.pro_price_yearly / monthly) * 100) : 0;
  }, [settings.pro_price_monthly, settings.pro_price_yearly]);
  const price = (tier: "pro" | "ultra") => cycle === "mensal"
    ? settings[tier === "pro" ? "pro_price_monthly" : "ultra_price_monthly"]
    : settings[tier === "pro" ? "pro_price_yearly" : "ultra_price_yearly"];
  const activate = (tier: "pro" | "ultra") => {
    playSound("tap");
    toast("Checkout em breve via Mercado Pago", { description: `A contratação do TUNAVI ${tier.toUpperCase()} estará disponível em breve.` });
  };
  const expiry = plan.currentPeriodEnd
    ? new Date(plan.currentPeriodEnd).toLocaleDateString("pt-BR")
    : null;

  const cards = [
    { tier: "free" as const, name: "EXPLORADOR", eyebrow: "COMECE GRÁTIS", price: 0, color: "border-lav/15", items: features.free.map(item => item.replace("50 mensagens/dia", settings.free_daily_limit + " mensagens/dia")) },
    { tier: "pro" as const, name: "TUNAVI PRO", eyebrow: "MAIS POPULAR", price: price("pro"), color: "border-vio/70 shadow-[0_0_30px_rgba(124,58,237,.18)]", items: features.pro.map(item => item.replace("300 mensagens/dia", settings.pro_daily_limit + " mensagens/dia")) },
    { tier: "ultra" as const, name: "TUNAVI ULTRA", eyebrow: "J.A.R.V.I.S. COMPLETO", price: price("ultra"), color: "border-amber-400/70 shadow-[0_0_34px_rgba(245,158,11,.2)]", items: features.ultra.map(item => item.replace("1.000 mensagens/dia", settings.ultra_daily_limit.toLocaleString("pt-BR") + " mensagens/dia")) },
  ];

  return <PageContainer>
    <div className="relative mx-auto max-w-7xl">
      <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full orb-gradient opacity-30 blur-3xl" />
      <header className="relative mb-8 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-lav/50">TUNAVI · Planos</p>
        <h1 className="mt-2 text-2xl font-semibold text-lav sm:text-4xl">Escolha o nível da sua inteligência</h1>
        <p className="mx-auto mt-2 max-w-2xl text-[13px] text-lav/60">Comece gratuitamente ou desbloqueie todo o potencial da sua assistente.</p>
        {isAdmin ? <p className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-sm text-amber-300"><ShieldCheck className="h-4 w-4" /> Acesso Total de Administrador</p>
          : plan.isSubscribed && <p className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-vio/40 bg-vio/10 px-4 py-2 text-sm text-lav">✓ Você possui o plano {activeTier === "ultra" ? "Ultra" : "Pro"} ativo{expiry ? ` até ${expiry}` : ""}</p>}
        <div role="tablist" aria-label="Ciclo de cobrança" className="mx-auto mt-6 inline-flex rounded-full p-1 ring-1 ring-lav/20 glass">
          {(["mensal", "anual"] as Cycle[]).map(c => <button key={c} role="tab" aria-selected={cycle === c} onClick={() => { setCycle(c); playSound("tap"); }} className={cn("rounded-full px-5 py-2 font-mono text-[11px] uppercase tracking-wider transition", cycle === c ? "bg-vio text-primary-foreground glow" : "text-lav/60 hover:text-lav")}>{c === "mensal" ? "Mensal" : `Anual (até ${savings}% OFF)`}</button>)}
        </div>
        {settingsQuery.isError && <p className="mt-2 text-[10px] text-lav/40">Exibindo preços padrão; não foi possível atualizar as configurações.</p>}
      </header>

      <section className="relative grid grid-cols-1 gap-5 sm:grid-cols-3">
        {cards.map(card => {
          const current = activeTier === card.tier;
          const isDisabled = card.tier === "free" ? activeTier !== "free" : card.tier === "pro" ? activeTier === "pro" || activeTier === "ultra" : activeTier === "ultra";
          const amount = card.tier === "free" ? "0" : fmt(card.price);
          return <GlassCard key={card.tier} className={cn("relative flex flex-col overflow-hidden border p-6", card.color, card.tier === "ultra" && "bg-amber-400/[0.035]")}>
            <span className={cn("mb-4 self-start rounded-full px-3 py-1 font-mono text-[9px] uppercase tracking-wider", card.tier === "ultra" ? "bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/40" : card.tier === "pro" ? "bg-vio/20 text-lav ring-1 ring-vio/50" : "bg-lav/5 text-lav/60 ring-1 ring-lav/10")}>{card.eyebrow}</span>
            <div className="flex items-center gap-2"><span className={cn("font-mono text-[11px] uppercase tracking-[0.2em]", card.tier === "ultra" ? "text-amber-300" : "text-lav")}>{card.name}</span>{card.tier === "ultra" ? <Crown className="h-4 w-4 text-amber-300" /> : card.tier === "pro" ? <Sparkles className="h-4 w-4 text-vio" /> : <Zap className="h-4 w-4 text-lav/50" />}</div>
            <p className={cn("mt-4 text-4xl font-semibold", card.tier === "ultra" ? "text-amber-300" : "text-lav")}>R$ {amount}<span className="text-sm font-normal text-lav/50">{card.tier === "free" ? " / mês" : cycle === "mensal" ? " / mês" : " / ano"}</span></p>
            <p className="font-mono text-[10px] text-lav/45">{card.tier === "free" ? "Para sempre" : cycle === "mensal" ? "Cobrança mensal" : `Equivale a R$ ${fmt(card.price / 12)} por mês`}</p>
            <ul className="mt-6 flex-1 space-y-3">{card.items.map(item => <li key={item} className="flex gap-2.5 text-[13px] text-lav/80"><Check className={cn("mt-0.5 h-4 w-4 shrink-0", card.tier === "ultra" ? "text-amber-300" : "text-vio")} />{item}</li>)}</ul>
            {card.tier === "free" ? user ? <button disabled className={cn(pillButton, "mt-7 w-full cursor-not-allowed opacity-60")}>{current ? "Plano Atual" : "Plano Básico"}</button> : <Link to="/entrar" className={cn(pillButton, "mt-7 w-full")}>Começar grátis</Link>
              : <button type="button" disabled={isDisabled || isAdmin} onClick={() => activate(card.tier)} className={cn(primaryButton, "mt-7 h-11 w-full text-[13px]", card.tier === "ultra" && "border border-amber-400/60 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25", (isDisabled || isAdmin) && "cursor-default opacity-60")}>{isAdmin ? "Acesso de Administrador" : current ? "Seu Plano Ativo" : card.tier === "pro" ? "Ativar Modo Pro" : "Desbloquear J.A.R.V.I.S. Ultra"}</button>}
          </GlassCard>;
        })}
      </section>

      <GlassCard className="relative mt-8 overflow-x-auto p-0">
        <div className="px-5 pb-2 pt-5"><h2 className="text-lg font-semibold text-lav">Comparativo de recursos</h2><p className="mt-1 text-xs text-lav/50">Veja o que está incluído em cada nível.</p></div>
        <table className="w-full min-w-[680px] text-left text-[12px]">
          <thead><tr className="border-y border-lav/10 font-mono text-[10px] uppercase tracking-wider text-lav/50"><th className="px-5 py-3 font-normal">Recurso</th><th className="px-5 py-3 font-normal">Explorador</th><th className="px-5 py-3 font-normal text-vio">Pro</th><th className="px-5 py-3 font-normal text-amber-300">Ultra</th></tr></thead>
          <tbody>{comparisons.map(([label, a, b, c]) => <tr key={label} className="border-b border-lav/5 last:border-0"><td className="px-5 py-3 text-lav/80">{label}</td>{[a,b,c].map((v,i)=><td key={i} className={cn("px-5 py-3 font-mono text-[11px]", i===2 ? "text-amber-200" : i===1 ? "text-lav" : "text-lav/55")}>{v === "—" ? <Minus className="h-4 w-4 text-lav/25" /> : v}</td>)}</tr>)}</tbody>
        </table>
      </GlassCard>
      <p className="mt-4 text-center font-mono text-[10px] text-lav/40">Preços em reais · Checkout via Mercado Pago em breve</p>
    </div>
  </PageContainer>;
}
