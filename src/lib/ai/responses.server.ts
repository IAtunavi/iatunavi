import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";

import {
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "./run-id.server";

export const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";

export function createResponsesCall(
  request: Request,
  config: {
    apiKey: string;
    model: string;
    maxOutputTokens?: number;
    onUsage?: (usage: { inputTokens: number; outputTokens: number }) => Promise<void> | void;
  },
  messages: ModelMessage[],
  instructions?: string,
) {
  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
  const provider = createOpenAI({
    baseURL: GATEWAY_URL,
    apiKey: config.apiKey,
    headers: { "Lovable-API-Key": config.apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });
  const reasoning = config.model !== "openai/chat-latest";
  const result = streamText({
    model: provider.responses(config.model),
    ...(instructions ? { instructions } : {}),
    messages,
    abortSignal: request.signal,
    ...(config.maxOutputTokens ? { maxOutputTokens: config.maxOutputTokens } : {}),
    providerOptions: {
      openai: {
        store: false,
        ...(reasoning
          ? {
              forceReasoning: true,
              reasoningEffort: "low",
              reasoningSummary: "auto",
              include: ["reasoning.encrypted_content"],
            }
          : {}),
      },
    },
    onFinish: async ({ totalUsage }) => {
      await config.onUsage?.({
        inputTokens: totalUsage.inputTokens ?? 0,
        outputTokens: totalUsage.outputTokens ?? 0,
      });
    },
  });
  return {
    result,
    uiResponse: (originalMessages?: unknown[]) =>
      withLovableAiGatewayRunIdHeader(
        result.toUIMessageStreamResponse({
          sendReasoning: true,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...(originalMessages ? { originalMessages: originalMessages as any } : {}),
          onError: (error) => describeError(error),
        }),
        runIdFetch,
      ),
    textResponse: () => withLovableAiGatewayRunIdHeader(result.toTextStreamResponse(), runIdFetch),
  };
}

/** Turn gateway failures into safe Portuguese messages for the UI. */
export function describeError(error: unknown): string {
  const e = error as { statusCode?: number; status?: number; message?: string; responseBody?: string };
  const status = e?.statusCode ?? e?.status;
  if (status === 402) return "Os créditos de IA acabaram. Adicione créditos ao espaço de trabalho para continuar.";
  if (status === 429) return "Muitas solicitações agora. Aguarde alguns instantes e tente novamente.";
  if (status === 403) return "O acesso a este modelo de IA foi negado. Um administrador pode escolher outro modelo no Super Painel.";
  if (status === 400) return "A solicitação não pôde ser processada. Tente reformular ou encurtar a mensagem.";
  if (status && status >= 500) return "O serviço de IA está instável no momento. Tente novamente em instantes.";
  return "Não foi possível obter uma resposta agora. Tente novamente.";
}
