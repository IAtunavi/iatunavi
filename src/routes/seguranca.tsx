import { createFileRoute } from "@tanstack/react-router";
import { ModuleGate } from "@/components/hud/primitives";
import { ModuleWorkspace } from "@/components/modules/ModuleWorkspace";

export const Route = createFileRoute("/seguranca")({
  head: () => ({ meta: [{ title: "Segurança — TUNAVI" }, { name: "description", content: "Segurança na plataforma TUNAVI." }] }),
  component: Page,
});

function Page() {
  return <ModuleGate module="seguranca"><ModuleWorkspace section="seguranca" /></ModuleGate>;
}
