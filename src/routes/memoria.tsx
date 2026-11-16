import { createFileRoute } from "@tanstack/react-router";
import { ModuleGate } from "@/components/hud/primitives";
import { ModuleWorkspace } from "@/components/modules/ModuleWorkspace";

export const Route = createFileRoute("/memoria")({
  head: () => ({ meta: [{ title: "Memória — TUNAVI" }, { name: "description", content: "Memória na plataforma TUNAVI." }] }),
  component: Page,
});

function Page() {
  return <ModuleGate module="memoria"><ModuleWorkspace section="memoria" /></ModuleGate>;
}
