CREATE TABLE public.subscriptions (
  user_id uuid PRIMARY KEY,
  plan text NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'active',
  provider text NOT NULL DEFAULT 'manual',
  current_period_end timestamptz,
  note text,
  mercadopago_subscription_id text,
  mercadopago_payer_id text,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own subscription readable" ON public.subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins read subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins insert subscriptions" ON public.subscriptions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update subscriptions" ON public.subscriptions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete subscriptions" ON public.subscriptions FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.is_pro(_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id=_user_id AND plan='pro'
    AND status IN ('active','manual') AND (current_period_end IS NULL OR current_period_end > now()))
$$;

ALTER TABLE public.app_settings
  ADD COLUMN pro_price_monthly numeric NOT NULL DEFAULT 47,
  ADD COLUMN pro_price_yearly numeric NOT NULL DEFAULT 397,
  ADD COLUMN free_daily_limit integer NOT NULL DEFAULT 50,
  ADD COLUMN pro_daily_limit integer NOT NULL DEFAULT 500,
  ADD COLUMN free_max_tokens integer NOT NULL DEFAULT 2048,
  ADD COLUMN pro_max_tokens integer NOT NULL DEFAULT 8192,
  ADD COLUMN trial_days integer NOT NULL DEFAULT 0,
  ADD COLUMN pro_modules jsonb NOT NULL DEFAULT '["criador","desktop","agentes"]'::jsonb;