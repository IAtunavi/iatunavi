import { describe, expect, it } from "vitest";
import { canUse, effectiveTier, isSubscriptionActive, limitsFor } from "@/lib/plans";

const s = { free_daily_limit: 50, pro_daily_limit: 300, ultra_daily_limit: 1000, free_max_tokens: 2048, pro_max_tokens: 8192, ultra_max_tokens: 16384, pro_modules: ["criador", "agentes", "pesquisa"], ultra_modules: ["desktop", "integracoes"] };

describe("planos", () => {
  it("grátis tem 50 mensagens/dia", () => expect(limitsFor("free", s).daily).toBe(50));
  it("pro tem 300 mensagens/dia", () => expect(limitsFor("pro", s).daily).toBe(300));
  it("ultra tem 1000 mensagens/dia", () => expect(limitsFor("ultra", s).daily).toBe(1000));
  it("admin recebe ultra", () => expect(effectiveTier("free", true)).toBe("ultra"));
  it("pro não usa módulo do ultra", () => expect(canUse("pro", "desktop", s)).toBe(false));
  it("pro usa módulo pro", () => expect(canUse("pro", "criador", s)).toBe(true));
  it("grátis não usa módulo pro", () => expect(canUse("free", "agentes", s)).toBe(false));
  it("ultra usa tudo", () => expect(canUse("ultra", "desktop", s) && canUse("ultra", "criador", s)).toBe(true));
  it("assinatura ativa sem data final permanece válida", () => expect(isSubscriptionActive("active", null)).toBe(true));
  it("assinatura vencida não concede acesso", () => expect(isSubscriptionActive("active", "2020-01-01T00:00:00.000Z")).toBe(false));
  it("assinatura cancelada não concede acesso", () => expect(isSubscriptionActive("canceled", null)).toBe(false));
});
