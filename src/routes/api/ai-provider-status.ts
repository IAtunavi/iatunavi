import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/ai-provider-status")({
  server: { handlers: { GET: async ({ request }) => {
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
  } } },
});
