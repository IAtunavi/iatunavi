import { useEffect, useState } from "react";
import { prefsStore } from "@/lib/data";

export function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  const prefs = prefsStore.useValue();
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!now) return <div className="h-[34px] w-[72px]" aria-hidden />;
  const h = prefs.clock24 ? now.getHours() : now.getHours() % 12 || 12;
  const hm = `${String(h).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const s = String(now.getSeconds()).padStart(2, "0");
  const wd = now.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "").slice(0, 3);
  const mo = now.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "").slice(0, 3);
  return (
    <time className="block text-right font-mono" dateTime={now.toISOString()}>
      <div className="text-[15px] tracking-wider text-lav">
        {hm}
        <span className="text-lav/40">:{s}</span>
      </div>
      <div className="text-[10px] uppercase tracking-[0.15em] text-lav/40">
        {wd} {now.getDate()} {mo}
      </div>
    </time>
  );
}
