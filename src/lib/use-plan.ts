import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { effectiveTier, isSubscriptionActive, type Tier } from "@/lib/plans";

export type UserPlan = {
  tier: Tier;
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
  isSubscribed: boolean;
  loading: boolean;
};

export function useUserPlan(): UserPlan {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const subscriptionQuery = useQuery({
    queryKey: ["user-plan", user?.id ?? "anonymous"],
    enabled: Boolean(user?.id),
    staleTime: 30_000,
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("subscriptions")
        .select("user_id, plan, status, current_period_end")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(() => {
      void queryClient.invalidateQueries({ queryKey: ["user-plan"] });
    });
    const channel = user?.id
      ? supabase.channel("user-plan-" + user.id)
          .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions", filter: "user_id=eq." + user.id }, () => {
            void queryClient.invalidateQueries({ queryKey: ["user-plan", user.id] });
          })
          .subscribe()
      : null;
    return () => {
      data.subscription.unsubscribe();
      if (channel) void supabase.removeChannel(channel);
    };
  }, [queryClient, user?.id]);

  const row = subscriptionQuery.data;
  const status = row?.status ?? "inactive";
  const plan = row?.plan ?? "free";
  const active = isSubscriptionActive(status, row?.current_period_end);
  const tier = effectiveTier(active ? plan : "free", isAdmin);

  return {
    tier,
    plan,
    status,
    currentPeriodEnd: row?.current_period_end ?? null,
    isSubscribed: active && (plan === "pro" || plan === "ultra"),
    loading: authLoading || (Boolean(user?.id) && subscriptionQuery.isPending),
  };
}
