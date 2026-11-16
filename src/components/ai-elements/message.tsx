"use client";

import { Button } from "@/components/ui/button";
import {
  ButtonGroup,
  ButtonGroupText,
} from "@/components/ui/button-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { reportsStore, tasksStore } from "@/lib/data";
import { playerStore, controlHudPlayer } from "@/lib/hud-player";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowUpRight, Clipboard, ExternalLink, FileText, ListTodo, Music2, Navigation } from "lucide-react";
import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import type { UIMessage } from "ai";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { ComponentProps, HTMLAttributes, ReactElement } from "react";
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Streamdown } from "streamdown";


export function ToolInvocationCard({ part }: { part: unknown }) {
  const navigate = useNavigate();
  const p = part as {type?:string;state?:string;input?:Record<string,unknown>;output?:Record<string,unknown>};
  if (!p.type?.startsWith("tool-")) return null;
  const name=p.type.slice(5), input=p.input??{}, output=p.output??{};
  const failed=output.ok===false;
  const labels:Record<string,string>={navegar_modulo:"Navegação",abrir_aba_externa:"Link externo",gerar_relatorio:"Relatório gerado",controlar_player_hud:"Player HUD",adicionar_tarefa:"Tarefa criada"};
  const Icon=name==="navegar_modulo"?Navigation:name==="gerar_relatorio"?FileText:name==="adicionar_tarefa"?ListTodo:name==="controlar_player_hud"?Music2:ArrowUpRight;
  const title=String(input.titulo??input.modulo??labels[name]??"Ação TUNAVI");
  return <div className="my-2 w-full max-w-md rounded-xl border border-vio/30 bg-[#0B0813]/80 p-3 shadow-[0_0_24px_rgba(124,58,237,.10)] backdrop-blur">
    <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-lav"/><span className="text-[12px] font-semibold text-lav">{labels[name]??"Ação TUNAVI"}</span><span className="ml-auto font-mono text-[9px] uppercase text-lav/45">{failed?"falhou":output.requiresUserAction?"aguardando clique":p.state==="output-available"?"concluída":"em execução"}</span></div>
    <p className="mt-2 truncate text-[12px] text-lav/75">{title}</p>
    {name==="navegar_modulo"&&p.state==="output-available"&&<button className="mt-2 inline-flex items-center gap-1 text-[11px] text-lav underline" onClick={()=>void navigate({to:String(output.path??"/") as never})}>Abrir módulo <ArrowUpRight className="h-3 w-3"/></button>}
    {name==="abrir_aba_externa"&&p.state==="output-available"&&<button className="mt-2 inline-flex items-center gap-1 rounded-lg bg-vio/25 px-2.5 py-1.5 text-[11px] text-lav" onClick={()=>{const url=new URL(String(input.url));if(["https:","http:"].includes(url.protocol)){window.open(url.toString(),"_blank","noopener,noreferrer");}}}>Abrir em nova aba <ExternalLink className="h-3 w-3"/></button>}
    {name==="gerar_relatorio"&&p.state==="output-available"&&<div className="mt-2 flex gap-2"><button className="rounded-lg bg-vio/25 px-2.5 py-1.5 text-[11px] text-lav" onClick={()=>void navigate({to:"/pesquisa" as never})}>Visualizar relatório</button><button className="inline-flex items-center gap-1 rounded-lg border border-lav/20 px-2.5 py-1.5 text-[11px] text-lav/75" onClick={()=>{const r=reportsStore.get().find(x=>x.id===output.id);if(r){void navigator.clipboard.writeText(r.content);toast.success("Relatório copiado.");}}}><Clipboard className="h-3 w-3"/> Copiar</button></div>}
    {name==="adicionar_tarefa"&&p.state==="output-available"&&<label className="mt-2 flex items-center gap-2 text-[11px] text-lav/65"><input type="checkbox" checked={tasksStore.get().find(t=>t.id===output.id)?.status==="done"} onChange={(e)=>tasksStore.set(prev=>prev.map(t=>t.id===output.id?{...t,status:e.target.checked?"done":"todo"}:t))}/> Marcar tarefa como concluída <span className="ml-auto rounded-full bg-vio/20 px-2 py-0.5 uppercase">{String(input.prioridade??"media")}</span></label>}
    {name==="controlar_player_hud"&&<div className="mt-2 flex gap-2"><button className="rounded-lg bg-vio/25 px-2.5 py-1.5 text-[11px] text-lav" onClick={()=>void controlHudPlayer(input as {acao:"tocar"|"pausar"|"proxima"|"anterior"|"volume";estilo?:"foco_lofi"|"synthwave"|"cyber_ambient"|"chuva_estudio";volume?:number}).then(()=>toast.success("Player atualizado.")).catch(()=>toast.error("Não foi possível iniciar o áudio."))}>Aplicar controle</button></div>}
    {failed&&<p className="mt-2 text-[11px] text-red-300">{String(output.error??"Não foi possível executar.")}</p>}
  </div>;
}

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: UIMessage["role"];
};

