
-- Atualiza handle_new_user para promover o admin inicial automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', ''),
    NEW.email
  );

  -- Papel padrão: motorista
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'motorista')
  ON CONFLICT DO NOTHING;

  -- Admin inicial fixo (promoção automática)
  IF NEW.email = 'breno.fred.1321@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Garantia: se o usuário já existir agora, promove
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email = 'breno.fred.1321@gmail.com'
ON CONFLICT DO NOTHING;
