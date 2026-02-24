-- Yeni kullanıcı kaydında "Database error saving new user" düzeltmesi.
-- 1) user_memberships'e kullanıcının kendi satırını ekleyebilmesi için INSERT policy (trigger/signup sırasında auth.uid() = NEW.id olabiliyor).
-- 2) handle_new_user içinde user_memberships insert hata verirse bile kayıt tamamlansın (EXCEPTION).

-- 1) INSERT policy: kullanıcı sadece kendi user_id'si için tek satır ekleyebilir (signup trigger için)
DROP POLICY IF EXISTS "Users can insert own membership" ON public.user_memberships;
CREATE POLICY "Users can insert own membership"
ON public.user_memberships
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 2) Tetikleyici: user_memberships insert'i hata verirse kayıt yine de tamamlansın
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

  -- Varsayılan plan: Free. Hata olursa (enum/RLS vb.) kayıt yine tamamlansın.
  BEGIN
    INSERT INTO public.user_memberships (user_id, plan, status)
    VALUES (NEW.id, 'free'::public.membership_plan, 'active')
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;

  RETURN NEW;
END;
$$;
