import { createFileRoute } from "@tanstack/react-router";
import { ModuleGate } from "@/components/hud/primitives";
import { ModuleWorkspace } from "@/components/modules/ModuleWorkspace";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — TUNAVI" }, { name: "description", content: "Configurações na plataforma TUNAVI." }] }),
  component: Page,
});

function Page() {
  return <ModuleGate module="configuracoes"><ModuleWorkspace section="configuracoes" /></ModuleGate>;
}
