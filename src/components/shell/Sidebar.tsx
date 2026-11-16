import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronsLeft, ChevronsRight, Crown } from "lucide-react";
import { MODULES, type ModuleDef } from "@/lib/modules";
import { isModuleEnabled, useAppSettings } from "@/lib/settings";
import { useAuth } from "@/lib/auth";
import { playSound } from "@/lib/sound";
import { cn } from "@/lib/utils";

function isActive(path: string, current: string) {
  return path === "/" ? current === "/" : current === path || current.startsWith(`${path}/`);
}

function NavItem({ m, collapsed, current, onNavigate }: { m: ModuleDef; collapsed: boolean; current: string; onNavigate?: (() => void) | undefined }) {
  const active = isActive(m.path, current);
  const Icon = m.icon;
  return (
    <Link
      to={m.path}
      onClick={() => {
        playSound("tap");
        onNavigate?.();
      }}
      title={collapsed ? m.label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-10 shrink-0 items-center gap-3 rounded-xl px-3 text-[13px] transition-colors",
        active ? "bg-vio/20 text-lav ring-1 ring-vio/40" : "text-lav/55 hover:bg-lav/5 hover:text-lav/85",
        collapsed && "justify-center px-0",
      )}
    >
      <Icon className="h-[17px] w-[17px] shrink-0" strokeWidth={1.5} />
      {!collapsed && <span className="truncate">{m.short}</span>}
    </Link>
  );
}

export function SidebarNav({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const current = useRouterState({ select: (s) => s.location.pathname });
  const { data } = useAppSettings();
  const { isAdmin } = useAuth();
  const items = MODULES.filter((m) => m.key !== "configuracoes" && isModuleEnabled(data, m.key));
  const settings = MODULES.find((m) => m.key === "configuracoes")!;
  return (
    <nav aria-label="Módulos" className="flex min-h-0 flex-1 flex-col gap-1">
      <div className="no-scrollbar flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {items.map((m) => (
          <NavItem key={m.key} m={m} collapsed={collapsed} current={current} onNavigate={onNavigate} />
        ))}
      </div>
      <div className="mt-2 flex flex-col gap-1 pt-2">
        {isAdmin && (
          <Link
            to="/super-painel"
            onClick={onNavigate}
            title={collapsed ? "Super Painel" : undefined}
            className={cn(
              "flex h-10 items-center gap-3 rounded-xl px-3 text-[13px] transition-colors",
              isActive("/super-painel", current) ? "bg-vio/20 text-lav ring-1 ring-vio/40" : "text-vio hover:bg-vio/10",
              collapsed && "justify-center px-0",
            )}
          >
            <Crown className="h-[17px] w-[17px] shrink-0" strokeWidth={1.5} />
            {!collapsed && <span>Super Painel</span>}
          </Link>
        )}
        {isModuleEnabled(data, settings.key) && <NavItem m={settings} collapsed={collapsed} current={current} onNavigate={onNavigate} />}
      </div>
    </nav>
  );
}

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <aside
      className={cn(
        "sticky top-16 hidden h-[calc(100dvh-4rem)] shrink-0 flex-col border-r border-lav/10 px-3 py-5 transition-[width] duration-300 lg:flex",
        collapsed ? "w-[68px]" : "w-[208px]",
      )}
    >
      <SidebarNav collapsed={collapsed} />
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "mt-2 flex h-8 items-center gap-2 rounded-lg px-3 font-mono text-[10px] uppercase tracking-[0.15em] text-lav/35 hover:text-lav/70",
          collapsed && "justify-center px-0",
        )}
        aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
      >
        {collapsed ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" /> Recolher</>}
      </button>
    </aside>
  );
}
