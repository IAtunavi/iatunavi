ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS ultra_price_monthly numeric NOT NULL DEFAULT 97,
  ADD COLUMN IF NOT EXISTS ultra_price_yearly numeric NOT NULL DEFAULT 797,
  ADD COLUMN IF NOT EXISTS ultra_daily_limit integer NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS ultra_max_tokens integer NOT NULL DEFAULT 16384,
  ADD COLUMN IF NOT EXISTS ultra_modules jsonb NOT NULL DEFAULT '["desktop","integracoes"]'::jsonb;

UPDATE public.app_settings SET pro_price_monthly = 49.90, pro_daily_limit = 300, pro_modules = '["criador","agentes","pesquisa"]'::jsonb WHERE id = 1;

CREATE OR REPLACE FUNCTION public.current_plan(_user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT plan FROM public.subscriptions
    WHERE user_id = _user_id AND plan IN ('pro','ultra')
      AND status IN ('active','manual')
      AND (current_period_end IS NULL OR current_period_end > now())
  ), 'free')
$$;

CREATE OR REPLACE FUNCTION public.is_pro(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.current_plan(_user_id) IN ('pro','ultra')
$$;