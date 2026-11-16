import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowUp, Mic, MicOff } from "lucide-react";
import { getChat } from "@/lib/chat-client";
import { useSpeechInput } from "@/lib/voice";
import { playSound } from "@/lib/sound";
import { useAssistantState } from "@/lib/assistant";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const BARS = [2, 4, 6, 3, 5, 1.5, 5, 3, 6, 4, 2];

/** The dashboard's pill composer: type or speak, then continue in Conversar. */
export function QuickComposer({ className }: { className?: string }) {
  const [text, setText] = useState("");
  const navigate = useNavigate();
  const { state } = useAssistantState();
  const send = (value: string) => {
    const v = value.trim();
    if (!v) return;
    playSound("send");
    void getChat().sendMessage({ text: v });
    setText("");
    navigate({ to: "/conversar" });
  };
  const mic = useSpeechInput((t) => send(t));
  const animated = mic.listening || state === "respondendo";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send(text);
      }}
      className={cn("flex h-16 w-full max-w-[640px] items-center gap-3 rounded-full pl-6 pr-2 ring-1 ring-lav/15 glass float-shadow sm:gap-4", className)}
    >
      <label htmlFor="quick-ask" className="sr-only">
        Pergunte ou peça algo ao TUNAVI
      </label>
      <input
        id="quick-ask"
        value={mic.listening ? mic.interim || text : text}
        onChange={(e) => setText(e.target.value)}
        placeholder={mic.listening ? "Ouvindo…" : "Pergunte ou peça algo ao TUNAVI…"}
        className="min-w-0 flex-1 bg-transparent text-[14px] text-foreground placeholder:text-lav/40 focus:outline-none"
        autoComplete="off"
      />
      <div className="hidden h-6 items-center gap-[3px] sm:flex" aria-hidden>
        {BARS.map((h, i) => (
          <span
            key={i}
            className={cn("w-[2px] origin-center rounded", i === 3 || i === 7 ? "bg-vio" : h < 2 ? "mx-1 bg-lav/20" : "bg-lav/70")}
            style={{
              height: `${h * 4}px`,
              animation: animated ? `holo-bar ${0.5 + (i % 4) * 0.12}s ease-in-out ${i * 0.05}s infinite` : undefined,
            }}
          />
        ))}
      </div>
      {text.trim() && !mic.listening ? (
        <button type="submit" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-vio text-primary-foreground hover:brightness-110 glow" aria-label="Enviar">
          <ArrowUp className="h-[18px] w-[18px]" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            if (!mic.supported) {
              toast.error("Seu navegador não oferece reconhecimento de voz. Experimente o Chrome ou o Edge.");
              return;
            }
            playSound(mic.listening ? "off" : "on");
            mic.toggle();
          }}
          className={cn(
            "grid h-12 w-12 shrink-0 place-items-center rounded-full bg-vio text-primary-foreground hover:brightness-110 glow",
            mic.listening && "ring-4 ring-lav/30",
          )}
          aria-label={mic.listening ? "Parar de ouvir" : "Falar com a TUNAVI"}
          aria-pressed={mic.listening}
        >
          {mic.listening ? <MicOff className="h-[18px] w-[18px]" /> : <Mic className="h-[18px] w-[18px]" />}
        </button>
      )}
    </form>
  );
}
