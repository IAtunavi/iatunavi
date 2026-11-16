import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { gateAiRequest } from "@/lib/ai/tunavi.server";

const requestIdSchema = z.string().min(1).max(128);
const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("generate-image"),
    prompt: z.string().trim().min(3).max(2048),
  }),
  z.object({
    action: z.literal("submit"),
    mediaType: z.enum(["image", "video"]),
    prompt: z.string().trim().min(3).max(2500),
    aspectRatio: z.enum(["16:9", "1:1", "9:16"]).default("16:9"),
    duration: z.enum(["5", "10"]).optional(),
  }),
  z.object({
    action: z.literal("status"),
    mediaType: z.enum(["image", "video"]),
    requestId: requestIdSchema,
  }),
  z.object({
    action: z.literal("result"),
    mediaType: z.enum(["image", "video"]),
    requestId: requestIdSchema,
  }),
]);

const VIDEO_MODEL = "fal-ai/kling-video/v2.6/pro/text-to-video";
const IMAGE_MODEL = "@cf/black-forest-labs/flux-1-schnell";

type ProviderError = { detail?: string; message?: string; error?: string };
type FalStatus = { status?: string; error?: string };

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("O serviço de geração retornou uma resposta inválida.");
  }
}

function providerErrorMessage(data: ProviderError, fallback: string) {
  const message = data.detail || data.message || data.error;
  return typeof message === "string" && message.length < 500 ? message : fallback;
}

export const Route = createFileRoute("/api/media")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: z.infer<typeof bodySchema>;
        try {
          body = bodySchema.parse(await request.json());
        } catch {
          return Response.json({ error: "Pedido de criação inválido." }, { status: 400 });
        }

        const gate = await gateAiRequest(request, "criador", false);
        if ("error" in gate) return gate.error;

        if (body.action === "generate-image") {
          const accountId = process.env["CLOUDFLARE_ACCOUNT_ID"];
          const apiToken = process.env["CLOUDFLARE_API_TOKEN"];
          if (!accountId || !apiToken) {
            return Response.json(
              { error: "A geração de imagens ainda não está configurada. O administrador precisa adicionar CLOUDFLARE_ACCOUNT_ID e CLOUDFLARE_API_TOKEN nos secrets do servidor." },
              { status: 503 },
            );
          }

          try {
            const response = await fetch(
              `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${IMAGE_MODEL}`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${apiToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ prompt: body.prompt, steps: 4 }),
              },
            );
            const data = await readJson<{
              success?: boolean;
              result?: { image?: string };
              errors?: Array<{ message?: string }>;
            }>(response);
            const image = data.result?.image;
            if (!response.ok || !data.success || !image) {
              const providerMessage = data.errors?.map((item) => item.message).filter(Boolean).join("; ");
              console.error("Cloudflare image generation failed", response.status, data.errors);
              return Response.json(
                { error: providerMessage || "A Cloudflare não conseguiu gerar a imagem. Verifique o limite diário e a configuração da conta." },
                { status: response.status === 429 ? 429 : 502 },
              );
            }
            return Response.json({ url: `data:image/jpeg;base64,${image}`, mediaType: "image" });
          } catch (error) {
            console.error("Cloudflare image request failed", error);
            return Response.json(
              { error: error instanceof Error ? error.message : "Falha de comunicação com a Cloudflare. Tente novamente." },
              { status: 502 },
            );
          }
        }

        const falKey = process.env["FAL_KEY"];
        if (!falKey) {
          return Response.json(
            { error: "A geração de vídeos não está configurada neste ambiente. O administrador precisa configurar FAL_KEY nos secrets do servidor." },
            { status: 503 },
          );
        }

        const base = `https://queue.fal.run/${VIDEO_MODEL}`;
        const headers = { Authorization: `Key ${falKey}`, "Content-Type": "application/json" };

        try {
          if (body.action === "submit") {
            const input = {
              prompt: body.prompt,
              aspect_ratio: body.aspectRatio,
              duration: body.duration ?? "5",
              generate_audio: false,
              enable_safety_checker: true,
            };
            const response = await fetch(base, {
              method: "POST",
              headers,
              body: JSON.stringify(input),
            });
            const data = await readJson<{ request_id?: string } & ProviderError>(response);
            if (!response.ok || !data.request_id) {
              console.error("fal video submit failed", response.status, data);
              return Response.json(
                { error: providerErrorMessage(data, "Não foi possível iniciar a criação do vídeo. Verifique os créditos e a disponibilidade do modelo na fal.ai.") },
                { status: 502 },
              );
            }
            return Response.json({ requestId: data.request_id });
          }

          const endpoint = `${base}/requests/${encodeURIComponent(body.requestId)}`;
          if (body.action === "status") {
            const response = await fetch(`${endpoint}/status`, {
              headers: { Authorization: `Key ${falKey}` },
            });
            const data = await readJson<FalStatus & ProviderError>(response);
            if (!response.ok) {
              console.error("fal video status failed", response.status, data);
              return Response.json(
                { error: providerErrorMessage(data, "Não foi possível consultar o andamento do vídeo.") },
                { status: 502 },
              );
            }
            return Response.json({ status: (data.status || "IN_QUEUE").toUpperCase() });
          }

          const response = await fetch(endpoint, {
            headers: { Authorization: `Key ${falKey}` },
          });
          const data = await readJson<{
            video?: { url?: string };
            videos?: Array<{ url?: string }>;
          } & ProviderError>(response);
          if (!response.ok) {
            console.error("fal video result failed", response.status, data);
            return Response.json(
              { error: providerErrorMessage(data, "A fal.ai não conseguiu entregar o vídeo.") },
              { status: 502 },
            );
          }

          const mediaUrl = data.video?.url || data.videos?.[0]?.url;
          if (!mediaUrl || !/^https:\/\//i.test(mediaUrl)) {
            return Response.json(
              { error: "A criação terminou, mas o serviço não retornou uma URL válida para o vídeo." },
              { status: 502 },
            );
          }
          return Response.json({ url: mediaUrl, mediaType: "video" });
        } catch (error) {
          console.error("fal video request failed", error);
          return Response.json(
            { error: error instanceof Error ? error.message : "Falha de comunicação com o serviço de vídeo. Tente novamente." },
            { status: 502 },
          );
        }
      },
    },
  },
});
