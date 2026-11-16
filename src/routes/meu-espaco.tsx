import { createFileRoute } from "@tanstack/react-router";
import { ModuleGate } from "@/components/hud/primitives";
import { ModuleWorkspace } from "@/components/modules/ModuleWorkspace";

export const Route = createFileRoute("/meu-espaco")({
  head: () => ({ meta: [{ title: "Meu espaço — TUNAVI" }, { name: "description", content: "Meu espaço na plataforma TUNAVI." }] }),
  component: Page,
});

function Page() {
  return <ModuleGate module="meu-espaco"><ModuleWorkspace section="meu-espaco" /></ModuleGate>;
}
