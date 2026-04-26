
-- 1. Default profile status = inativo (pendente)
ALTER TABLE public.profiles ALTER COLUMN status SET DEFAULT 'inativo'::entity_status;

-- 2. Coluna foto_path em registros
ALTER TABLE public.registros ADD COLUMN IF NOT EXISTS foto_path text;

-- 3. Bucket de fotos
INSERT INTO storage.buckets (id, name, public)
VALUES ('registro-fotos', 'registro-fotos', true)
ON CONFLICT (id) DO NOTHING;

-- Policies para storage.objects do bucket registro-fotos
DROP POLICY IF EXISTS "registro-fotos public read" ON storage.objects;
CREATE POLICY "registro-fotos public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'registro-fotos');

DROP POLICY IF EXISTS "registro-fotos owner insert" ON storage.objects;
CREATE POLICY "registro-fotos owner insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'registro-fotos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "registro-fotos owner update" ON storage.objects;
CREATE POLICY "registro-fotos owner update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'registro-fotos'
  AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin(auth.uid()))
);

DROP POLICY IF EXISTS "registro-fotos owner delete" ON storage.objects;
CREATE POLICY "registro-fotos owner delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'registro-fotos'
  AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin(auth.uid()))
);

-- 4. Atualizar policy de UPDATE em registros: motorista pode editar dentro de 24h
DROP POLICY IF EXISTS "registros own update pendente" ON public.registros;
CREATE POLICY "registros own update 24h or admin"
ON public.registros
FOR UPDATE
TO authenticated
USING (
  is_admin(auth.uid())
  OR (profile_id = auth.uid() AND created_at > (now() - interval '24 hours'))
)
WITH CHECK (
  is_admin(auth.uid())
  OR (profile_id = auth.uid() AND created_at > (now() - interval '24 hours'))
);

-- 5. Permitir motorista deletar a própria foto via UPDATE (não nova policy precisa) ok.

-- 6. Atualizar handle_new_user para garantir profile inativo
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_empresa_id uuid := '00000000-0000-0000-0000-000000000001';
  v_posto_id   uuid := '00000000-0000-0000-0000-000000000002';
  v_nome       text;
  v_is_super   boolean;
BEGIN
  v_nome := COALESCE(NEW.raw_user_meta_data ->> 'nome', split_part(NEW.email, '@', 1));
  v_is_super := (NEW.email = 'breno.fred.1321@gmail.com');

  INSERT INTO public.profiles (id, nome, email, status)
  VALUES (
    NEW.id,
    v_nome,
    NEW.email,
    CASE WHEN v_is_super THEN 'ativo'::entity_status ELSE 'inativo'::entity_status END
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'motorista')
  ON CONFLICT DO NOTHING;

  IF v_is_super THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.motoristas (profile_id, empresa_id, posto_principal_id, nome_exibicao, status)
  VALUES (NEW.id, v_empresa_id, v_posto_id, v_nome, 'ativo')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$function$;
