import { createFileRoute } from "@tanstack/react-router";
import { ModuleGate } from "@/components/hud/primitives";
import { ModuleWorkspace } from "@/components/modules/ModuleWorkspace";

export const Route = createFileRoute("/projetos")({
  head: () => ({ meta: [{ title: "Projetos — TUNAVI" }, { name: "description", content: "Projetos na plataforma TUNAVI." }] }),
  component: Page,
});

function Page() {
  return <ModuleGate module="projetos"><ModuleWorkspace section="projetos" /></ModuleGate>;
}