export const Message = ({ className, from, ...props }: MessageProps) => (
  <div
    className={cn(
      "group flex w-full max-w-[95%] flex-col gap-2",
      from === "user" ? "is-user ml-auto justify-end" : "is-assistant",
      className
    )}
    {...props}
  />
);

export type MessageContentProps = HTMLAttributes<HTMLDivElement>;

export const MessageContent = ({
  children,
  className,
  ...props
}: MessageContentProps) => (
  <div
    className={cn(
      "is-user:dark flex w-fit min-w-0 max-w-full flex-col gap-2 overflow-hidden text-sm",
      "group-[.is-user]:ml-auto group-[.is-user]:rounded-lg group-[.is-user]:bg-secondary group-[.is-user]:px-4 group-[.is-user]:py-3 group-[.is-user]:text-foreground",
      "group-[.is-assistant]:text-foreground",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export type MessageActionsProps = ComponentProps<"div">;

export const MessageActions = ({
  className,
  children,
  ...props
}: MessageActionsProps) => (
  <div className={cn("flex items-center gap-1", className)} {...props}>
    {children}
  </div>
);

export type MessageActionProps = ComponentProps<typeof Button> & {
  tooltip?: string;
  label?: string;
};

export const MessageAction = ({
  tooltip,
  children,
  label,
  variant = "ghost",
  size = "icon-sm",
  ...props
}: MessageActionProps) => {
  const button = (
    <Button size={size} type="button" variant={variant} {...props}>
      {children}
      <span className="sr-only">{label || tooltip}</span>
    </Button>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
};

interface MessageBranchContextType {
  currentBranch: number;
  totalBranches: number;
  goToPrevious: () => void;
  goToNext: () => void;
  branches: ReactElement[];
  setBranches: (branches: ReactElement[]) => void;
}

const MessageBranchContext = createContext<MessageBranchContextType | null>(
  null
);

const useMessageBranch = () => {
  const context = useContext(MessageBranchContext);

  if (!context) {
    throw new Error(
      "MessageBranch components must be used within MessageBranch"
    );
  }

  return context;
};

export type MessageBranchProps = HTMLAttributes<HTMLDivElement> & {
  defaultBranch?: number;
  onBranchChange?: (branchIndex: number) => void;
};

export const MessageBranch = ({
  defaultBranch = 0,
  onBranchChange,
  className,
  ...props
}: MessageBranchProps) => {
  const [currentBranch, setCurrentBranch] = useState(defaultBranch);
  const [branches, setBranches] = useState<ReactElement[]>([]);

  const handleBranchChange = useCallback(
    (newBranch: number) => {
      setCurrentBranch(newBranch);
      onBranchChange?.(newBranch);
    },
    [onBranchChange]
  );

  const goToPrevious = useCallback(() => {
    const newBranch =
      currentBranch > 0 ? currentBranch - 1 : branches.length - 1;
    handleBranchChange(newBranch);
  }, [currentBranch, branches.length, handleBranchChange]);

  const goToNext = useCallback(() => {
    const newBranch =
      currentBranch < branches.length - 1 ? currentBranch + 1 : 0;
    handleBranchChange(newBranch);
  }, [currentBranch, branches.length, handleBranchChange]);

  const contextValue = useMemo<MessageBranchContextType>(
    () => ({
      branches,
      currentBranch,
      goToNext,
      goToPrevious,
      setBranches,
      totalBranches: branches.length,
    }),
    [branches, currentBranch, goToNext, goToPrevious]
  );

  return (
    <MessageBranchContext.Provider value={contextValue}>
      <div
        className={cn("grid w-full gap-2 [&>div]:pb-0", className)}
        {...props}
      />
    </MessageBranchContext.Provider>
  );
};

export type MessageBranchContentProps = HTMLAttributes<HTMLDivElement>;

export const MessageBranchContent = ({
  children,
  ...props
}: MessageBranchContentProps) => {
  const { currentBranch, setBranches, branches } = useMessageBranch();
  const childrenArray = useMemo(
    () => (Array.isArray(children) ? children : [children]),
    [children]
  );

  // Use useEffect to update branches when they change
  useEffect(() => {
    if (branches.length !== childrenArray.length) {
      setBranches(childrenArray);
    }
  }, [childrenArray, branches, setBranches]);

  return childrenArray.map((branch, index) => (
    <div
      className={cn(
        "grid gap-2 overflow-hidden [&>div]:pb-0",
        index === currentBranch ? "block" : "hidden"
      )}
      key={branch.key}
      {...props}
    >
      {branch}
    </div>
  ));
};

export type MessageBranchSelectorProps = ComponentProps<typeof ButtonGroup>;

export const MessageBranchSelector = ({
  className,
  ...props
}: MessageBranchSelectorProps) => {
  const { totalBranches } = useMessageBranch();

  // Don't render if there's only one branch
  if (totalBranches <= 1) {
    return null;
  }

  return (
    <ButtonGroup
      className={cn(
        "[&>*:not(:first-child)]:rounded-l-md [&>*:not(:last-child)]:rounded-r-md",
        className
      )}
      orientation="horizontal"
      {...props}
    />
  );
};

export type MessageBranchPreviousProps = ComponentProps<typeof Button>;

export const MessageBranchPrevious = ({
  children,
  ...props
}: MessageBranchPreviousProps) => {
  const { goToPrevious, totalBranches } = useMessageBranch();

  return (
    <Button
      aria-label="Previous branch"
      disabled={totalBranches <= 1}
      onClick={goToPrevious}
      size="icon-sm"
      type="button"
      variant="ghost"
      {...props}
    >
      {children ?? <ChevronLeftIcon size={14} />}
    </Button>
  );
};

export type MessageBranchNextProps = ComponentProps<typeof Button>;

export const MessageBranchNext = ({
  children,
  ...props
}: MessageBranchNextProps) => {
  const { goToNext, totalBranches } = useMessageBranch();

  return (
    <Button
      aria-label="Next branch"
      disabled={totalBranches <= 1}
      onClick={goToNext}
      size="icon-sm"
      type="button"
      variant="ghost"
      {...props}
    >
      {children ?? <ChevronRightIcon size={14} />}
    </Button>
  );
};

export type MessageBranchPageProps = HTMLAttributes<HTMLSpanElement>;

export const MessageBranchPage = ({
  className,
  ...props
}: MessageBranchPageProps) => {
  const { currentBranch, totalBranches } = useMessageBranch();

  return (
    <ButtonGroupText
      className={cn(
        "border-none bg-transparent text-muted-foreground shadow-none",
        className
      )}
      {...props}
    >
      {currentBranch + 1} of {totalBranches}
    </ButtonGroupText>
  );
};

export type MessageResponseProps = ComponentProps<typeof Streamdown>;

const streamdownPlugins = { cjk, code, math, mermaid };

export const MessageResponse = memo(
  ({ className, ...props }: MessageResponseProps) => (
    <Streamdown
      className={cn(
        "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className
      )}
      plugins={streamdownPlugins}
      {...props}
    />
  ),
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    nextProps.isAnimating === prevProps.isAnimating
);

MessageResponse.displayName = "MessageResponse";

export type MessageToolbarProps = ComponentProps<"div">;

export const MessageToolbar = ({
  className,
  children,
  ...props
}: MessageToolbarProps) => (
  <div
    className={cn(
      "mt-4 flex w-full items-center justify-between gap-4",
      className
    )}
    {...props}
  >
    {children}
  </div>
);
