import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { isModuleEnabled, useAppSettings } from "@/lib/settings";
import { moduleByKey, type ModuleKey } from "@/lib/modules";

export function GlassCard({
  className,
  children,
  as: As = "section",
  ...rest
}: { className?: string; children: ReactNode; as?: "section" | "div" | "article" } & React.HTMLAttributes<HTMLElement>) {
  return (
    <As className={cn("rounded-[20px] p-5 ring-1 ring-lav/15 glass", className)} {...rest}>
      {children}
    </As>
  );
}

export function CardTitle({ children, aside, className }: { children: ReactNode; aside?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3", className)}>
      <h3 className="text-[14px] font-semibold text-lav">{children}</h3>
      {aside && <div className="shrink-0 font-mono text-[11px] text-lav/50">{aside}</div>}
    </div>
  );
}

export function PageHeader({
  module,
  title,
  description,
  actions,
}: {
  module?: ModuleKey;
  title?: string;
  description?: string;
  actions?: ReactNode;
}) {
  const def = module ? moduleByKey(module) : null;
  const Icon = def?.icon;
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {Icon && (
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-vio/15 text-lav ring-1 ring-vio/40">
            <Icon className="h-5 w-5" strokeWidth={1.6} />
          </span>
        )}
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-lav/40">TUNAVI · Módulo</p>
          <h1 className="truncate text-xl font-semibold text-lav sm:text-2xl">{title ?? def?.label}</h1>
          {(description ?? def?.description) && <p className="mt-0.5 text-[13px] text-lav/55">{description ?? def?.description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function ExampleBadge({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex h-5 items-center rounded-full bg-lav/10 px-2 font-mono text-[9px] uppercase tracking-[0.16em] text-lav/55", className)}>
      Exemplo
    </span>
  );
}

export function DevBadge({ className, children = "Em desenvolvimento" }: { className?: string; children?: ReactNode }) {
  return (
    <span className={cn("inline-flex h-5 items-center gap-1 rounded-full bg-warning/10 px-2 font-mono text-[9px] uppercase tracking-[0.14em] text-warning ring-1 ring-warning/25", className)}>
      {children}
    </span>
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[20px] border border-dashed border-lav/15 px-6 py-12 text-center">
      {icon && <div className="text-lav/40">{icon}</div>}
      <div>
        <p className="text-[14px] font-medium text-lav/85">{title}</p>
        {description && <p className="mt-1 max-w-sm text-[13px] text-lav/50">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageContainer({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[1200px] px-4 pb-16 pt-6 sm:px-6 lg:px-10", className)}>{children}</div>;
}

/** Shows a locked notice when the Super Painel switched this module off. */
export function ModuleGate({ module, children }: { module: ModuleKey; children: ReactNode }) {
  const { data, isLoading, error, refetch } = useAppSettings();
  if (isLoading) return <PageContainer><div className="mx-auto mt-16 max-w-md"><GlassCard className="text-center"><p className="font-mono text-[11px] uppercase tracking-[0.2em] text-lav/45">TUNAVI · HUD</p><p className="mt-3 text-[13px] text-lav/65">Verificando disponibilidade do módulo…</p></GlassCard></div></PageContainer>;
  if (error || !data) return <PageContainer><div className="mx-auto mt-16 max-w-md"><GlassCard className="text-center"><Lock className="mx-auto h-8 w-8 text-warning"/><h1 className="mt-4 text-lg font-semibold text-lav">Não foi possível validar o acesso</h1><p className="mt-2 text-[13px] text-lav/55">As configurações da plataforma não estão disponíveis. O módulo permanece bloqueado até a validação ser concluída.</p><button onClick={()=>void refetch()} className="mt-5 inline-flex h-9 items-center rounded-full px-4 text-[12px] text-lav/80 ring-1 ring-lav/20 hover:bg-vio/20">Tentar novamente</button></GlassCard></div></PageContainer>;
  if (!isModuleEnabled(data, module)) {
    const def = moduleByKey(module);
    return (
      <PageContainer>
        <div className="mx-auto mt-16 max-w-md">
          <GlassCard className="text-center">
            <Lock className="mx-auto h-8 w-8 text-lav/50" />
            <h1 className="mt-4 text-lg font-semibold text-lav">{def.label} está desativado</h1>
            <p className="mt-2 text-[13px] text-lav/55">O administrador desativou este módulo temporariamente.</p>
            <Link to="/" className="mt-5 inline-flex h-9 items-center rounded-full px-4 text-[12px] text-lav/80 ring-1 ring-lav/20 hover:bg-vio/20">
              Voltar à visão geral
            </Link>
          </GlassCard>
        </div>
      </PageContainer>
    );
  }
  return <>{children}</>;
}

export const fieldClass =
  "w-full rounded-xl bg-ink/60 px-3.5 py-2.5 text-[13px] text-foreground ring-1 ring-lav/15 placeholder:text-lav/35 focus:outline-none focus:ring-vio/60";

export const pillButton =
  "inline-flex h-9 items-center justify-center gap-2 rounded-full px-4 text-[12px] text-lav/80 ring-1 ring-lav/20 transition-colors hover:bg-vio/20 disabled:opacity-50";

export const primaryButton =
  "inline-flex h-9 items-center justify-center gap-2 rounded-full bg-vio px-4 text-[12px] font-medium text-primary-foreground transition hover:brightness-110 disabled:opacity-50 glow";
