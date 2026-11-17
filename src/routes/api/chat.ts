import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, type UIMessage } from "ai";
import { z } from "zod";
import { createResponsesCall } from "@/lib/ai/responses.server";
import { buildInstructions, contextSchema, gateAiRequest } from "@/lib/ai/tunavi.server";

const bodySchema = z.object({ messages: z.array(z.any()).min(1).max(200), context: contextSchema });

export const Route = createFileRoute("/api/chat")({
  server: { handlers: {
    GET: async ({ request }) => {
      const auth = request.headers.get("authorization");
      if (!auth?.startsWith("Bearer ")) return Response.json({ error: "Não autorizado." }, { status: 401 });
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(auth.slice(7));
      if (authError || !authData.user) return Response.json({ error: "Sessão inválida." }, { status: 401 });
      const { data: isAdmin, error } = await supabaseAdmin.rpc("has_role", { _user_id: authData.user.id, _role: "admin" });
      if (error || !isAdmin) return Response.json({ error: "Acesso administrativo restrito." }, { status: 403 });
      return Response.json({
        openai: process.env["OPENAI_API_KEY"]?.trim() ? "connected" : "absent",
        fallback: process.env["LOVABLE_API_KEY"]?.trim() ? "available" : "absent",
      }, { headers: { "Cache-Control": "no-store" } });
    },
    POST: async ({ request }) => {
    let body: z.infer<typeof bodySchema>;
    try { body = bodySchema.parse(await request.json()); }
    catch { return Response.json({ error: "Requisição inválida." }, { status: 400 }); }
    const gate = await gateAiRequest(request, "conversar");
    if ("error" in gate) return gate.error;
    const messages = body.messages as UIMessage[];
    const call = createResponsesCall(request, {
      apiKey: gate.apiKey, provider: gate.provider, model: gate.model,
      maxOutputTokens: gate.settings.max_output_tokens,
      onUsage: (u) => gate.recordUsage("chat", u),
    }, await convertToModelMessages(messages), buildInstructions(gate.settings, body.context));
    return call.uiResponse(messages);
  } } },
});
