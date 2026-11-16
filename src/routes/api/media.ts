import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { gateAiRequest } from "@/lib/ai/tunavi.server";

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("submit"),
    mediaType: z.enum(["image", "video"]),
    prompt: z.string().min(3).max(2500),
    aspectRatio: z.enum(["16:9", "1:1", "9:16"]).default("16:9"),
    duration: z.enum(["5", "10"]).optional(),
  }),
  z.object({
    action: z.literal("status"),
    mediaType: z.enum(["image", "video"]),
    requestId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("result"),
    mediaType: z.enum(["image", "video"]),
    requestId: z.string().uuid(),
  }),
]);

const MODELS = {
  image: "fal-ai/flux-pro/v1.1",
  video: "fal-ai/kling-video/v2.6/pro/text-to-video",
} as const;

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

        const gate = await gateAiRequest(request, "criador");
        if ("error" in gate) return gate.error;
        const falKey = process.env["FAL_KEY"];
        if (!falKey) return Response.json({ error: "A geração visual ainda não foi configurada. O administrador precisa adicionar FAL_KEY ao servidor." }, { status: 503 });

        const model = MODELS[body.mediaType];
        const base = `https://queue.fal.run/${model}`;
        const headers = { Authorization: `Key ${falKey}`, "Content-Type": "application/json" };

        try {
          if (body.action === "submit") {
            const input = body.mediaType === "image"
              ? {
                  prompt: body.prompt,
                  image_size: body.aspectRatio === "16:9" ? "landscape_16_9" : body.aspectRatio === "9:16" ? "portrait_16_9" : "square_hd",
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
            const response = await fetch(base, { method: "POST", headers, body: JSON.stringify({ input }) });
            const data = await response.json() as { request_id?: string; detail?: string; message?: string };
            if (!response.ok || !data.request_id) {
              console.error("fal submit failed", response.status, data);
              return Response.json({ error: "Não foi possível iniciar a criação. Verifique a conta e os créditos da fal.ai." }, { status: 502 });
            }
            return Response.json({ requestId: data.request_id });
          }

          const endpoint = `${base}/requests/${body.requestId}`;
          if (body.action === "status") {
            const response = await fetch(`${endpoint}/status`, { headers: { Authorization: `Key ${falKey}` } });
            const data = await response.json() as { status?: string; error?: string };
            if (!response.ok) return Response.json({ error: "Não foi possível consultar o andamento da criação." }, { status: 502 });
            return Response.json({ status: data.status ?? "IN_PROGRESS" });
          }

          const response = await fetch(endpoint, { headers: { Authorization: `Key ${falKey}` } });
          const data = await response.json() as { images?: Array<{ url?: string }>; video?: { url?: string }; error?: string };
          if (!response.ok) return Response.json({ error: "A fal.ai ainda não conseguiu entregar o arquivo." }, { status: 502 });
          const mediaUrl = body.mediaType === "image" ? data.images?.[0]?.url : data.video?.url;
          if (!mediaUrl || !/^https:\/\//.test(mediaUrl)) return Response.json({ error: "A criação terminou, mas o arquivo não foi retornado." }, { status: 502 });
          return Response.json({ url: mediaUrl, mediaType: body.mediaType });
        } catch (error) {
          console.error("fal media request failed", error);
          return Response.json({ error: "Falha de comunicação com o serviço de criação. Tente novamente." }, { status: 502 });
        }
      },
    },
  },
});
