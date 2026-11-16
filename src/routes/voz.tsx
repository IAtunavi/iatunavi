import { createFileRoute } from "@tanstack/react-router";
import { ModuleGate } from "@/components/hud/primitives";
import { ModuleWorkspace } from "@/components/modules/ModuleWorkspace";

export const Route = createFileRoute("/voz")({
  head: () => ({ meta: [{ title: "Voz — TUNAVI" }, { name: "description", content: "Voz na plataforma TUNAVI." }] }),
  component: Page,
});

function Page() {
  return <ModuleGate module="voz"><ModuleWorkspace section="voz" /></ModuleGate>;
}
