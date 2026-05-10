
-- 1. Novos valores de status
ALTER TYPE public.registro_status ADD VALUE IF NOT EXISTS 'rascunho';
ALTER TYPE public.registro_status ADD VALUE IF NOT EXISTS 'em_andamento';
ALTER TYPE public.registro_status ADD VALUE IF NOT EXISTS 'finalizado';

-- 2. Colunas opcionais para fluxo em duas etapas
ALTER TABLE public.registros ALTER COLUMN km_volta DROP NOT NULL;
ALTER TABLE public.registros ALTER COLUMN saida_at DROP NOT NULL;
ALTER TABLE public.registros ADD COLUMN IF NOT EXISTS enviado_at timestamptz;

-- 3. Triggers tolerantes a campos pendentes
CREATE OR REPLACE FUNCTION public.set_km_rodados()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.km_volta IS NOT NULL AND NEW.km_saida IS NOT NULL THEN
    NEW.km_rodados := NEW.km_volta - NEW.km_saida;
  ELSE
    NEW.km_rodados := 0;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_registro()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.km_volta IS NOT NULL AND NEW.km_saida IS NOT NULL AND NEW.km_volta < NEW.km_saida THEN
    RAISE EXCEPTION 'KM da volta não pode ser menor que KM de saída';
  END IF;
  IF NEW.saida_at IS NOT NULL AND NEW.entrada_at IS NOT NULL AND NEW.saida_at < NEW.entrada_at THEN
    RAISE EXCEPTION 'Horário de saída não pode ser anterior ao de entrada';
  END IF;
  RETURN NEW;
END;
$$;

-- garantir triggers ligadas
DROP TRIGGER IF EXISTS trg_set_km_rodados ON public.registros;
CREATE TRIGGER trg_set_km_rodados BEFORE INSERT OR UPDATE ON public.registros
FOR EACH ROW EXECUTE FUNCTION public.set_km_rodados();

DROP TRIGGER IF EXISTS trg_validate_registro ON public.registros;
CREATE TRIGGER trg_validate_registro BEFORE INSERT OR UPDATE ON public.registros
FOR EACH ROW EXECUTE FUNCTION public.validate_registro();

-- 4. Nova tabela registro_fotos
CREATE TABLE IF NOT EXISTS public.registro_fotos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registro_id uuid NOT NULL REFERENCES public.registros(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL,
  foto_path text NOT NULL,
  tipo text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_registro_fotos_registro ON public.registro_fotos(registro_id);
CREATE INDEX IF NOT EXISTS idx_registro_fotos_created ON public.registro_fotos(created_at DESC);

ALTER TABLE public.registro_fotos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fotos select" ON public.registro_fotos;
CREATE POLICY "fotos select" ON public.registro_fotos FOR SELECT TO authenticated
USING (profile_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "fotos insert own" ON public.registro_fotos;
CREATE POLICY "fotos insert own" ON public.registro_fotos FOR INSERT TO authenticated
WITH CHECK (
  profile_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.registros r
    WHERE r.id = registro_fotos.registro_id AND r.profile_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "fotos delete own 24h or admin" ON public.registro_fotos;
CREATE POLICY "fotos delete own 24h or admin" ON public.registro_fotos FOR DELETE TO authenticated
USING (
  public.is_admin(auth.uid()) OR (
    profile_id = auth.uid() AND created_at > now() - interval '24 hours'
  )
);
