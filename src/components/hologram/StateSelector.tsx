import { cn } from "@/lib/utils";
import { ASSISTANT_STATES, setManualState, useAssistantState } from "@/lib/assistant";
import { playSound } from "@/lib/sound";

/** Quick selector to preview each hologram state live. */
export function StateSelector({ className }: { className?: string }) {
  const { state, manual, live } = useAssistantState();
  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-1.5", className)} role="radiogroup" aria-label="Estado do assistente">
      {ASSISTANT_STATES.map((s) => {
        const active = (manual ?? "repouso") === s.key;
        return (
          <button
            key={s.key}
            type="button"
            role="radio"
            aria-checked={active}
            title={s.hint}
            disabled={live}
            onClick={() => {
              playSound("tap");
              setManualState(s.key === "repouso" ? null : s.key);
            }}
            className={cn(
              "h-7 rounded-full px-3 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors disabled:opacity-40",
              active ? "bg-vio/25 text-lav ring-1 ring-vio/50" : "text-lav/50 ring-1 ring-lav/10 hover:bg-lav/5 hover:text-lav/80",
              live && state === s.key && "bg-vio/25 text-lav ring-1 ring-vio/50 opacity-100",
            )}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}
