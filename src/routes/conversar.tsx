import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { AudioLines, Copy, Mic, MicOff, RotateCcw, Trash2, Volume2, X } from "lucide-react";
import { toast } from "sonner";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageAction, MessageActions, MessageContent, MessageResponse, ToolInvocationCard } from "@/components/ai-elements/message";
import { PromptInput, PromptInputButton, PromptInputFooter, PromptInputSubmit, PromptInputTextarea, PromptInputTools } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Hologram } from "@/components/hologram/Hologram";
import { StateSelector } from "@/components/hologram/StateSelector";
import { ModuleGate } from "@/components/hud/primitives";
import { clearSavedMessages, getChat, messageText } from "@/lib/chat-client";
import { agentById, AGENTS } from "@/lib/agents";
import { prefsStore } from "@/lib/data";
import { AI_MODELS, useAppSettings } from "@/lib/settings";
import { playSound } from "@/lib/sound";
import { speak, stopSpeaking, useSpeechInput, useWakeWord } from "@/lib/voice";
import { readErrorMessage } from "@/lib/ai-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/conversar")({
  head: () => ({
    meta: [
      { title: "Conversar com TUNAVI" },
      { name: "description", content: "Converse com a TUNAVI por texto ou voz: organize a agenda, crie projetos, pesquise mercados e muito mais." },
      { property: "og:title", content: "Conversar com TUNAVI" },
      { property: "og:description", content: "Seu assistente pessoal com inteligência artificial, por texto ou voz." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <ModuleGate module="conversar">
      <ChatPage />
    </ModuleGate>
  ),
});

const SUGGESTIONS = [
  "TUNAVI, organize minha agenda.",
  "Crie um projeto para minha empresa.",
  "Pesquise as tendências do mercado.",
  "Desenvolva um site para meu negócio.",
  "Analise este documento.",
];

function ChatPage() {
  const { messages, sendMessage, status, stop, setMessages, error, clearError, regenerate } = useChat({ chat: getChat() });
  const [input, setInput] = useState("");
  const prefs = prefsStore.useValue();
  const agent = agentById(prefs.activeAgent);
  const { data: settings } = useAppSettings();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const busy = status === "submitted" || status === "streaming";
  const model = AI_MODELS.find((m) => m.id === settings?.active_model);

  const submit = (text: string) => {
    const v = text.trim();
    if (!v || busy) return;
    stopSpeaking();
    playSound("send");
    clearError();
    void sendMessage({ text: v });
    setInput("");
  };

  const mic = useSpeechInput((t) => submit(t));
  const wake = useWakeWord(() => {
    toast.info("TUNAVI ativada. Pode falar.");
    mic.start();
  }, prefs.wakeWordEnabled && !busy && !mic.listening);
  const lastSpokenId = useRef<string | null>(null);

  useEffect(() => {
    if (!prefs.autoSpeak || busy || status !== "ready") return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant" || last.id === lastSpokenId.current) return;
    const text = messageText(last);
    if (text.trim()) {
      lastSpokenId.current = last.id;
      speak(text);
    }
  }, [messages, status, busy, prefs.autoSpeak]);

  useEffect(() => {
    if (status === "ready" || status === "error") textareaRef.current?.focus();
  }, [status]);

  return (
    <div className="mx-auto flex h-[calc(100dvh-4rem)] w-full max-w-[1200px] gap-6 px-3 pb-3 pt-3 sm:px-6 lg:px-10 lg:pt-5">
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[20px] ring-1 ring-lav/15 glass">
        <header className="flex items-center justify-between gap-3 border-b border-lav/10 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="h-8 w-8 shrink-0 rounded-full orb-gradient" style={{ animation: busy ? "holo-pulse-glow 1s ease-in-out infinite" : undefined }} />
            <div className="min-w-0">
              <h1 className="truncate text-[15px] font-semibold text-lav">Conversar com TUNAVI</h1>
              <p className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-lav/45">
                {busy ? (status === "submitted" ? "Processando…" : "Respondendo…") : `IA conectada · ${model?.label ?? "modelo padrão"}`}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={() => {
              const enabling = !prefs.autoSpeak || !prefs.wakeWordEnabled;
              if (enabling && (!wake.supported || !mic.supported)) { toast.error("O modo de voz contínua exige reconhecimento de fala compatível. Use Chrome ou Edge e permita o microfone."); return; }
              if (!enabling) stopSpeaking();
              prefsStore.set((p) => ({ ...p, autoSpeak: enabling, wakeWordEnabled: enabling }));
              toast.info(enabling ? "Modo de conversação ativado. Diga: Olá, Tunavi." : "Modo de conversação desativado.");
            }} aria-pressed={prefs.autoSpeak && prefs.wakeWordEnabled} className={cn("inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-mono uppercase tracking-wide ring-1 transition",prefs.autoSpeak && prefs.wakeWordEnabled ? "bg-vio/25 text-lav ring-vio/50" : "text-lav/50 ring-lav/10 hover:bg-lav/5")} title="Ativar ou desativar conversa por voz contínua">
              <AudioLines className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{prefs.autoSpeak && prefs.wakeWordEnabled ? "JARVIS ativo" : "Modo JARVIS"}</span>
            </button>
            <span className="hidden items-center gap-1 font-mono text-[9px] uppercase text-lav/45 sm:flex" aria-live="polite">{wake.listening ? "PALAVRA-CHAVE ATIVA" : prefs.wakeWordEnabled ? "AGUARDANDO MICROFONE" : ""}</span>
            <button type="button" onClick={() => { stopSpeaking(); toast.info("Áudio interrompido."); }} className="grid h-8 w-8 place-items-center rounded-full text-lav/60 hover:bg-lav/10" aria-label="Interromper voz"><Volume2 className="h-4 w-4" /></button>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (busy) stop();
                  setMessages([]);
                  clearSavedMessages();
                  playSound("off");
                  toast.success("Conversa apagada.");
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] text-lav/60 ring-1 ring-lav/10 hover:bg-lav/5 hover:text-lav"
              >
                <Trash2 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Nova conversa</span>
              </button>
            )}
          </div>
        </header>

        {agent && (
          <div className="flex items-center justify-between gap-3 border-b border-lav/10 bg-vio/10 px-4 py-2 text-[12px] text-lav/80 sm:px-5">
            <span className="truncate">
              Falando com o agente <strong className="font-semibold text-lav">{agent.name}</strong> · {agent.role}
            </span>
            <button type="button" onClick={() => prefsStore.set((p) => ({ ...p, activeAgent: null }))} className="grid h-6 w-6 place-items-center rounded-full hover:bg-lav/10" aria-label="Voltar para a TUNAVI">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <Conversation className="min-h-0">
          <ConversationContent className="gap-6 px-4 py-6 sm:px-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-center">
                <Hologram scale={0.5} />
                <h2 className="mt-5 text-lg font-semibold text-lav">Como posso ajudar hoje?</h2>
                <p className="mt-1 max-w-md text-[13px] text-lav/55">Escreva ou fale com a TUNAVI. Experimente um destes comandos:</p>
                <div className="mt-5 flex max-w-xl flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} type="button" onClick={() => submit(s)} className="h-9 rounded-full px-4 text-[12px] text-lav/80 ring-1 ring-lav/20 hover:bg-vio/20">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, idx) => {
                const text = messageText(m);
                const isLast = idx === messages.length - 1;
                return (
                  <Message key={m.id} from={m.role}>
                    <MessageContent className="group-[.is-user]:rounded-2xl group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground text-[14px] leading-relaxed">
                      {m.parts.map((part, i) =>
                        part.type === "text" ? (
                          m.role === "assistant" ? (
                            <MessageResponse key={i} isAnimating={isLast && status === "streaming"}>
                              {part.text}
                            </MessageResponse>
                          ) : (
                            <p key={i} className="whitespace-pre-wrap">
                              {part.text}
                            </p>
                          )
                        ) : part.type.startsWith("tool-") ? <ToolInvocationCard key={i} part={part} /> : null,
                      )}
                    </MessageContent>
                    {m.role === "assistant" && text && !(isLast && busy) && (
                      <MessageActions className="text-lav/50">
                        <MessageAction
                          tooltip="Copiar"
                          onClick={() => {
                            void navigator.clipboard.writeText(text);
                            toast.success("Resposta copiada.");
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </MessageAction>
                        <MessageAction tooltip="Ouvir" onClick={() => speak(text) || toast.error("Leitura em voz alta indisponível neste navegador.")}>
                          <Volume2 className="h-3.5 w-3.5" />
                        </MessageAction>
                        {isLast && (
                          <MessageAction tooltip="Gerar novamente" onClick={() => void regenerate()}>
                            <RotateCcw className="h-3.5 w-3.5" />
                          </MessageAction>
                        )}
                      </MessageActions>
                    )}
                  </Message>
                );
              })
            )}
            {status === "submitted" && (
              <Message from="assistant">
                <MessageContent>
                  <Shimmer className="text-[13px]">A TUNAVI está pensando…</Shimmer>
                </MessageContent>
              </Message>
            )}
            {error && status === "error" && (
              <div className="rounded-xl bg-destructive/10 px-4 py-3 text-[13px] text-destructive ring-1 ring-destructive/25" role="alert">
                {readErrorMessage(error)}
              </div>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="border-t border-lav/10 p-3 sm:p-4">
          <PromptInput onSubmit={(msg) => submit(msg.text || input)} className="rounded-2xl bg-ink/50 ring-1 ring-lav/15 [&_[data-slot=input-group]]:border-0">
            <PromptInputTextarea
              ref={textareaRef}
              value={mic.listening ? mic.interim || input : input}
              onChange={(e) => setInput(e.currentTarget.value)}
              placeholder={mic.listening ? "Ouvindo…" : agent ? `Pergunte algo a ${agent.name}…` : "Pergunte ou peça algo ao TUNAVI…"}
              className="min-h-14 text-[14px]"
              autoFocus
            />
            <PromptInputFooter>
              <PromptInputTools>
                <PromptInputButton
                  onClick={() => {
                    if (!mic.supported) {
                      toast.error("Seu navegador não oferece reconhecimento de voz. Experimente o Chrome ou o Edge.");
                      return;
                    }
                    if (!mic.listening) stopSpeaking();
                    playSound(mic.listening ? "off" : "on");
                    mic.toggle();
                  }}
                  aria-pressed={mic.listening}
                  aria-label={mic.listening ? "Parar de ouvir" : "Falar"}
                  className={cn(mic.listening && "bg-vio/30 text-lav")}
                >
                  {mic.listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                </PromptInputButton>
                {mic.listening && (
                  <span className="flex h-5 items-center gap-[2px]" aria-hidden>
                    {Array.from({ length: 12 }, (_, i) => (
                      <span key={i} className="w-[2px] origin-center rounded bg-lav" style={{ height: `${6 + ((i * 5) % 14)}px`, animation: `holo-bar ${0.4 + (i % 4) * 0.1}s ease-in-out infinite` }} />
                    ))}
                  </span>
                )}
                <span className="hidden font-mono text-[10px] text-lav/35 sm:inline">Enter envia · Shift+Enter quebra linha</span>
              </PromptInputTools>
              <PromptInputSubmit status={status} onStop={stop} disabled={!busy && !input.trim()} className="bg-vio text-primary-foreground hover:bg-vio/90" />
            </PromptInputFooter>
          </PromptInput>
          {mic.error && <p className="mt-2 text-[12px] text-destructive">{mic.error}</p>}
          {wake.error && <p className="mt-2 text-[12px] text-destructive">{wake.error}</p>}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1">
            <label className="flex items-center gap-2 text-[11px] text-lav/55">
              <input type="checkbox" className="accent-violet-500" checked={prefs.autoSpeak} onChange={(e) => prefsStore.set((p) => ({ ...p, autoSpeak: e.target.checked }))} /> Responder falando
            </label>
            <label className="flex items-center gap-2 text-[11px] text-lav/55">
              <input type="checkbox" className="accent-violet-500" checked={prefs.wakeWordEnabled} onChange={(e) => { if (e.target.checked && !wake.supported) { toast.error("Palavra-chave não suportada neste navegador."); return; } prefsStore.set((p) => ({ ...p, wakeWordEnabled: e.target.checked })); }} />
              Ativar “Olá, Tunavi”
            </label>
          </div>
          {prefs.wakeWordEnabled && <p className="mt-1 px-1 text-[10px] text-lav/35">A escuta funciona somente com esta página aberta e visível, usando o reconhecimento de fala do navegador. A TUNAVI não mantém gravações de áudio. Diga “Olá, Tunavi” para iniciar uma fala; aguarde a resposta e fale novamente para continuar.</p>}
        </div>
      </section>

      <aside className="hidden w-[300px] shrink-0 flex-col gap-4 xl:flex">
        <div className="flex flex-col items-center rounded-[20px] p-5 ring-1 ring-lav/15 glass">
          <Hologram scale={0.7} />
          <StateSelector className="mt-4" />
        </div>
        <div className="rounded-[20px] p-5 ring-1 ring-lav/15 glass">
          <h3 className="text-[14px] font-semibold text-lav">Agentes</h3>
          <p className="mt-1 text-[12px] text-lav/50">Escolha um especialista para esta conversa.</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => prefsStore.set((p) => ({ ...p, activeAgent: null }))}
              className={cn("h-7 rounded-full px-3 text-[11px] ring-1", !agent ? "bg-vio/25 text-lav ring-vio/50" : "text-lav/60 ring-lav/15 hover:bg-lav/5")}
            >
              TUNAVI
            </button>
            {AGENTS.filter((a) => prefs.agentStatus[a.id] !== false).map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => prefsStore.set((p) => ({ ...p, activeAgent: a.id }))}
                className={cn("h-7 rounded-full px-3 text-[11px] ring-1", agent?.id === a.id ? "bg-vio/25 text-lav ring-vio/50" : "text-lav/60 ring-lav/15 hover:bg-lav/5")}
              >
                {a.name}
              </button>
            ))}
          </div>
          <Link to="/memoria" className="mt-4 block text-[12px] text-lav/55 hover:text-lav">
            {prefs.sendMemories ? "Memórias ativas nesta conversa →" : "Memórias desligadas →"}
          </Link>
        </div>
      </aside>
    </div>
  );
}
