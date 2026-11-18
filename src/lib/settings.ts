import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ModuleKey } from "./modules";
import { MODULES } from "./modules";

export type AppSettings = {
  active_model: string;
  system_prompt: string;
  max_output_tokens: number;
  daily_message_limit: number;
  chat_enabled: boolean;
  maintenance_mode: boolean;
  maintenance_message: string;
  modules: Partial<Record<ModuleKey, boolean>>;
  updated_at: string;
  pro_price_monthly: number;
  pro_price_yearly: number;
  free_daily_limit: number;
  pro_daily_limit: number;
  free_max_tokens: number;
  pro_max_tokens: number;
  trial_days: number;
  pro_modules: ModuleKey[];
  ultra_price_monthly: number;
  ultra_price_yearly: number;
  ultra_daily_limit: number;
  ultra_max_tokens: number;
  ultra_modules: ModuleKey[];
};

export const AI_MODELS: { id: string; label: string; note: string }[] = [
  { id: "openai/gpt-6-astra", label: "GPT-6 Astra", note: "Raciocínio avançado" },
  { id: "openai/gpt-6-sol", label: "GPT-6 Sol", note: "Equilíbrio entre velocidade e capacidade" },
  { id: "openai/gpt-6-luna", label: "GPT-6 Luna", note: "Respostas rápidas" },
  { id: "openai/gpt-5.6-terra", label: "GPT-5.6 Terra", note: "Modelo econômico para uso diário" },
];

export const settingsQueryKey = ["app-settings"] as const;

export function useAppSettings() {
  return useQuery({
    queryKey: settingsQueryKey,
    queryFn: async (): Promise<AppSettings> => {
      const { data, error } = await supabase.from("app_settings").select("*").eq("id", 1).single();
      if (error) throw error;
      return { ...data, modules: (data.modules ?? {}) as AppSettings["modules"], pro_modules: (Array.isArray(data.pro_modules) ? data.pro_modules : []) as ModuleKey[], ultra_modules: (Array.isArray(data.ultra_modules) ? data.ultra_modules : []) as ModuleKey[] };
    },
    staleTime: 30_000,
  });
}

export function isModuleEnabled(settings: AppSettings | undefined, key: ModuleKey) {
  const def = MODULES.find((m) => m.key === key);
  if (!def) return false;
  return settings?.modules?.[key] !== false;
}
