export type Tier = "free" | "pro" | "ultra";

export type PlanSettings = {
  free_daily_limit: number; pro_daily_limit: number; ultra_daily_limit: number;
  free_max_tokens: number; pro_max_tokens: number; ultra_max_tokens: number;
  pro_modules: string[]; ultra_modules: string[];
};

export const TIER_LABEL: Record<Tier, string> = { free: "Grátis", pro: "Pro", ultra: "Ultra" };

/** Admins always get Ultra access. */
export function effectiveTier(plan: string | null | undefined, isAdmin: boolean): Tier {
  if (isAdmin) return "ultra";
  return plan === "ultra" || plan === "pro" ? plan : "free";
}

export function limitsFor(tier: Tier, s: PlanSettings) {
  return {
    daily: tier === "ultra" ? s.ultra_daily_limit : tier === "pro" ? s.pro_daily_limit : s.free_daily_limit,
    tokens: tier === "ultra" ? s.ultra_max_tokens : tier === "pro" ? s.pro_max_tokens : s.free_max_tokens,
  };
}

/** Returns the tier required for a module, or null when it's free. Ultra modules win over Pro. */
export function requiredTier(module: string, s: Pick<PlanSettings, "pro_modules" | "ultra_modules">): Tier | null {
  if (s.ultra_modules.includes(module)) return "ultra";
  if (s.pro_modules.includes(module)) return "pro";
  return null;
}

const RANK: Record<Tier, number> = { free: 0, pro: 1, ultra: 2 };
export function canUse(tier: Tier, module: string, s: Pick<PlanSettings, "pro_modules" | "ultra_modules">) {
  const need = requiredTier(module, s);
  return !need || RANK[tier] >= RANK[need];
}
