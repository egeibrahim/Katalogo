-- Phase 1: Membership plans + daily export limit tracking

-- 1) Enum for membership plans
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'membership_plan') THEN
    CREATE TYPE public.membership_plan AS ENUM ('individual', 'corporate', 'custom_request');
  END IF;
END $$;

-- 2) user_memberships: one row per user
CREATE TABLE IF NOT EXISTS public.user_memberships (
  user_id UUID PRIMARY KEY,
  plan public.membership_plan NOT NULL DEFAULT 'individual',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_memberships ENABLE ROW LEVEL SECURITY;

-- 3) user_usage_daily: per-user per-day export counter
CREATE TABLE IF NOT EXISTS public.user_usage_daily (
  user_id UUID NOT NULL,
  day DATE NOT NULL,
  exports_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);

ALTER TABLE public.user_usage_daily ENABLE ROW LEVEL SECURITY;

-- 4) Attach updated_at trigger helper (already exists: public.update_updated_at_column)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_user_memberships_updated_at'
  ) THEN
    CREATE TRIGGER trg_user_memberships_updated_at
    BEFORE UPDATE ON public.user_memberships
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_user_usage_daily_updated_at'
  ) THEN
    CREATE TRIGGER trg_user_usage_daily_updated_at
    BEFORE UPDATE ON public.user_usage_daily
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 5) Secure function: atomically consume one export if under limit
CREATE OR REPLACE FUNCTION public.can_consume_export(_user_id UUID, _limit INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_day DATE := (now() AT TIME ZONE 'UTC')::date;
  v_row public.user_usage_daily%ROWTYPE;
BEGIN
  -- Must be called by the same authenticated user
  IF auth.uid() IS NULL OR auth.uid() <> _user_id THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF _limit IS NULL OR _limit < 0 THEN
    RAISE EXCEPTION 'invalid_limit';
  END IF;

  -- Lock row for today if exists
  SELECT * INTO v_row
  FROM public.user_usage_daily
  WHERE user_id = _user_id AND day = v_day
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.user_usage_daily (user_id, day, exports_count)
    VALUES (_user_id, v_day, 0)
    ON CONFLICT (user_id, day) DO NOTHING;

    SELECT * INTO v_row
    FROM public.user_usage_daily
    WHERE user_id = _user_id AND day = v_day
    FOR UPDATE;
  END IF;

  IF v_row.exports_count >= _limit THEN
    RETURN FALSE;
  END IF;

  UPDATE public.user_usage_daily
  SET exports_count = exports_count + 1
  WHERE user_id = _user_id AND day = v_day;

  RETURN TRUE;
END;
$$;

-- 6) RLS policies
-- user_memberships: users can read their own membership; admins can manage all
DROP POLICY IF EXISTS "Users can view own membership" ON public.user_memberships;
CREATE POLICY "Users can view own membership"
ON public.user_memberships
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage memberships" ON public.user_memberships;
CREATE POLICY "Admins can manage memberships"
ON public.user_memberships
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- user_usage_daily: users can view their own usage; no direct writes (writes happen via SECURITY DEFINER function)
DROP POLICY IF EXISTS "Users can view own usage" ON public.user_usage_daily;
CREATE POLICY "Users can view own usage"
ON public.user_usage_daily
FOR SELECT
USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies intentionally.

-- 7) App settings defaults (optional)
INSERT INTO public.app_settings (key, value)
VALUES
  ('individual_export_daily_limit', '3')
ON CONFLICT (key) DO NOTHING;
