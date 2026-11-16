import { createFileRoute } from "@tanstack/react-router";
import { ModuleGate } from "@/components/hud/primitives";
import { ModuleWorkspace } from "@/components/modules/ModuleWorkspace";

export const Route = createFileRoute("/pesquisa")({
  head: () => ({ meta: [{ title: "Pesquisa e inteligência — TUNAVI" }, { name: "description", content: "Pesquisa e inteligência na plataforma TUNAVI." }] }),
  component: Page,
});

function Page() {
  return <ModuleGate module="pesquisa"><ModuleWorkspace section="pesquisa" /></ModuleGate>;
}
