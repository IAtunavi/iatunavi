import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { createPersisted } from "@/lib/persisted";
import { prefsStore } from "@/lib/data";
import { useAppSettings } from "@/lib/settings";
import { Header } from "./Header";
import { Sidebar, SidebarNav } from "./Sidebar";
import { ChatBridge } from "./ChatBridge";

const layoutStore = createPersisted("layout", { collapsed: false });

export function AppShell({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  const layout = layoutStore.useValue();
  const prefs = prefsStore.useValue();
  const { data: settings } = useAppSettings();

  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", prefs.reducedMotion);
  }, [prefs.reducedMotion]);

  return (
    <div className="relative flex min-h-dvh flex-col bg-ink stage-bg bg-fixed">
      <ChatBridge />
      <Header onOpenNav={() => setNavOpen(true)} />
      {settings?.maintenance_mode && (
        <div className="flex items-center justify-center gap-2 border-b border-warning/20 bg-warning/10 px-4 py-2 text-center text-[12px] text-warning" role="status">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {settings.maintenance_message}
        </div>
      )}
      <div className="flex flex-1">
        <Sidebar collapsed={layout.collapsed} onToggle={() => layoutStore.set((l) => ({ collapsed: !l.collapsed }))} />
        <main id="conteudo" className="min-w-0 flex-1">
          {children}
        </main>
      </div>

      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent side="left" className="flex w-[260px] flex-col border-lav/10 bg-ink p-4 pt-5">
          <SheetTitle className="mb-4 flex items-center gap-2.5">
            <span className="h-6 w-6 rounded-full orb-gradient" />
            <span className="text-[14px] font-semibold tracking-[0.28em] text-lav">TUNAVI</span>
          </SheetTitle>
          <SidebarNav onNavigate={() => setNavOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
