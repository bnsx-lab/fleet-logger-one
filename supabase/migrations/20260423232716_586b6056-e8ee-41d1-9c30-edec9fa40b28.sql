
-- =========================================================
-- ENUMS
-- =========================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'motorista');
CREATE TYPE public.registro_status AS ENUM ('pendente', 'revisado', 'aprovado', 'corrigido', 'cancelado');
CREATE TYPE public.entity_status AS ENUM ('ativo', 'inativo');

-- =========================================================
-- UTILITIES
-- =========================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =========================================================
-- PROFILES
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  telefone TEXT,
  status public.entity_status NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- USER ROLES (separate table — security)
-- =========================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin');
$$;

-- =========================================================
-- HANDLE NEW USER (auto-create profile + default role)
-- =========================================================
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
  -- Papel padrão: motorista. Admins são promovidos manualmente via SQL.
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'motorista');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- EMPRESAS
-- =========================================================
CREATE TABLE public.empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  status public.entity_status NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (nome)
);
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_empresas_updated BEFORE UPDATE ON public.empresas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- POSTOS
-- =========================================================
CREATE TABLE public.postos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  nome TEXT NOT NULL,
  endereco TEXT,
  status public.entity_status NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, nome)
);
ALTER TABLE public.postos ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_postos_empresa ON public.postos(empresa_id);
CREATE TRIGGER trg_postos_updated BEFORE UPDATE ON public.postos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- VEICULOS
-- =========================================================
CREATE TABLE public.veiculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  placa TEXT NOT NULL,
  descricao TEXT,
  status public.entity_status NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, placa)
);
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_veiculos_empresa ON public.veiculos(empresa_id);
CREATE INDEX idx_veiculos_placa ON public.veiculos(placa);
CREATE TRIGGER trg_veiculos_updated BEFORE UPDATE ON public.veiculos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- MOTORISTAS
-- =========================================================
CREATE TABLE public.motoristas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  posto_principal_id UUID REFERENCES public.postos(id) ON DELETE SET NULL,
  nome_exibicao TEXT NOT NULL,
  matricula TEXT,
  status public.entity_status NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.motoristas ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_motoristas_empresa ON public.motoristas(empresa_id);
CREATE INDEX idx_motoristas_profile ON public.motoristas(profile_id);
CREATE TRIGGER trg_motoristas_updated BEFORE UPDATE ON public.motoristas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- MOTORISTA_VEICULOS (vínculo)
-- =========================================================
CREATE TABLE public.motorista_veiculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  motorista_id UUID NOT NULL REFERENCES public.motoristas(id) ON DELETE CASCADE,
  veiculo_id UUID NOT NULL REFERENCES public.veiculos(id) ON DELETE CASCADE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (motorista_id, veiculo_id)
);
ALTER TABLE public.motorista_veiculos ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_mv_motorista ON public.motorista_veiculos(motorista_id);
CREATE INDEX idx_mv_veiculo ON public.motorista_veiculos(veiculo_id);

-- =========================================================
-- REGISTROS
-- =========================================================
CREATE TABLE public.registros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  motorista_id UUID NOT NULL REFERENCES public.motoristas(id) ON DELETE RESTRICT,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  posto_id UUID NOT NULL REFERENCES public.postos(id) ON DELETE RESTRICT,
  veiculo_id UUID NOT NULL REFERENCES public.veiculos(id) ON DELETE RESTRICT,
  data_referencia DATE NOT NULL,
  entrada_at TIMESTAMPTZ NOT NULL,
  saida_at TIMESTAMPTZ NOT NULL,
  km_saida INTEGER NOT NULL CHECK (km_saida >= 0),
  km_volta INTEGER NOT NULL CHECK (km_volta >= 0),
  km_rodados INTEGER NOT NULL DEFAULT 0,
  observacao TEXT,
  status public.registro_status NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_km_volta_gte_saida CHECK (km_volta >= km_saida),
  CONSTRAINT chk_saida_after_entrada CHECK (saida_at > entrada_at)
);
ALTER TABLE public.registros ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_registros_profile ON public.registros(profile_id);
CREATE INDEX idx_registros_motorista ON public.registros(motorista_id);
CREATE INDEX idx_registros_empresa ON public.registros(empresa_id);
CREATE INDEX idx_registros_posto ON public.registros(posto_id);
CREATE INDEX idx_registros_veiculo ON public.registros(veiculo_id);
CREATE INDEX idx_registros_data ON public.registros(data_referencia);
CREATE INDEX idx_registros_status ON public.registros(status);

-- Calcula km_rodados automaticamente
CREATE OR REPLACE FUNCTION public.set_km_rodados()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.km_rodados := NEW.km_volta - NEW.km_saida;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_registros_km BEFORE INSERT OR UPDATE ON public.registros
  FOR EACH ROW EXECUTE FUNCTION public.set_km_rodados();

CREATE TRIGGER trg_registros_updated BEFORE UPDATE ON public.registros
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Anti-duplicidade exata (mesmo motorista/veículo/data/horários)
CREATE UNIQUE INDEX uniq_registros_anti_dup
  ON public.registros(motorista_id, veiculo_id, data_referencia, entrada_at, saida_at);

-- =========================================================
-- AUDITORIA
-- =========================================================
CREATE TABLE public.auditoria_registros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_id UUID NOT NULL REFERENCES public.registros(id) ON DELETE CASCADE,
  alterado_por_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  campo_alterado TEXT,
  valor_anterior TEXT,
  valor_novo TEXT,
  status_anterior public.registro_status,
  status_novo public.registro_status,
  motivo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.auditoria_registros ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_aud_registro ON public.auditoria_registros(registro_id);

-- =========================================================
-- RLS POLICIES
-- =========================================================

-- profiles
CREATE POLICY "profiles self select" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "profiles self update" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "profiles admin insert" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

-- user_roles
CREATE POLICY "roles self select" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "roles admin all" ON public.user_roles
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- empresas: leitura para autenticados, mutações só admin
CREATE POLICY "empresas read auth" ON public.empresas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "empresas admin write" ON public.empresas
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- postos
CREATE POLICY "postos read auth" ON public.postos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "postos admin write" ON public.postos
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- veiculos
CREATE POLICY "veiculos read auth" ON public.veiculos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "veiculos admin write" ON public.veiculos
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- motoristas
CREATE POLICY "motoristas self or admin select" ON public.motoristas
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "motoristas admin write" ON public.motoristas
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- motorista_veiculos
CREATE POLICY "mv self or admin select" ON public.motorista_veiculos
  FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.motoristas m WHERE m.id = motorista_id AND m.profile_id = auth.uid())
  );
CREATE POLICY "mv admin write" ON public.motorista_veiculos
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- registros
CREATE POLICY "registros own select" ON public.registros
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "registros own insert" ON public.registros
  FOR INSERT TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.motoristas m
      WHERE m.id = motorista_id AND m.profile_id = auth.uid() AND m.status = 'ativo'
    )
  );

CREATE POLICY "registros own update pendente" ON public.registros
  FOR UPDATE TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR (profile_id = auth.uid() AND status = 'pendente')
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR (profile_id = auth.uid() AND status = 'pendente')
  );

CREATE POLICY "registros admin delete" ON public.registros
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- auditoria
CREATE POLICY "aud admin select" ON public.auditoria_registros
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "aud admin insert" ON public.auditoria_registros
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) AND alterado_por_profile_id = auth.uid());
