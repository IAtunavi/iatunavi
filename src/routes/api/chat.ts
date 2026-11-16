import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, type UIMessage } from "ai";
import { z } from "zod";
import { createResponsesCall } from "@/lib/ai/responses.server";
import { buildInstructions, contextSchema, gateAiRequest } from "@/lib/ai/tunavi.server";

const bodySchema = z.object({
  messages: z.array(z.any()).min(1).max(200),
  context: contextSchema,
});

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: z.infer<typeof bodySchema>;
        try {
          body = bodySchema.parse(await request.json());
        } catch {
          return Response.json({ error: "Requisição inválida." }, { status: 400 });
        }
        const gate = await gateAiRequest(request, "conversar");
        if ("error" in gate) return gate.error;

        const messages = body.messages as UIMessage[];
        const call = createResponsesCall(
          request,
          {
            apiKey: gate.apiKey,
            model: gate.settings.active_model,
            maxOutputTokens: gate.settings.max_output_tokens,
            onUsage: (u) => gate.recordUsage("chat", u),
          },
          await convertToModelMessages(messages),
          buildInstructions(gate.settings, body.context),
        );
        return call.uiResponse(messages);
      },
    },
  },
});
