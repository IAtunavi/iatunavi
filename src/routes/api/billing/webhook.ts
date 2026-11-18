import { createFileRoute } from "@tanstack/react-router";

function safeEqualHex(a: string, b: string): boolean {
  if (!/^[0-9a-f]{64}$/i.test(a) || !/^[0-9a-f]{64}$/i.test(b)) return false;
  const left = new Uint8Array(a.match(/.{2}/g)!.map((v) => Number.parseInt(v ?? "00", 16)));
  const right = new Uint8Array(b.match(/.{2}/g)!.map((v) => Number.parseInt(v, 16)));
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  return diff === 0;
}

async function verifySignature(request: Request, dataId: string, secret: string): Promise<boolean> {
  const signature = request.headers.get("x-signature") ?? "";
  const requestId = request.headers.get("x-request-id") ?? "";
  const parts = Object.fromEntries(signature.split(",").map((part) => {
    const [key, ...value] = part.trim().split("=");
    return [key, value.join("=")];
  }));
  const timestamp = parts["ts"];
  const received = parts["v1"];
  if (!timestamp || !received || !requestId || !dataId) return false;
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${timestamp};`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(manifest));
  const expected = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return safeEqualHex(expected, received);
}

export const Route = createFileRoute("/api/billing/webhook" as never)({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const accessToken = process.env["MP_ACCESS_TOKEN"]?.trim();
        const webhookSecret = process.env["MP_WEBHOOK_SECRET"]?.trim();
        if (!accessToken || !webhookSecret) {
          console.error("[billing webhook] Segredos do Mercado Pago ausentes.");
          return Response.json({ error: "Webhook não configurado." }, { status: 503 });
        }

        const url = new URL(request.url);
        let body: { type?: string; action?: string; data?: { id?: string } };
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "JSON inválido." }, { status: 400 });
        }
        const dataId = url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? body.data?.id ?? "";
        if (!dataId || !/^\d+$/.test(dataId)) {
          return Response.json({ received: true, ignored: "missing_resource_id" });
        }

        const valid = await verifySignature(request, dataId, webhookSecret);
        if (!valid) {
          console.warn("[billing webhook] Assinatura inválida.");
          return Response.json({ error: "Assinatura inválida." }, { status: 401 });
        }

        const eventType = body.type ?? url.searchParams.get("type") ?? "";
        if (eventType && !["subscription_preapproval", "preapproval"].includes(eventType)) {
          return Response.json({ received: true, ignored: "unsupported_event" });
        }

        let mpResponse: Response;
        try {
          mpResponse = await fetch(`https://api.mercadopago.com/preapproval/${encodeURIComponent(dataId)}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
        } catch (error) {
          console.error("[billing webhook] Falha ao consultar assinatura:", error);
          return Response.json({ error: "Falha temporária ao consultar assinatura." }, { status: 502 });
        }
        const subscription = await mpResponse.json().catch(() => null) as {
          id?: string;
          status?: string;
          external_reference?: string;
          payer_id?: string | number;
          next_payment_date?: string;
          date_created?: string;
        } | null;
        if (!mpResponse.ok || !subscription?.id || subscription.id !== dataId) {
          console.error("[billing webhook] Não foi possível confirmar a assinatura no provedor.");
          return Response.json({ error: "Não foi possível confirmar a assinatura." }, { status: 502 });
        }

        const reference = subscription.external_reference ?? "";
        const [userId, plan, cycle] = reference.split(":");
        if (!userId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)
          || (plan !== "pro" && plan !== "ultra") || (cycle !== "monthly" && cycle !== "yearly")) {
          console.error("[billing webhook] Referência externa inválida.");
          return Response.json({ error: "Referência externa inválida." }, { status: 422 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: current, error: readError } = await supabaseAdmin
          .from("subscriptions")
          .select("mercadopago_subscription_id,updated_at,plan,status,current_period_end")
          .eq("user_id", userId)
          .maybeSingle();
        if (readError) {
          console.error("[billing webhook] Falha ao ler assinatura atual:", readError.message);
          return Response.json({ error: "Falha ao ler assinatura atual." }, { status: 500 });
        }

        if (current?.mercadopago_subscription_id && current.mercadopago_subscription_id !== subscription.id) {
          const tierRank = (value: string | null | undefined) => value === "ultra" ? 2 : value === "pro" ? 1 : 0;
          const currentStillActive = ["active", "authorized", "trialing"].includes(current.status ?? "")
            && (!current.current_period_end || Date.parse(current.current_period_end) > Date.now());
          const isUpgrade = tierRank(plan) > tierRank(current.plan);
          const isReplacementAfterEnd = !currentStillActive;
          // Keep an existing paid tier until the upgrade is actually authorized.
          if (currentStillActive && isUpgrade && subscription.status !== "authorized") {
            return Response.json({ received: true, ignored: "upgrade_not_authorized_yet" });
          }
          // Never let a stale lower-tier event downgrade a newer subscription.
          if (!isUpgrade && !isReplacementAfterEnd) {
            return Response.json({ received: true, ignored: "superseded_subscription" });
          }
        }

        const statusMap: Record<string, string> = {
          authorized: "active",
          pending: "pending",
          paused: "paused",
          cancelled: "canceled",
          canceled: "canceled",
        };
        const status = statusMap[subscription.status ?? ""] ?? "pending";
        const nextPayment = subscription.next_payment_date && Number.isFinite(Date.parse(subscription.next_payment_date))
          ? new Date(subscription.next_payment_date).toISOString()
          : null;
        const { error: writeError } = await supabaseAdmin.from("subscriptions").upsert({
          user_id: userId,
          plan,
          status,
          provider: "mercadopago",
          mercadopago_subscription_id: subscription.id,
          mercadopago_payer_id: subscription.payer_id ? String(subscription.payer_id) : null,
          current_period_end: nextPayment,
          updated_at: new Date().toISOString(),
          note: `Mercado Pago · ${cycle} · ${subscription.status ?? "unknown"}`,
        }, { onConflict: "user_id" });
        if (writeError) {
          console.error("[billing webhook] Falha ao persistir assinatura:", writeError.message);
          return Response.json({ error: "Não foi possível atualizar a assinatura." }, { status: 500 });
        }

        return Response.json({ received: true, status });
      },
    },
  },
});
