
-- 1) Seed empresa ASERP e posto SMSUB (idempotente)
INSERT INTO public.empresas (id, nome, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'ASERP', 'ativo')
ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome;

INSERT INTO public.postos (id, empresa_id, nome, status)
VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'SMSUB', 'ativo')
ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, empresa_id = EXCLUDED.empresa_id;

-- 2) Atualizar handle_new_user para também criar motorista vinculado a ASERP/SMSUB
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
BEGIN
  v_nome := COALESCE(NEW.raw_user_meta_data ->> 'nome', split_part(NEW.email, '@', 1));

  INSERT INTO public.profiles (id, nome, email)
  VALUES (NEW.id, v_nome, NEW.email)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'motorista')
  ON CONFLICT DO NOTHING;

  IF NEW.email = 'breno.fred.1321@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Vincula automaticamente o motorista à empresa ASERP / posto SMSUB
  INSERT INTO public.motoristas (profile_id, empresa_id, posto_principal_id, nome_exibicao, status)
  VALUES (NEW.id, v_empresa_id, v_posto_id, v_nome, 'ativo')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$function$;

-- Trigger no auth.users (criado se ainda não existir)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill: criar motorista para usuários existentes que ainda não tenham
INSERT INTO public.motoristas (profile_id, empresa_id, posto_principal_id, nome_exibicao, status)
SELECT p.id,
       '00000000-0000-0000-0000-000000000001'::uuid,
       '00000000-0000-0000-0000-000000000002'::uuid,
       COALESCE(NULLIF(p.nome, ''), split_part(p.email, '@', 1)),
       'ativo'
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.motoristas m WHERE m.profile_id = p.id);

-- 3) Trigger para calcular km_rodados automaticamente em registros
DROP TRIGGER IF EXISTS trg_set_km_rodados ON public.registros;
CREATE TRIGGER trg_set_km_rodados
BEFORE INSERT OR UPDATE ON public.registros
FOR EACH ROW EXECUTE FUNCTION public.set_km_rodados();

-- 4) Validações de KM e horário (saída>=entrada) via trigger
CREATE OR REPLACE FUNCTION public.validate_registro()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.km_volta < NEW.km_saida THEN
    RAISE EXCEPTION 'KM da volta não pode ser menor que KM de saída';
  END IF;
  IF NEW.saida_at < NEW.entrada_at THEN
    RAISE EXCEPTION 'Horário de saída não pode ser anterior ao de entrada';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_registro ON public.registros;
CREATE TRIGGER trg_validate_registro
BEFORE INSERT OR UPDATE ON public.registros
FOR EACH ROW EXECUTE FUNCTION public.validate_registro();

-- 5) Updated_at triggers para todas as tabelas
DROP TRIGGER IF EXISTS trg_updated_at_profiles ON public.profiles;
CREATE TRIGGER trg_updated_at_profiles BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_updated_at_empresas ON public.empresas;
CREATE TRIGGER trg_updated_at_empresas BEFORE UPDATE ON public.empresas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_updated_at_postos ON public.postos;
CREATE TRIGGER trg_updated_at_postos BEFORE UPDATE ON public.postos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_updated_at_veiculos ON public.veiculos;
CREATE TRIGGER trg_updated_at_veiculos BEFORE UPDATE ON public.veiculos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_updated_at_motoristas ON public.motoristas;
CREATE TRIGGER trg_updated_at_motoristas BEFORE UPDATE ON public.motoristas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_updated_at_registros ON public.registros;
CREATE TRIGGER trg_updated_at_registros BEFORE UPDATE ON public.registros
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6) Permitir motorista cadastrar/buscar veículo livremente (placa livre no formulário)
DROP POLICY IF EXISTS "veiculos motorista insert" ON public.veiculos;
CREATE POLICY "veiculos motorista insert"
ON public.veiculos
FOR INSERT TO authenticated
WITH CHECK (true);

-- 7) Constraint para evitar duplicidade básica (mesmo motorista, mesma data, mesmo veículo)
ALTER TABLE public.registros DROP CONSTRAINT IF EXISTS registros_unico_motorista_data_veiculo;
ALTER TABLE public.registros
ADD CONSTRAINT registros_unico_motorista_data_veiculo
UNIQUE (motorista_id, data_referencia, veiculo_id);

-- 8) Índices úteis para filtros e listagens
CREATE INDEX IF NOT EXISTS idx_registros_data_ref ON public.registros (data_referencia DESC);
CREATE INDEX IF NOT EXISTS idx_registros_status ON public.registros (status);
CREATE INDEX IF NOT EXISTS idx_registros_motorista ON public.registros (motorista_id);
CREATE INDEX IF NOT EXISTS idx_registros_empresa ON public.registros (empresa_id);
CREATE INDEX IF NOT EXISTS idx_registros_posto ON public.registros (posto_id);
CREATE INDEX IF NOT EXISTS idx_registros_veiculo ON public.registros (veiculo_id);
CREATE INDEX IF NOT EXISTS idx_veiculos_placa ON public.veiculos (placa);
