import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const checkoutSchema = z.object({
  plan: z.enum(["pro", "ultra"]),
  cycle: z.enum(["monthly", "yearly"]),
});

export const Route = createFileRoute("/api/billing/checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const accessToken = process.env["MP_ACCESS_TOKEN"]?.trim();
        const appUrl = process.env["APP_URL"]?.trim()?.replace(/\/+$/, "");
        if (!accessToken || !appUrl) {
          return Response.json(
            { error: "O pagamento ainda não está configurado. O administrador precisa concluir a configuração do Mercado Pago." },
            { status: 503 },
          );
        }

        const authorization = request.headers.get("authorization");
        if (!authorization?.startsWith("Bearer ")) {
          return Response.json({ error: "Entre na TUNAVI para contratar um plano." }, { status: 401 });
        }

        let body: z.infer<typeof checkoutSchema>;
        try {
          body = checkoutSchema.parse(await request.json());
        } catch {
          return Response.json({ error: "Plano ou ciclo de cobrança inválido." }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(authorization.slice(7));
        if (authError || !authData.user || !authData.user.email) {
          return Response.json({ error: "Sua sessão expirou ou sua conta não possui e-mail cadastrado." }, { status: 401 });
        }

        const { data: adminRole } = await supabaseAdmin.rpc("has_role", {
          _user_id: authData.user.id,
          _role: "admin",
        });
        if (adminRole) {
          return Response.json({ error: "Sua conta já possui acesso total de administrador." }, { status: 409 });
        }

        const { data: existing, error: existingError } = await supabaseAdmin
          .from("subscriptions")
          .select("plan,status,current_period_end")
          .eq("user_id", authData.user.id)
          .maybeSingle();
        if (existingError) {
          console.error("[billing] Não foi possível consultar assinatura atual:", existingError.message);
          return Response.json({ error: "Não foi possível validar sua assinatura atual." }, { status: 500 });
        }

        const existingActive = ["active", "authorized", "trialing"].includes(existing?.status ?? "")
          && (!existing?.current_period_end || Date.parse(existing.current_period_end) > Date.now());
        if (!existingActive && existing?.status === "pending" && existing.mercadopago_subscription_id) {
          return Response.json({ error: "Você já possui uma contratação aguardando autorização. Conclua ou cancele o checkout anterior antes de iniciar outro." }, { status: 409 });
        }
        const rank = (value: string | null | undefined) => value === "ultra" ? 2 : value === "pro" ? 1 : 0;
        if (existingActive && rank(existing?.plan) >= rank(body.plan)) {
          return Response.json({ error: "Você já possui este plano ou um plano superior ativo." }, { status: 409 });
        }

        const { data: settings, error: settingsError } = await supabaseAdmin
          .from("app_settings")
          .select("pro_price_monthly,pro_price_yearly,ultra_price_monthly,ultra_price_yearly")
          .eq("id", 1)
          .single();
        if (settingsError || !settings) {
          console.error("[billing] Configurações de preço indisponíveis:", settingsError?.message);
          return Response.json({ error: "Os preços dos planos ainda não estão configurados." }, { status: 503 });
        }

        const fallback = {
          pro_price_monthly: 49.9,
          pro_price_yearly: 397,
          ultra_price_monthly: 97,
          ultra_price_yearly: 797,
        };
        const key = body.plan === "pro"
          ? body.cycle === "monthly" ? "pro_price_monthly" : "pro_price_yearly"
          : body.cycle === "monthly" ? "ultra_price_monthly" : "ultra_price_yearly";
        const configuredPrice = settings[key];
        const amount = Number.isFinite(Number(configuredPrice)) && Number(configuredPrice) > 0
          ? Number(configuredPrice)
          : fallback[key];

        const externalReference = [authData.user.id, body.plan, body.cycle].join(":");
        const payload = {
          reason: `TUNAVI ${body.plan.toUpperCase()} — cobrança ${body.cycle === "monthly" ? "mensal" : "anual"}`,
          external_reference: externalReference,
          payer_email: authData.user.email,
          back_url: `${appUrl}/planos?checkout=retorno`,
          notification_url: `${appUrl}/api/billing/webhook`,
          status: "pending",
          auto_recurring: {
            frequency: body.cycle === "monthly" ? 1 : 12,
            frequency_type: "months",
            transaction_amount: amount,
            currency_id: "BRL",
          },
        };

        let mpResponse: Response;
        try {
          mpResponse = await fetch("https://api.mercadopago.com/preapproval", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
              "X-Idempotency-Key": crypto.randomUUID(),
            },
            body: JSON.stringify(payload),
          });
        } catch (error) {
          console.error("[billing] Falha de conexão com Mercado Pago:", error);
          return Response.json({ error: "Não foi possível conectar ao Mercado Pago. Tente novamente." }, { status: 502 });
        }

        const result = await mpResponse.json().catch(() => null) as
          | { id?: string; init_point?: string; sandbox_init_point?: string; payer_id?: string | number; message?: string }
          | null;
        const checkoutUrl = result?.init_point || result?.sandbox_init_point;
        if (!mpResponse.ok || !result?.id || !checkoutUrl) {
          console.error("[billing] Mercado Pago recusou a criação da assinatura:", {
            status: mpResponse.status,
            message: result?.message ?? "Resposta inválida",
          });
          return Response.json({ error: "O Mercado Pago não conseguiu iniciar a assinatura. Verifique suas credenciais e tente novamente." }, { status: 502 });
        }

        if (!existingActive) {
          const { error: pendingError } = await supabaseAdmin.from("subscriptions").upsert({
            user_id: authData.user.id,
            plan: body.plan,
            status: "pending",
            provider: "mercadopago",
            mercadopago_subscription_id: result.id,
            mercadopago_payer_id: result.payer_id ? String(result.payer_id) : null,
            current_period_end: null,
            updated_at: new Date().toISOString(),
            note: "Mercado Pago - " + body.cycle + " - aguardando autorização",
          }, { onConflict: "user_id" });
          if (pendingError) {
            console.error("[billing] Não foi possível registrar checkout pendente:", pendingError.message);
            try {
              await fetch("https://api.mercadopago.com/preapproval/" + encodeURIComponent(result.id), {
                method: "PUT",
                headers: { Authorization: "Bearer " + accessToken, "Content-Type": "application/json" },
                body: JSON.stringify({ status: "cancelled" }),
              });
            } catch (cancelError) {
              console.error("[billing] Não foi possível cancelar assinatura órfã:", cancelError);
            }
            return Response.json({ error: "Não foi possível preparar sua assinatura. Nenhuma cobrança foi ativada; tente novamente." }, { status: 500 });
          }
        }

        return Response.json({
          checkoutUrl,
          subscriptionId: result.id,
          plan: body.plan,
          cycle: body.cycle,
          amount,
          currency: "BRL",
        }, {
          headers: { "Cache-Control": "no-store" },
        });
      },
    },
  },
});
