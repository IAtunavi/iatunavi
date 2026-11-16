import { createFileRoute } from "@tanstack/react-router";
import { ModuleGate } from "@/components/hud/primitives";
import { ModuleWorkspace } from "@/components/modules/ModuleWorkspace";

export const Route = createFileRoute("/tarefas")({
  head: () => ({ meta: [{ title: "Tarefas — TUNAVI" }, { name: "description", content: "Tarefas na plataforma TUNAVI." }] }),
  component: Page,
});

function Page() {
  return <ModuleGate module="tarefas"><ModuleWorkspace section="tarefas" /></ModuleGate>;
}
