import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Crown, Gift, Percent, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { MODULES, type ModuleKey } from "@/lib/modules";
import { settingsQueryKey, type AppSettings } from "@/lib/settings";
import { GlassCard, fieldClass, pillButton, primaryButton } from "@/components/hud/primitives";
import { cn } from "@/lib/utils";

type Profile = { id: string; email: string | null; display_name: string | null; created_at: string };
type Sub = { user_id: string; plan: string; status: string; provider: string; current_period_end: string | null; note: string | null };

const DURATIONS = [
  { label: "30 dias", days: 30 },
  { label: "90 dias", days: 90 },
  { label: "1 ano", days: 365 },
  { label: "Vitalício", days: 0 },
];

export function isActivePro(s?: Sub) {
  return !!s && (s.plan === "pro" || s.plan === "ultra") && (s.status === "active" || s.status === "manual") && (!s.current_period_end || new Date(s.current_period_end) > new Date());
}

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function MonetizationPanel({ settings, profiles }: { settings: AppSettings; profiles: Profile[] }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [f, setF] = useState({
    pro_price_monthly: 47, pro_price_yearly: 397, free_daily_limit: 50, pro_daily_limit: 500,
    free_max_tokens: 2048, pro_max_tokens: 8192, trial_days: 0,
    ultra_price_monthly: 97, ultra_price_yearly: 797, ultra_daily_limit: 1000, ultra_max_tokens: 16384,
  });
  const [ultraModules, setUltraModules] = useState<ModuleKey[]>([]);
  const [tier, setTier] = useState<"pro" | "ultra">("pro");
  const [proModules, setProModules] = useState<ModuleKey[]>([]);
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<Profile | null>(null);
  const [days, setDays] = useState(30);
  const [note, setNote] = useState("");

  useEffect(() => {
    setF({
      pro_price_monthly: Number(settings.pro_price_monthly), pro_price_yearly: Number(settings.pro_price_yearly),
      free_daily_limit: settings.free_daily_limit, pro_daily_limit: settings.pro_daily_limit,
      free_max_tokens: settings.free_max_tokens, pro_max_tokens: settings.pro_max_tokens, trial_days: settings.trial_days,
      ultra_price_monthly: Number(settings.ultra_price_monthly), ultra_price_yearly: Number(settings.ultra_price_yearly),
      ultra_daily_limit: settings.ultra_daily_limit, ultra_max_tokens: settings.ultra_max_tokens,
    });
    setUltraModules(settings.ultra_modules ?? []);
    setProModules(settings.pro_modules ?? []);
  }, [settings]);

  const subs = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subscriptions").select("user_id,plan,status,provider,current_period_end,note");
      if (error) throw error;
      return (data ?? []) as Sub[];
    },
  });
  const admins = useQuery({
    queryKey: ["admin-role-list"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      return new Set((data ?? []).map((r) => r.user_id));
    },
  });

  const byUser = useMemo(() => new Map((subs.data ?? []).map((s) => [s.user_id, s])), [subs.data]);
  const activePro = (subs.data ?? []).filter(isActivePro);
  const paid = activePro.filter((s) => s.provider !== "manual").length;
  const manual = activePro.length - paid;
  const conversion = profiles.length ? Math.round((activePro.length / profiles.length) * 100) : 0;
  const ultraCount = activePro.filter((s) => s.plan === "ultra").length;
  const mrr = activePro.filter((s) => s.provider !== "manual").reduce((sum, s) => sum + (s.plan === "ultra" ? f.ultra_price_monthly : f.pro_price_monthly), 0);

  const audit = async (action: string, details: Record<string, unknown>) => {
    if (!user) return;
    await supabase.from("audit_logs").insert({ action, actor_id: user.id, actor_email: user.email ?? null, details: details as never });
    await qc.invalidateQueries({ queryKey: ["admin-audit"] });
  };

  const savePolicy = async () => {
    const ints = [f.free_daily_limit, f.pro_daily_limit, f.ultra_daily_limit, f.free_max_tokens, f.pro_max_tokens, f.ultra_max_tokens, f.trial_days];
    if (ints.some((n) => !Number.isInteger(n) || n < 0) || f.pro_price_monthly <= 0 || f.pro_price_yearly <= 0 || f.ultra_price_monthly <= 0 || f.ultra_price_yearly <= 0) {
      toast.error("Revise os valores: use números positivos."); return;
    }
    const { error } = await supabase.from("app_settings").update({ ...f, pro_modules: proModules, ultra_modules: ultraModules, updated_at: new Date().toISOString(), updated_by: user?.id ?? null }).eq("id", 1);
    if (error) { toast.error("Não foi possível salvar: " + error.message); return; }
    await audit("monetization.updated", { ...f, pro_modules: proModules, ultra_modules: ultraModules });
    await qc.invalidateQueries({ queryKey: settingsQueryKey });
    toast.success("Políticas dos planos atualizadas.");
  };

  const grant = async () => {
    if (!target || !user) return;
    const end = days ? new Date(Date.now() + days * 86400000).toISOString() : null;
    const { error } = await supabase.from("subscriptions").upsert({
      user_id: target.id, plan: tier, status: "manual", provider: "manual", current_period_end: end,
      note: note.trim() || null, granted_by: user.id, updated_at: new Date().toISOString(),
    });
    if (error) { toast.error("Não foi possível ativar: " + error.message); return; }
    await audit("plan.upgraded_manual", { target_user_id: target.id, target_email: target.email, plan: tier, days: days || "vitalício", note });
    await qc.invalidateQueries({ queryKey: ["admin-subscriptions"] });
    toast.success(`${tier === "ultra" ? "Ultra" : "Pro"} ativado para ${target.email ?? "a conta"}.`);
    setTarget(null); setNote("");
  };

  const revoke = async (p: Profile) => {
    const { error } = await supabase.from("subscriptions").update({ plan: "free", status: "canceled", current_period_end: null, updated_at: new Date().toISOString() }).eq("user_id", p.id);
    if (error) { toast.error("Não foi possível revogar: " + error.message); return; }
    await audit("plan.revoked", { target_user_id: p.id, target_email: p.email });
    await qc.invalidateQueries({ queryKey: ["admin-subscriptions"] });
    toast.success(`${p.email ?? "Conta"} voltou ao plano grátis.`);
  };

  const webhookUrl = typeof window !== "undefined" ? `${window.location.origin}/api/public/mercadopago-webhook` : "";
  const filtered = profiles.filter((p) => (p.email ?? "" + p.display_name).toLowerCase().includes(query.toLowerCase()));
  const num = (k: keyof typeof f) => ({ value: f[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: Number(e.target.value) })) });

  return (
    <section className="mb-5 space-y-5">
      <div className="flex items-center gap-2">
        <Crown className="h-4 w-4 text-vio" />
        <h2 className="text-[15px] font-semibold text-lav">Monetização · Planos Pro e Ultra</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={<Crown className="h-4 w-4" />} label="Assinantes Pro / Ultra" value={`${activePro.length - ultraCount} / ${ultraCount}`} />
        <Stat icon={<Percent className="h-4 w-4" />} label="Conversão Pro" value={`${conversion}%`} />
        <Stat icon={<Wallet className="h-4 w-4" />} label="Receita mensal estimada" value={brl(mrr)} />
        <Stat icon={<Gift className="h-4 w-4" />} label="Cortesias manuais" value={manual} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <GlassCard>
          <h3 className="text-[14px] font-semibold text-lav">Preços e limites dos planos</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Pro · preço mensal (R$)"><input type="number" step="0.01" min="1" className={fieldClass} {...num("pro_price_monthly")} /></Field>
            <Field label={`Pro · preço anual (R$) · economia ${Math.max(0, Math.round((1 - f.pro_price_yearly / (f.pro_price_monthly * 12 || 1)) * 100))}%`}><input type="number" step="0.01" min="1" className={fieldClass} {...num("pro_price_yearly")} /></Field>
            <Field label="Mensagens/dia · Grátis"><input type="number" min="0" className={fieldClass} {...num("free_daily_limit")} /></Field>
            <Field label="Mensagens/dia · Pro"><input type="number" min="0" className={fieldClass} {...num("pro_daily_limit")} /></Field>
            <Field label="Tokens por resposta · Grátis"><input type="number" min="128" className={fieldClass} {...num("free_max_tokens")} /></Field>
            <Field label="Tokens por resposta · Pro"><input type="number" min="128" className={fieldClass} {...num("pro_max_tokens")} /></Field>
            <Field label="Ultra · preço mensal (R$)"><input type="number" step="0.01" min="1" className={fieldClass} {...num("ultra_price_monthly")} /></Field>
            <Field label="Ultra · preço anual (R$)"><input type="number" step="0.01" min="1" className={fieldClass} {...num("ultra_price_yearly")} /></Field>
            <Field label="Mensagens/dia · Ultra"><input type="number" min="0" className={fieldClass} {...num("ultra_daily_limit")} /></Field>
            <Field label="Tokens por resposta · Ultra"><input type="number" min="128" className={fieldClass} {...num("ultra_max_tokens")} /></Field>
            <Field label="Dias de teste grátis do Pro (0 = sem teste)"><input type="number" min="0" className={fieldClass} {...num("trial_days")} /></Field>
          </div>
          <p className="mt-5 text-[11px] text-lav/50">Módulos por plano (toque para alternar: livre → Pro → Ultra)</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {MODULES.filter((m) => !m.core).map((m) => {
              const ultra = ultraModules.includes(m.key);
              const on = !ultra && proModules.includes(m.key);
              const cycleTier = () => {
                if (ultra) { setUltraModules((p) => p.filter((k) => k !== m.key)); }
                else if (on) { setProModules((p) => p.filter((k) => k !== m.key)); setUltraModules((p) => [...p, m.key]); }
                else setProModules((p) => [...p, m.key]);
              };
              return (
                <button key={m.key} type="button" onClick={cycleTier}
                  className={cn("rounded-full px-3 py-1 text-[11px] ring-1 transition", ultra ? "bg-amber-200/15 text-amber-100 ring-amber-200/50" : on ? "bg-vio/30 text-lav ring-vio/60" : "text-lav/50 ring-lav/15 hover:text-lav")}>
                  {ultra ? "ULTRA · " : on ? "PRO · " : ""}{m.short}
                </button>
              );
            })}
          </div>
          <button className={primaryButton + " mt-5"} onClick={() => void savePolicy()}>Salvar políticas dos planos</button>
        </GlassCard>

        <GlassCard>
          <h3 className="text-[14px] font-semibold text-lav">Gateway de pagamento · Mercado Pago</h3>
          <p className="mt-2 text-[12px] text-lav/55">Pagamentos aprovados ativarão o Pro automaticamente. A conexão será feita na etapa final.</p>
          <div className="mt-4 flex items-center gap-2 rounded-xl px-3 py-2 ring-1 ring-amber-200/30">
            <span className="h-2 w-2 rounded-full bg-amber-300" />
            <span className="text-[12px] text-lav/75">Aguardando conexão</span>
          </div>
          <p className="mt-4 text-[11px] text-lav/50">Endereço de notificação (para colar no Mercado Pago)</p>
          <div className="mt-2 flex gap-2">
            <code className="min-w-0 flex-1 truncate rounded-xl px-3 py-2 font-mono text-[11px] text-lav/70 ring-1 ring-lav/10">{webhookUrl}</code>
            <button className={pillButton} onClick={() => { void navigator.clipboard.writeText(webhookUrl); toast.success("Endereço copiado."); }} aria-label="Copiar endereço"><Copy className="h-3.5 w-3.5" /></button>
          </div>
          <p className="mt-4 text-[11px] text-lav/40">As chaves do Mercado Pago ficarão guardadas com segurança no servidor, nunca nesta tela.</p>
        </GlassCard>
      </div>

      <GlassCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-[14px] font-semibold text-lav">Planos das contas</h3>
          <input className={fieldClass + " max-w-xs"} placeholder="Buscar por e-mail" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="mt-3 space-y-2">
          {filtered.map((p) => {
            const s = byUser.get(p.id);
            const pro = isActivePro(s);
            const admin = admins.data?.has(p.id);
            return (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-3 py-2 ring-1 ring-lav/10">
                <div className="min-w-0">
                  <p className="truncate text-[12px] text-lav/80">{p.display_name || p.email}</p>
                  <p className="text-[10px] text-lav/40">{p.email}{pro && ` · ${s?.provider === "manual" ? "Cortesia" : "Assinatura"} · ${s?.current_period_end ? "até " + new Date(s.current_period_end).toLocaleDateString("pt-BR") : "vitalício"}`}</p>
                </div>
                <div className="flex items-center gap-2">
                  {admin && <Badge className="text-amber-200 ring-amber-200/40">ADMIN</Badge>}
                  {pro && s?.plan === "ultra" ? <Badge className="bg-amber-200/15 text-amber-100 ring-amber-200/50">ULTRA</Badge> : pro ? <Badge className="bg-vio/30 text-lav ring-vio/60">PRO</Badge> : <Badge className="text-lav/50 ring-lav/20">GRÁTIS</Badge>}
                  {pro
                    ? <button className={pillButton} onClick={() => void revoke(p)}>Revogar</button>
                    : <button className={pillButton} onClick={() => { setTarget(p); setDays(30); setTier("pro"); }}>Ativar plano</button>}
                </div>
                {target?.id === p.id && (
                  <div className="w-full space-y-3 rounded-xl p-3 ring-1 ring-vio/40">
                    <div className="flex flex-wrap gap-2">
                      {(["pro", "ultra"] as const).map((k) => (
                        <button key={k} type="button" onClick={() => setTier(k)}
                          className={cn("rounded-full px-3 py-1 text-[11px] ring-1", tier === k ? "bg-vio/30 text-lav ring-vio/60" : "text-lav/55 ring-lav/15")}>{k === "pro" ? "Pro" : "Ultra"}</button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {DURATIONS.map((d) => (
                        <button key={d.label} type="button" onClick={() => setDays(d.days)}
                          className={cn("rounded-full px-3 py-1 text-[11px] ring-1", days === d.days ? "bg-vio/30 text-lav ring-vio/60" : "text-lav/55 ring-lav/15")}>{d.label}</button>
                      ))}
                    </div>
                    <input className={fieldClass} placeholder="Motivo (ex.: parceiro, equipe, beta tester)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
                    <div className="flex gap-2">
                      <button className={primaryButton} onClick={() => void grant()}>Confirmar ativação</button>
                      <button className={pillButton} onClick={() => setTarget(null)}>Cancelar</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && <p className="text-[11px] text-lav/40">Nenhuma conta encontrada.</p>}
        </div>
      </GlassCard>
    </section>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return <GlassCard><div className="flex items-center gap-2 text-vio">{icon}<span className="text-[10px] text-lav/45">{label}</span></div><p className="mt-3 truncate font-mono text-xl text-lav">{value}</p></GlassCard>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-[11px] text-lav/55"><span className="mb-2 block">{label}</span>{children}</label>;
}
function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={cn("rounded-full px-2 py-0.5 font-mono text-[10px] ring-1", className)}>{children}</span>;
}
