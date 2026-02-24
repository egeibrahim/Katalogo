-- Yeni kayıt olan kullanıcıya otomatik Free Plan atanır (user_memberships).
-- handle_new_user tetikleyicisi güncellenir.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  -- Profil
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));

  -- Varsayılan rol
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  -- Varsayılan plan: Free (kayıt olan herkes önce Free, ödeme sonrası webhook günceller)
  INSERT INTO public.user_memberships (user_id, plan, status)
  VALUES (NEW.id, 'free'::public.membership_plan, 'active')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;
