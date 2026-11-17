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
  free_daily_limit: number;
  pro_daily_limit: number;
  free_max_tokens: number;
  pro_max_tokens: number;
  pro_modules: string[];
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
export async function gateAiRequest(request: Request, module: string, requireProviderKey = true) {
  const apiKey = process.env['LOVABLE_API_KEY'];
  if (requireProviderKey && !apiKey) return { error: json(500, "A IA ainda não está configurada no servidor.") };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("app_settings").select("*").eq("id", 1).single();
  if (error || !data) return { error: json(500, "Não foi possível ler as configurações da plataforma.") };
  const settings = { ...data, modules: (data.modules ?? {}) as Record<string, boolean> } as Settings;

  if (settings.maintenance_mode) return { error: json(503, settings.maintenance_message) };
  if (!settings.chat_enabled) return { error: json(503, "A IA foi pausada pelo administrador.") };
  if (settings.modules[module] === false) return { error: json(403, "Este módulo foi desativado pelo administrador.") };

  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return { error: json(401, "Entre na TUNAVI para usar os recursos de IA.") };
  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(auth.slice(7));
  if (authError || !authData.user) return { error: json(401, "Sua sessão expirou. Entre novamente para continuar.") };
  const userId = authData.user.id;

  // Plan-aware limits: admins and active Pro subscribers get the Pro quota.
  const [{ data: isPro }, { data: isAdmin }] = await Promise.all([
    supabaseAdmin.rpc("is_pro", { _user_id: userId }),
    supabaseAdmin.rpc("has_role", { _user_id: userId, _role: "admin" }),
  ]);
  const proAccess = !!isPro || !!isAdmin;
  const proModules = Array.isArray(data.pro_modules) ? (data.pro_modules as string[]) : [];
  if (!proAccess && proModules.includes(module)) {
    return { error: json(402, "Este recurso é exclusivo do TUNAVI Pro. Veja os planos para liberar.") };
  }
  settings.daily_message_limit = proAccess ? settings.pro_daily_limit : settings.free_daily_limit;
  settings.max_output_tokens = Math.min(settings.max_output_tokens, proAccess ? settings.pro_max_tokens : settings.free_max_tokens);

  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const { count, error: usageError } = await supabaseAdmin
    .from("ai_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since.toISOString());
  if (usageError) return { error: json(500, "Não foi possível verificar seu limite diário de IA.") };
  if ((count ?? 0) >= settings.daily_message_limit) {
    return { error: json(429, "Você atingiu seu limite diário de mensagens. Tente novamente amanhã ou peça ao administrador para ampliar.") };
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

  return { apiKey: apiKey ?? "", settings, userId, recordUsage };
}

export function buildInstructions(settings: { system_prompt: string }, ctx: ChatContext, extra?: string) {
  const parts = [
    "Você é a TUNAVI, uma assistente virtual pessoal avançada, inspirada em assistentes de IA de ficção científica, mas com identidade própria.",
    "Responda sempre em português do Brasil, com tom elegante, direto e prestativo. Use markdown quando ajudar (listas, títulos curtos, tabelas, blocos de código).",
    "Você pode executar ações dentro da TUNAVI usando as ferramentas disponíveis. Use navegar_modulo para navegar, abrir_aba_externa para preparar um link externo, gerar_relatorio para salvar relatórios, controlar_player_hud para controlar o áudio ambiente, adicionar_tarefa para criar tarefas, salvar_memoria para guardar informações solicitadas e buscar_memorias para recuperar contexto anterior. Para ações que exigem gesto do usuário (abrir nova aba ou iniciar áudio), explique que o usuário deve clicar no cartão da ação. Nunca afirme que uma ação foi concluída antes de receber o resultado da ferramenta.",
    "Memória contextual: use buscar_memorias quando o usuário mencionar preferências, decisões ou fatos anteriores não presentes na conversa atual. Use salvar_memoria quando o usuário pedir para lembrar ou guardar algo. Não salve senhas, tokens, chaves de API ou dados de pagamento. Nunca invente memórias; se a busca não encontrar, informe isso.",
    "Orquestração: divida pedidos com várias etapas em ações pequenas e sequenciais. Aguarde o resultado de cada ferramenta antes de decidir a próxima. Use no máximo seis chamadas por turno, não repita ações concluídas e informe falhas sem alegar sucesso.",
  ];
  if (settings.system_prompt?.trim()) parts.push(`Diretrizes do administrador:\n${settings.system_prompt.trim()}`);
  if (ctx?.userName) parts.push(`O nome do usuário é ${ctx.userName}.`);
  if (ctx?.agentPersona) parts.push(`Nesta conversa, atue como o agente especializado: ${ctx.agentPersona}`);
  if (ctx?.memories?.length) parts.push(`Memórias que o usuário salvou (use quando relevante):\n- ${ctx.memories.join("\n- ")}`);
  if (extra) parts.push(extra);
  return parts.join("\n\n");
}
