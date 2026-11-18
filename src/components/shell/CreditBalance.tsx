import { useQuery } from "@tanstack/react-query";
import { Coins } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { authHeaders } from "@/lib/ai-context";
import { useAuth } from "@/lib/auth";

type CreditBalanceData = {
  used: number;
  limit: number | null;
  remaining: number | null;
  tier: string;
  resetAt: string;
};

export function CreditBalance() {
  const { user } = useAuth();
  const balance = useQuery({
    queryKey: ["credit-balance", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<CreditBalanceData> => {
      const response = await fetch("/api/credits", { headers: await authHeaders(), cache: "no-store" });
      const data = await response.json() as CreditBalanceData & { error?: string };
      if (!response.ok) throw new Error(data.error || "Não foi possível carregar os créditos.");
      return data;
    },
    staleTime: 10_000,
    refetchInterval: 30_000,
    retry: 1,
  });

  if (!user) return null;
  const data = balance.data;
  const low = data?.remaining !== null && data?.remaining !== undefined && data.limit !== null && data.remaining <= Math.max(3, Math.ceil(data.limit * 0.15));

  return (
    <Link
      to="/planos"
      title={balance.isError ? "Não foi possível consultar seus créditos" : data?.limit === null ? "Uso ilimitado" : data ? `Renova às ${new Date(data.resetAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "Consultando saldo de créditos"}
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-vio/30 bg-vio/10 px-2.5 text-[11px] text-lav transition hover:bg-vio/20 sm:px-3"
      aria-label={balance.isError ? "Saldo de créditos indisponível" : data?.limit === null ? "Créditos ilimitados" : `${data?.remaining ?? "…"} créditos restantes`}
    >
      <Coins className={`h-3.5 w-3.5 ${low ? "text-amber-300" : "text-vio"}`} />
      <span className="font-mono tabular-nums">
        {balance.isLoading ? "…" : balance.isError ? "—" : data?.limit === null ? "Ilimitado" : `${data?.remaining ?? 0}/${data?.limit ?? 0}`}
      </span>
      <span className="hidden text-lav/45 sm:inline">créditos</span>
    </Link>
  );
}
