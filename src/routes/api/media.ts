import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { gateAiRequest } from "@/lib/ai/tunavi.server";

const requestIdSchema = z.string().min(1).max(128);

const bodySchema = z.discriminatedUnion("action", [
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

const MODELS = {
  image: "fal-ai/flux-pro/v1.1",
  video: "fal-ai/kling-video/v2.6/pro/text-to-video",
} as const;

type FalError = { detail?: string; message?: string; error?: string };
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

function falErrorMessage(data: FalError, fallback: string) {
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
        const falKey = process.env["FAL_KEY"];
        if (!falKey) {
          return Response.json(
            { error: "A geração visual não está configurada neste ambiente. O administrador precisa configurar FAL_KEY nos secrets do servidor." },
            { status: 503 },
          );
        }

        const base = `https://queue.fal.run/${MODELS[body.mediaType]}`;
        const headers = { Authorization: `Key ${falKey}`, "Content-Type": "application/json" };

        try {
          if (body.action === "submit") {
            const input = body.mediaType === "image"
              ? {
                  prompt: body.prompt,
                  image_size: body.aspectRatio === "16:9"
                    ? "landscape_16_9"
                    : body.aspectRatio === "9:16"
                      ? "portrait_16_9"
                      : "square_hd",
                  num_images: 1,
                  output_format: "png",
                }
              : {
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
            const data = await readJson<{ request_id?: string } & FalError>(response);
            if (!response.ok || !data.request_id) {
              console.error("fal media submit failed", response.status, data);
              return Response.json(
                { error: falErrorMessage(data, "Não foi possível iniciar a criação. Verifique os créditos e a disponibilidade do modelo na fal.ai.") },
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
            const data = await readJson<FalStatus & FalError>(response);
            if (!response.ok) {
              console.error("fal media status failed", response.status, data);
              return Response.json(
                { error: falErrorMessage(data, "Não foi possível consultar o andamento da criação.") },
                { status: 502 },
              );
            }
            return Response.json({ status: (data.status || "IN_QUEUE").toUpperCase() });
          }

          const response = await fetch(endpoint, {
            headers: { Authorization: `Key ${falKey}` },
          });
          const data = await readJson<{
            images?: Array<{ url?: string }>;
            video?: { url?: string };
            videos?: Array<{ url?: string }>;
          } & FalError>(response);
          if (!response.ok) {
            console.error("fal media result failed", response.status, data);
            return Response.json(
              { error: falErrorMessage(data, "A fal.ai não conseguiu entregar o arquivo.") },
              { status: 502 },
            );
          }

          const mediaUrl = body.mediaType === "image"
            ? data.images?.[0]?.url
            : data.video?.url || data.videos?.[0]?.url;
          if (!mediaUrl || !/^https:\/\//i.test(mediaUrl)) {
            return Response.json(
              { error: "A criação terminou, mas o serviço não retornou uma URL válida para o arquivo." },
              { status: 502 },
            );
          }
          return Response.json({ url: mediaUrl, mediaType: body.mediaType });
        } catch (error) {
          console.error("fal media request failed", error);
          return Response.json(
            { error: error instanceof Error ? error.message : "Falha de comunicação com o serviço de criação. Tente novamente." },
            { status: 502 },
          );
        }
      },
    },
  },
});
