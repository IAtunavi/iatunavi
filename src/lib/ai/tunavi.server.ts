import { z } from "zod";

export const contextSchema = z
  .object({
    agent: z.string().max(40).nullish(),
    agentPersona: z.string().max(800).nullish(),
    memories: z.array(z.string().max(400)).max(40).nullish(),
    userName: z.string().max(80).nullish(),
  })
  .partial()
  .nullish();

export type ChatContext = z.infer<typeof contextSchema>;

type Settings = {
  active_model: string;
  system_prompt: string;
  max_output_tokens: number;
  daily_message_limit: number;
  chat_enabled: boolean;
  maintenance_mode: boolean;
  maintenance_message: string;
  modules: Record<string, boolean>;
};

function json(status: number, error: string) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * Shared gate for every AI endpoint: platform switches, module toggles and the
 * daily message limit set in the Super Painel. Returns settings or an error Response.
 */
export async function gateAiRequest(request: Request, module: string) {
  const apiKey = process.env['LOVABLE_API_KEY'];
  if (!apiKey) return { error: json(500, "A IA ainda não está configurada no servidor.") };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("app_settings").select("*").eq("id", 1).single();
  if (error || !data) return { error: json(500, "Não foi possível ler as configurações da plataforma.") };
  const settings = { ...data, modules: (data.modules ?? {}) as Record<string, boolean> } as Settings;

  if (settings.maintenance_mode) return { error: json(503, settings.maintenance_message) };
  if (!settings.chat_enabled) return { error: json(503, "A IA foi pausada pelo administrador.") };
  if (settings.modules[module] === false) return { error: json(403, "Este módulo foi desativado pelo administrador.") };

  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const { count } = await supabaseAdmin
    .from("ai_usage")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since.toISOString());
  if ((count ?? 0) >= settings.daily_message_limit) {
    return { error: json(429, "O limite diário de mensagens da plataforma foi atingido. Tente amanhã ou peça ao administrador para ampliar.") };
  }

  let userId: string | null = null;
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const { data: u } = await supabaseAdmin.auth.getUser(auth.slice(7));
    userId = u.user?.id ?? null;
  }

  const recordUsage = async (feature: string, usage: { inputTokens: number; outputTokens: number }) => {
    const { error: insertError } = await supabaseAdmin.from("ai_usage").insert({
      user_id: userId,
      feature,
      model: settings.active_model,
      input_tokens: usage.inputTokens,
      output_tokens: usage.outputTokens,
    });
    if (insertError) console.error("ai_usage insert failed", insertError.message);
  };

  return { apiKey, settings, userId, recordUsage };
}

export function buildInstructions(settings: { system_prompt: string }, ctx: ChatContext, extra?: string) {
  const parts = [
    "Você é a TUNAVI, uma assistente virtual pessoal avançada, inspirada em assistentes de IA de ficção científica, mas com identidade própria.",
    "Responda sempre em português do Brasil, com tom elegante, direto e prestativo. Use markdown quando ajudar (listas, títulos curtos, tabelas, blocos de código).",
    "Você ainda não tem acesso a agenda, e-mail, arquivos ou internet em tempo real: quando pedirem algo assim, explique com clareza e ajude com um plano, rascunho ou passo a passo. Nunca finja ter executado ações externas.",
  ];
  if (settings.system_prompt?.trim()) parts.push(`Diretrizes do administrador:\n${settings.system_prompt.trim()}`);
  if (ctx?.userName) parts.push(`O nome do usuário é ${ctx.userName}.`);
  if (ctx?.agentPersona) parts.push(`Nesta conversa, atue como o agente especializado: ${ctx.agentPersona}`);
  if (ctx?.memories?.length) parts.push(`Memórias que o usuário salvou (use quando relevante):\n- ${ctx.memories.join("\n- ")}`);
  if (extra) parts.push(extra);
  return parts.join("\n\n");
}
