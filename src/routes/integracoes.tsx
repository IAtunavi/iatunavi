import { createFileRoute } from "@tanstack/react-router";
import { ModuleGate } from "@/components/hud/primitives";
import { ModuleWorkspace } from "@/components/modules/ModuleWorkspace";

export const Route = createFileRoute("/integracoes")({
  head: () => ({ meta: [{ title: "Integrações — TUNAVI" }, { name: "description", content: "Integrações na plataforma TUNAVI." }] }),
  component: Page,
});

function Page() {
  return <ModuleGate module="integracoes"><ModuleWorkspace section="integracoes" /></ModuleGate>;
}
