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
};

export const AI_MODELS: { id: string; label: string; note: string }[] = [
  { id: "openai/gpt-6-astra", label: "GPT-6 Astra", note: "Mais capaz — raciocínio profundo (padrão)" },
  { id: "openai/gpt-6-sol", label: "GPT-6 Sol", note: "Equilíbrio entre qualidade e custo" },
  { id: "openai/gpt-6-luna", label: "GPT-6 Luna", note: "Rápido e econômico" },
  { id: "openai/gpt-5.6-terra", label: "GPT-5.6 Terra", note: "Uso diário com custo menor" },
  { id: "openai/chat-latest", label: "ChatGPT (Instant)", note: "Conversa natural, sem raciocínio" },
];

export const settingsQueryKey = ["app-settings"] as const;

export function useAppSettings() {
  return useQuery({
    queryKey: settingsQueryKey,
    queryFn: async (): Promise<AppSettings> => {
      const { data, error } = await supabase.from("app_settings").select("*").eq("id", 1).single();
      if (error) throw error;
      return { ...data, modules: (data.modules ?? {}) as AppSettings["modules"] };
    },
    staleTime: 30_000,
  });
}

export function isModuleEnabled(settings: AppSettings | undefined, key: ModuleKey) {
  const def = MODULES.find((m) => m.key === key);
  if (def?.core) return true;
  return settings?.modules?.[key] !== false;
}
