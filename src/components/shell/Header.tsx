import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, Crown, LogIn, LogOut, Menu, Settings2, Sparkles, Volume2, VolumeX } from "lucide-react";
import avatar from "@/assets/user-avatar.jpg";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { noticesStore, prefsStore, formatTime } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { playSound } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { Clock } from "./Clock";
import { AudioLines, Pause, Play } from "lucide-react";
import { currentTrackTitle, playerStore, controlHudPlayer } from "@/lib/hud-player";

export function Header({ onOpenNav }: { onOpenNav: () => void }) {
  const prefs = prefsStore.useValue();
  const player = playerStore.useValue();
  const notices = noticesStore.useValue();
  const unread = notices.filter((n) => !n.read).length;
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-lav/10 px-4 glass sm:gap-6 sm:px-6">
      <button
        type="button"
        onClick={onOpenNav}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lav/70 ring-1 ring-lav/10 hover:bg-lav/5 lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="h-4 w-4" />
      </button>
      <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="TUNAVI — Visão geral">
        <span className="h-7 w-7 rounded-full orb-gradient" style={{ animation: "holo-breathe 5s ease-in-out infinite" }} />
        <span className="text-[15px] font-semibold tracking-[0.28em] text-lav">TUNAVI</span>
      </Link>
      <p className="hidden min-w-0 truncate border-l border-lav/15 pl-5 text-[12px] text-lav/50 md:block">
        Sua inteligência. Seu mundo. Suas possibilidades.
      </p>

      <div className="ml-auto flex items-center gap-2 sm:gap-4">

        <div className="hidden items-center gap-2 rounded-full border border-vio/30 bg-vio/10 px-2 py-1.5 md:flex" title="Player ambiente da TUNAVI">
          <AudioLines className={cn("h-4 w-4 text-lav", player.playing && "animate-pulse")} />
          <div className="hidden min-w-[88px] xl:block">
            <p className="font-mono text-[9px] uppercase tracking-wider text-lav/80">{currentTrackTitle(player)}</p>
            <div className="mt-1 flex h-2 items-center gap-[2px]">
              {Array.from({length:12},(_,i)=><span key={i} className="w-[2px] rounded-full bg-lav/80" style={{height:player.playing?`${3+(i*7)%8}px`:"3px",animation:player.playing?`holo-bar ${.35+(i%4)*.12}s ease-in-out infinite`:undefined}}/>)}
            </div>
          </div>
          <select aria-label="Estilo de áudio" value={player.style} onChange={(e)=>void controlHudPlayer({acao:"tocar",estilo:e.target.value as typeof player.style})} className="max-w-[88px] bg-transparent text-[10px] text-lav outline-none">
            <option className="bg-ink" value="foco_lofi">Lo-Fi</option><option className="bg-ink" value="synthwave">Synthwave</option><option className="bg-ink" value="cyber_ambient">Cyber</option><option className="bg-ink" value="chuva_estudio">Chuva</option>
          </select>
          <button type="button" aria-label={player.playing?"Pausar áudio":"Tocar áudio"} onClick={()=>void controlHudPlayer({acao:player.playing?"pausar":"tocar"})} className="grid h-6 w-6 place-items-center rounded-full text-lav hover:bg-lav/10">{player.playing?<Pause className="h-3.5 w-3.5"/>:<Play className="h-3.5 w-3.5"/>}</button>
        </div>

        <button
          type="button"
          onClick={() => {
            prefsStore.set((p) => ({ ...p, sound: !p.sound }));
            if (!prefs.sound) setTimeout(() => playSound("on"), 0);
          }}
          className="grid h-9 w-9 place-items-center rounded-full text-lav/55 hover:bg-lav/5 hover:text-lav"
          aria-label={prefs.sound ? "Silenciar sons da interface" : "Ativar sons da interface"}
          aria-pressed={!prefs.sound}
          title={prefs.sound ? "Sons ativados" : "Sons silenciados"}
        >
          {prefs.sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="relative grid h-9 w-9 place-items-center rounded-full text-lav/55 hover:bg-lav/5 hover:text-lav"
              aria-label={`Notificações${unread ? `, ${unread} não lidas` : ""}`}
            >
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-vio px-1 font-mono text-[9px] text-primary-foreground">
                  {unread}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 border-lav/15 p-0 glass">
            <div className="flex items-center justify-between border-b border-lav/10 px-4 py-3">
              <p className="text-[13px] font-semibold text-lav">Notificações</p>
              {unread > 0 && (
                <button
                  className="text-[11px] text-lav/60 hover:text-lav"
                  onClick={() => noticesStore.set((prev) => prev.map((n) => ({ ...n, read: true })))}
                >
                  Marcar todas como lidas
                </button>
              )}
            </div>
            <ul className="max-h-80 overflow-y-auto">
              {notices.length === 0 && <li className="px-4 py-6 text-center text-[12px] text-lav/50">Nenhuma notificação.</li>}
              {notices.map((n) => (
                <li key={n.id} className={cn("border-b border-lav/5 px-4 py-3 last:border-0", !n.read && "bg-vio/10")}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[13px] text-lav/90">{n.title}</p>
                    <span className="shrink-0 font-mono text-[10px] text-lav/40">{formatTime(n.at)}</span>
                  </div>
                  <p className="mt-0.5 text-[12px] text-lav/55">{n.body}</p>
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>

        <div className="hidden sm:block">
          <Clock />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="relative shrink-0 rounded-full" aria-label="Menu do perfil">
              <img src={avatar} alt="" width={36} height={36} className="h-9 w-9 rounded-full object-cover ring-1 ring-vio/60" />
              {isAdmin && (
                <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-vio ring-2 ring-ink">
                  <Crown className="h-2.5 w-2.5 text-primary-foreground" />
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60 border-lav/15 glass">
            <DropdownMenuLabel className="font-normal">
              <p className="text-[13px] text-lav">{prefs.name || (user ? user.email?.split("@")[0] : "Visitante")}</p>
              <p className="truncate font-mono text-[10px] text-lav/50">{user?.email ?? "Dados salvos neste navegador"}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-lav/10" />
            {isAdmin && (
              <DropdownMenuItem onSelect={() => navigate({ to: "/super-painel" })} className="text-lav">
                <Crown className="h-4 w-4 text-vio" /> Super Painel
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={() => navigate({ to: "/planos" })} className="text-lav">
              <Sparkles className="h-4 w-4 text-vio" /> Planos e TUNAVI Pro
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate({ to: "/configuracoes" })}>
              <Settings2 className="h-4 w-4" /> Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-lav/10" />
            {user ? (
              <DropdownMenuItem
                onSelect={async () => {
                  await signOut();
                  playSound("off");
                  navigate({ to: "/", replace: true });
                }}
              >
                <LogOut className="h-4 w-4" /> Sair
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={() => navigate({ to: "/entrar" })}>
                <LogIn className="h-4 w-4" /> Entrar
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
