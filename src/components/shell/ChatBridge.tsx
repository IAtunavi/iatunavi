import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { toast } from "sonner";
import { getChat, messageText, saveMessages } from "@/lib/chat-client";
import { setActivity } from "@/lib/assistant";
import { logActivity, memoriesStore, prefsStore, reportsStore, tasksStore } from "@/lib/data";
import { uid } from "@/lib/persisted";
import { playSound } from "@/lib/sound";
import { speak } from "@/lib/voice";
import { readErrorMessage } from "@/lib/ai-context";

/** Keeps the shared conversation saved and mirrors its status in the hologram. */
export function ChatBridge() {
  const navigate = useNavigate();
  const { messages, status, error, addToolOutput } = useChat({ chat: getChat() });
  const handledTools = useRef(new Set<string>());
  const prev = useRef(status);


  useEffect(() => {
    for (const message of messages) {
      if (message.role !== "assistant") continue;
      for (const rawPart of message.parts) {
        const part = rawPart as unknown as { type?: string; state?: string; toolCallId?: string; input?: Record<string, unknown> };
        if (!part.type?.startsWith("tool-") || part.state !== "input-available" || !part.toolCallId || !part.input) continue;
        if (handledTools.current.has(part.toolCallId)) continue;
        handledTools.current.add(part.toolCallId);
        const name = part.type.slice(5);
        const input = part.input;
        void (async () => {
          try {
            let output: Record<string, unknown> = { ok: true };
            if (name === "navegar_modulo") {
              const paths: Record<string, string> = { dashboard:"/", "meu-espaco":"/meu-espaco", projetos:"/projetos", tarefas:"/tarefas", pesquisa:"/pesquisa", criador:"/criador", agentes:"/agentes", memoria:"/memoria", voz:"/voz", integracoes:"/integracoes", desktop:"/desktop", seguranca:"/seguranca", configuracoes:"/configuracoes", "super-painel":"/super-painel" };
              const path = paths[String(input.modulo)];
              if (!path) throw new Error("Módulo não reconhecido.");
              await navigate({ to: path as never });
              output = { ok:true, modulo:input.modulo, path };
              toast.success("Abrindo " + String(input.modulo).replaceAll("-", " ") + ".");
            } else if (name === "abrir_aba_externa") {
              const url = new URL(String(input.url));
              if (!["https:","http:"].includes(url.protocol)) throw new Error("Somente links HTTP ou HTTPS são permitidos.");
              output = { ok:true, url:url.toString(), titulo:input.titulo, requiresUserAction:true };
              toast.info("Link preparado. Clique no cartão para abrir em nova aba.");
            } else if (name === "gerar_relatorio") {
              const metrics = Array.isArray(input.metricas) ? input.metricas as {label:string;valor:string}[] : [];
              const content = [String(input.resumo), ...metrics.map((m) => `- **${m.label}:** ${m.valor}`), String(input.conteudo_markdown)].join("\n\n");
              const id = uid();
              reportsStore.set((prev) => [{ id, topic:String(input.titulo), content, createdAt:Date.now() }, ...prev]);
              output = { ok:true, id, titulo:input.titulo, categoria:input.categoria };
              toast.success("Relatório registrado com sucesso.");
            } else if (name === "adicionar_tarefa") {
              const id = uid();
              tasksStore.set((prev) => [{ id, title:String(input.titulo), status:"todo", priority:input.prioridade as "baixa"|"media"|"alta", due:String(input.prazo || ""), createdAt:Date.now() }, ...prev]);
              logActivity("Tarefa criada pela TUNAVI: " + String(input.titulo));
              output = { ok:true, id, titulo:input.titulo, prioridade:input.prioridade, prazo:input.prazo };
              toast.success("Tarefa adicionada ao Dashboard.");
            } else if (name === "salvar_memoria") {
              const kind = input.tipo as "fato"|"preferencia"|"contexto";
              const content = String(input.conteudo).trim();
              if (/senha|password|token|api.?key|cart[aã]o|cvv/i.test(content)) throw new Error("Não posso guardar senhas, chaves ou dados de pagamento.");
              const existing = memoriesStore.get().find((m) => m.text.toLocaleLowerCase("pt-BR") === content.toLocaleLowerCase("pt-BR"));
              if (existing) {
                output = { ok:true, id:existing.id, tipo:existing.kind, conteudo:existing.text, jaExistia:true };
              } else {
                const id = uid();
                memoriesStore.set((prev) => [{ id, kind, text:content, createdAt:Date.now() }, ...prev].slice(0,100));
                logActivity("Memória salva pela TUNAVI.");
                output = { ok:true, id, tipo:kind, conteudo:content };
                toast.success("Memória salva para conversas futuras.");
              }
            } else if (name === "buscar_memorias") {
              const terms = String(input.consulta).toLocaleLowerCase("pt-BR").split(/\\s+/).filter((x) => x.length > 2);
              const found = memoriesStore.get().map((m) => ({...m, score:terms.filter((term) => m.text.toLocaleLowerCase("pt-BR").includes(term)).length})).filter((m) => m.score > 0).sort((a,b) => b.score-a.score).slice(0,8);
              output = { ok:true, resultados:found.map(({id,kind,text,createdAt})=>({id,tipo:kind,conteudo:text,criada_em:new Date(createdAt).toISOString()})), total:found.length };
            } else if (name === "controlar_player_hud") {
              output = { ok:true, player:"pronto", requiresUserAction:true, ...input };
              toast.info("Controle de áudio preparado. Clique no cartão para aplicar.");
            } else {
              throw new Error("Ferramenta não disponível.");
            }
            addToolOutput({ tool: name, toolCallId: part.toolCallId!, output });
          } catch (err) {
            const message = err instanceof Error ? err.message : "Não foi possível executar a ação.";
            toast.error(message);
            addToolOutput({ tool: name, toolCallId: part.toolCallId!, output: { ok:false, error:message } });
          }
        })();
      }
    }
  }, [messages, navigate, addToolOutput]);

  useEffect(() => {
    setActivity("chat", status === "submitted" ? "processando" : status === "streaming" ? "respondendo" : null);
    const was = prev.current;
    prev.current = status;
    if (status === "ready" || status === "error") saveMessages(messages);
    if ((was === "streaming" || was === "submitted") && status === "ready") {
      const last = messages.at(-1);
      if (last?.role === "assistant") {
        playSound("receive");
        const text = messageText(last);
        logActivity(`TUNAVI respondeu: ${text.slice(0, 48)}${text.length > 48 ? "…" : ""}`);
        if (prefsStore.get().autoSpeak && text) speak(text);
      }
    }
  }, [status, messages]);

  useEffect(() => {
    if (error) {
      playSound("error");
      toast.error(readErrorMessage(error));
    }
  }, [error]);

  useEffect(() => () => setActivity("chat", null), []);
  return null;
}
