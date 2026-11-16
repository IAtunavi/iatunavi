import { createFileRoute } from "@tanstack/react-router";
import { ModuleGate } from "@/components/hud/primitives";
import { ModuleWorkspace } from "@/components/modules/ModuleWorkspace";

export const Route = createFileRoute("/desktop")({
  head: () => ({ meta: [{ title: "TUNAVI Desktop — TUNAVI" }, { name: "description", content: "TUNAVI Desktop na plataforma TUNAVI." }] }),
  component: Page,
});

function Page() {
  return <ModuleGate module="desktop"><ModuleWorkspace section="desktop" /></ModuleGate>;
}
