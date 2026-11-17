import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createResponsesCall } from "@/lib/ai/responses.server";
import { buildInstructions, contextSchema, gateAiRequest } from "@/lib/ai/tunavi.server";

const bodySchema = z.object({ mode: z.enum(["pesquisa", "criador"]), kind: z.string().max(40).optional(), prompt: z.string().min(3).max(6000), context: contextSchema });
const MODE_GUIDE: Record<string, string> = {
  pesquisa: "Você está no módulo Pesquisa e inteligência. Produza um relatório estruturado em markdown com: Resumo executivo, Principais tendências, Oportunidades, Riscos, Público e concorrência, e Próximos passos. Deixe claro que a análise se baseia no seu conhecimento geral, sem dados em tempo real, e indique como validar.",
  criador: "Você está no módulo Criador. Entregue diretamente o conteúdo pronto para uso, em markdown, sem preâmbulos longos. Para código, use blocos de código completos e funcionais.",
};

export const Route = createFileRoute("/api/generate")({
  server: { handlers: { POST: async ({ request }) => {
    let body: z.infer<typeof bodySchema>;
    try { body = bodySchema.parse(await request.json()); }
    catch { return Response.json({ error: "Descreva o pedido com pelo menos 3 caracteres." }, { status: 400 }); }
    const gate = await gateAiRequest(request, body.mode);
    if ("error" in gate) return gate.error;
    const extra = `${MODE_GUIDE[body.mode]}${body.kind ? `\nFormato solicitado: ${body.kind}.` : ""}`;
    const call = createResponsesCall(request, {
      apiKey: gate.apiKey, provider: gate.provider, model: gate.model,
      maxOutputTokens: gate.settings.max_output_tokens,
      onUsage: (u) => gate.recordUsage(body.mode, u),
    }, [{ role: "user", content: body.prompt }], buildInstructions(gate.settings, body.context, extra));
    return call.textResponse();
  } } },
});
