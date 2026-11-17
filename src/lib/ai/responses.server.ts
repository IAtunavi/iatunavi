import { createOpenAI } from "@ai-sdk/openai";
import { streamText, tool, stepCountIs, type ModelMessage, type ToolSet } from "ai";
import { z } from "zod";

import {
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "./run-id.server";

const moduleSchema = z.enum(["dashboard","meu-espaco","projetos","tarefas","pesquisa","criador","agentes","memoria","voz","integracoes","desktop","seguranca","configuracoes","super-painel"]);
export const tunaviTools = {
  navegar_modulo: tool({ description: "Navega a interface da TUNAVI para um dos módulos disponíveis.", inputSchema: z.object({ modulo: moduleSchema }) }),
  abrir_aba_externa: tool({ description: "Abre uma URL externa segura (somente HTTP ou HTTPS) em nova aba.", inputSchema: z.object({ url: z.string().url(), titulo: z.string().min(1).max(120) }) }),
  gerar_relatorio: tool({ description: "Cria e registra um relatório executivo no espaço do usuário.", inputSchema: z.object({ titulo: z.string().min(1).max(160), categoria: z.string().min(1).max(80), resumo: z.string().min(1).max(1200), metricas: z.array(z.object({ label: z.string().min(1).max(80), valor: z.string().max(160) })).max(20), conteudo_markdown: z.string().min(1).max(20000) }) }),
  controlar_player_hud: tool({ description: "Controla o player de áudio ambiente e foco no HUD da TUNAVI.", inputSchema: z.object({ acao: z.enum(["tocar","pausar","proxima","anterior","volume"]), estilo: z.enum(["foco_lofi","synthwave","cyber_ambient","chuva_estudio"]).optional(), volume: z.number().min(0).max(100).optional() }) }),
  adicionar_tarefa: tool({ description: "Adiciona uma tarefa à lista de tarefas do usuário e ao Dashboard.", inputSchema: z.object({ titulo: z.string().min(1).max(160), prioridade: z.enum(["baixa","media","alta"]), prazo: z.string().max(160) }) }),
  salvar_memoria: tool({ description: "Salva uma informação útil ou preferência que o usuário pediu para lembrar.", inputSchema: z.object({ tipo: z.enum(["fato","preferencia","contexto"]), conteudo: z.string().min(3).max(400) }) }),
  buscar_memorias: tool({ description: "Busca memórias pessoais para recuperar preferências, fatos ou decisões anteriores.", inputSchema: z.object({ consulta: z.string().min(2).max(200) }) }),
};

export const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
const OPENAI_URL = "https://api.openai.com/v1";

export function createResponsesCall(
  request: Request,
  config: {
    apiKey: string;
    provider?: "openai" | "lovable";
    model: string;
    maxOutputTokens?: number;
    onUsage?: (usage: { inputTokens: number; outputTokens: number }) => Promise<void> | void;
  },
  messages: ModelMessage[],
  instructions?: string,
) {
  const useOpenAI = config.provider === "openai";
  const runIdFetch = useOpenAI ? undefined : createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
  const provider = createOpenAI({
    baseURL: useOpenAI ? OPENAI_URL : GATEWAY_URL,
    apiKey: config.apiKey,
    ...(!useOpenAI ? {
      headers: { "Lovable-API-Key": config.apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
      fetch: runIdFetch!.fetch,
    } : {}),
  });
  const result = streamText({
    model: provider.responses(config.model),
    ...(instructions ? { instructions } : {}),
    messages,
    tools: tunaviTools as unknown as ToolSet,
    stopWhen: stepCountIs(6),
    abortSignal: request.signal,
    ...(config.maxOutputTokens ? { maxOutputTokens: config.maxOutputTokens } : {}),
    providerOptions: { openai: { store: false } },
    onFinish: async ({ totalUsage }) => {
      await config.onUsage?.({
        inputTokens: totalUsage.inputTokens ?? 0,
        outputTokens: totalUsage.outputTokens ?? 0,
      });
    },
  });
  return {
    result,
    uiResponse: async (originalMessages?: unknown[]) => {
      const response = result.toUIMessageStreamResponse({
        sendReasoning: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(originalMessages ? { originalMessages: originalMessages as any } : {}),
        onError: (error) => describeError(error),
      });
      return runIdFetch ? withLovableAiGatewayRunIdHeader(response, runIdFetch) : response;
    },
    textResponse: async () => {
      const response = result.toTextStreamResponse();
      return runIdFetch ? withLovableAiGatewayRunIdHeader(response, runIdFetch) : response;
    },
  };
}

/** Convert provider failures into safe Portuguese messages without exposing secrets. */
export function describeError(error: unknown): string {
  const e = error as { statusCode?: number; status?: number; message?: string };
  const status = e?.statusCode ?? e?.status;
  if (status === 402) return "Os créditos ou o saldo do provedor de IA acabaram. Verifique o faturamento da conta conectada.";
  if (status === 429) return "Muitas solicitações agora. Aguarde alguns instantes e tente novamente.";
  if (status === 401 || status === 403) return "A autenticação ou o acesso ao modelo de IA foi recusado. Verifique a chave e as permissões no servidor.";
  if (status === 400) return "A solicitação não pôde ser processada. Tente reformular ou encurtar a mensagem.";
  if (status && status >= 500) return "O serviço de IA está instável no momento. Tente novamente em instantes.";
  return "Não foi possível obter uma resposta agora. Tente novamente.";
}
