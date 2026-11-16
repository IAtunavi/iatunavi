import { createFileRoute } from "@tanstack/react-router";
import { ModuleGate } from "@/components/hud/primitives";
import { ModuleWorkspace } from "@/components/modules/ModuleWorkspace";

export const Route = createFileRoute("/criador")({
  head: () => ({ meta: [{ title: "Criador — TUNAVI" }, { name: "description", content: "Criador na plataforma TUNAVI." }] }),
  component: Page,
});

function Page() {
  return <ModuleGate module="criador"><ModuleWorkspace section="criador" /></ModuleGate>;
}
