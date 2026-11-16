import { agentById } from "./agents";
import { memoriesStore, prefsStore } from "./data";
import { supabase } from "@/integrations/supabase/client";

/** Context the server folds into the assistant's instructions. */
export function buildAiContext() {
  const prefs = prefsStore.get();
  const agent = agentById(prefs.activeAgent);
  return {
    userName: prefs.name || null,
    agent: agent?.id ?? null,
    agentPersona: agent?.persona ?? null,
    memories: prefs.sendMemories ? memoriesStore.get().slice(0, 40).map((m) => `[${m.kind}] ${m.text}`) : [],
  };
}

export async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function readErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  try {
    const parsed = JSON.parse(raw) as { error?: string };
    if (parsed?.error) return parsed.error;
  } catch {
    /* not JSON */
  }
  if (/fetch|network/i.test(raw)) return "Sem conexão com o servidor. Verifique sua internet.";
  return raw || "Algo deu errado. Tente novamente.";
}

/** Stream a text generation (Pesquisa, Criador). */
export async function streamGenerate(
  input: { mode: "pesquisa" | "criador"; kind?: string; prompt: string },
  onChunk: (full: string) => void,
  signal?: AbortSignal,
) {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "content-type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({ ...input, context: buildAiContext() }),
    signal,
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Erro ${res.status}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    full += decoder.decode(value, { stream: true });
    onChunk(full);
  }
  if (!full.trim()) throw new Error("A IA não retornou conteúdo. Tente novamente.");
  return full;
}
