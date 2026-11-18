import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/credits")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authorization = request.headers.get("authorization");
        if (!authorization?.startsWith("Bearer ")) {
          return Response.json({ error: "Entre na TUNAVI para consultar seus créditos." }, { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(authorization.slice(7));
        if (authError || !authData.user) {
          return Response.json({ error: "Sua sessão expirou. Entre novamente." }, { status: 401 });
        }

        const userId = authData.user.id;
        const [{ data: plan, error: planError }, { data: isAdmin, error: adminError }, { data: settings, error: settingsError }] = await Promise.all([
          supabaseAdmin.rpc("current_plan", { _user_id: userId }),
          supabaseAdmin.rpc("has_role", { _user_id: userId, _role: "admin" }),
          supabaseAdmin.from("app_settings").select("free_daily_limit,pro_daily_limit,ultra_daily_limit").eq("id", 1).single(),
        ]);
        if (planError || adminError || settingsError || !settings) {
          return Response.json({ error: "Não foi possível consultar seu saldo de créditos." }, { status: 500 });
        }

        const now = new Date();
        const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        const resetAt = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
        const { count, error: usageError } = await supabaseAdmin
          .from("ai_usage")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("created_at", startOfDay.toISOString());
        if (usageError) {
          return Response.json({ error: "Não foi possível consultar seu consumo de créditos." }, { status: 500 });
        }

        const tier = isAdmin ? "admin" : plan === "ultra" || plan === "pro" ? plan : "free";
        const limit = tier === "admin" ? null : tier === "ultra" ? settings.ultra_daily_limit : tier === "pro" ? settings.pro_daily_limit : settings.free_daily_limit;
        const used = count ?? 0;
        return Response.json({
          used,
          limit,
          remaining: limit === null ? null : Math.max(0, limit - used),
          tier,
          resetAt: resetAt.toISOString(),
        }, { headers: { "Cache-Control": "no-store" } });
      },
    },
  },
});
