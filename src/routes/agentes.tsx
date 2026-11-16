import { createFileRoute } from "@tanstack/react-router";
import { ModuleGate } from "@/components/hud/primitives";
import { ModuleWorkspace } from "@/components/modules/ModuleWorkspace";

export const Route = createFileRoute("/agentes")({
  head: () => ({ meta: [{ title: "Agentes — TUNAVI" }, { name: "description", content: "Agentes na plataforma TUNAVI." }] }),
  component: Page,
});

function Page() {
  return <ModuleGate module="agentes"><ModuleWorkspace section="agentes" /></ModuleGate>;
}
