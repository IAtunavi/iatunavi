import { createFileRoute } from "@tanstack/react-router";
import { GlassCard, PageContainer } from "@/components/hud/primitives";

export const Route = createFileRoute("/integracoes")({
  head: () => ({
    meta: [
      { title: "Integrações — TUNAVI" },
      { name: "description", content: "Integrações na plataforma TUNAVI." },
      { property: "og:title", content: "Integrações — TUNAVI" },
      { property: "og:description", content: "Integrações na plataforma TUNAVI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PageContainer>
      <GlassCard className="mx-auto mt-10 max-w-lg text-center">
        <h1 className="text-xl font-semibold text-lav">Integrações</h1>
        <p className="mt-2 text-[13px] text-lav/55">Esta tela ainda está sendo construída.</p>
      </GlassCard>
    </PageContainer>
  );
}
