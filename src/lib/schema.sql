-- ====================================================================
-- SCRIPT DE CRIAÇÃO DO BANCO DE DADOS - TORRES & SILVA (SUPABASE/POSTGRESQL)
-- ====================================================================

-- Habilitar extensão UUID-OSSP
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA PRINCIPAL DE USUÁRIOS (Sincronizada com Supabase Auth)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'lawyer', 'client')),
    phone VARCHAR(50),
    lgpd_consent BOOLEAN DEFAULT FALSE NOT NULL,
    consent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Habilitar RLS em Users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. TABELA DE ADVOGADOS
CREATE TABLE public.lawyers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    oab_number VARCHAR(50) UNIQUE NOT NULL,
    specialty VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.lawyers ENABLE ROW LEVEL SECURITY;

-- 3. TABELA DE CLIENTES
CREATE TABLE public.clients (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    cpf_cnpj VARCHAR(20) UNIQUE NOT NULL,
    address TEXT,
    client_type VARCHAR(20) CHECK (client_type IN ('individual', 'corporate')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- 4. TABELA DE PROCESSOS
CREATE TABLE public.lawsuits (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    process_number VARCHAR(100) UNIQUE NOT NULL,
    court VARCHAR(255) NOT NULL,
    comarca VARCHAR(255) NOT NULL,
    lawsuit_class VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Suspenso', 'Arquivado')) NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE RESTRICT NOT NULL,
    lawyer_id UUID REFERENCES public.lawyers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.lawsuits ENABLE ROW LEVEL SECURITY;

-- 5. TABELA DE PRAZOS
CREATE TABLE public.deadlines (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lawsuit_id UUID REFERENCES public.lawsuits(id) ON DELETE CASCADE NOT NULL,
    description TEXT NOT NULL,
    deadline_date DATE NOT NULL,
    priority VARCHAR(20) CHECK (priority IN ('high', 'medium', 'low')) NOT NULL,
    status VARCHAR(20) DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Concluído', 'Atrasado')) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.deadlines ENABLE ROW LEVEL SECURITY;

-- 6. TABELA DE DOCUMENTOS
CREATE TABLE public.documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lawsuit_id UUID REFERENCES public.lawsuits(id) ON DELETE CASCADE NOT NULL,
    uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(10) CHECK (file_type IN ('pdf', 'png', 'jpg', 'jpeg')) NOT NULL,
    file_size VARCHAR(50),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- 7. LINHA DO TEMPO (ATUALIZAÇÕES LEIGAS PARA CLIENTES)
CREATE TABLE public.timeline_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lawsuit_id UUID REFERENCES public.lawsuits(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description_leiga TEXT NOT NULL,
    event_date VARCHAR(100) NOT NULL, -- "Em andamento", "15 Mar 2024", etc.
    status VARCHAR(20) CHECK (status IN ('done', 'current', 'upcoming')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;


-- ====================================================================
-- TRIGGER PARA SINCRONIZAÇÃO AUTOMÁTICA DE USUÁRIOS COM AUTH.USERS
-- ====================================================================

-- Função que copia o usuário criado na autenticação para a tabela public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role VARCHAR(50);
BEGIN
  v_role := COALESCE(new.raw_user_meta_data->>'role', 'client');

  INSERT INTO public.users (id, email, full_name, role, lgpd_consent, consent_at)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Usuário Novo'),
    v_role,
    COALESCE((new.raw_user_meta_data->>'lgpd_consent')::boolean, false),
    CASE WHEN (new.raw_user_meta_data->>'lgpd_consent')::boolean = true THEN NOW() ELSE NULL END
  );

  IF v_role = 'client' THEN
    INSERT INTO public.clients (user_id, cpf_cnpj, client_type)
    VALUES (
      new.id,
      COALESCE(new.raw_user_meta_data->>'cpf_cnpj', '000.000.000-00'),
      'individual'
    );
  ELSIF v_role = 'lawyer' THEN
    INSERT INTO public.lawyers (user_id, oab_number, specialty)
    VALUES (
      new.id,
      COALESCE(new.raw_user_meta_data->>'oab_number', '000000/UF'),
      'Geral'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger disparada após criação de usuário na Auth do Supabase
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ====================================================================
-- POLÍTICAS DE SEGURANÇA - ROW LEVEL SECURITY (RLS)
-- ====================================================================

-- Políticas para tabela Users:
CREATE POLICY "Usuários podem ler seus próprios dados" 
    ON public.users FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Advogados podem ler todos os usuários" 
    ON public.users FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role IN ('lawyer', 'admin')
    ));

-- Políticas para tabela Lawsuits (Processos):
CREATE POLICY "Clientes podem ver seus próprios processos" 
    ON public.lawsuits FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.clients 
        WHERE id = public.lawsuits.client_id AND user_id = auth.uid()
    ));

CREATE POLICY "Advogados podem gerenciar processos" 
    ON public.lawsuits FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role IN ('lawyer', 'admin')
    ));

-- Políticas para tabela Deadlines (Prazos):
CREATE POLICY "Advogados gerenciam prazos" 
    ON public.deadlines FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role IN ('lawyer', 'admin')
    ));

-- Políticas para tabela Documents (Documentos):
CREATE POLICY "Clientes visualizam e enviam docs dos seus processos" 
    ON public.documents FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM public.lawsuits
        JOIN public.clients ON lawsuits.client_id = clients.id
        WHERE lawsuits.id = documents.lawsuit_id AND clients.user_id = auth.uid()
    ));

CREATE POLICY "Advogados gerenciam todos os documentos" 
    ON public.documents FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role IN ('lawyer', 'admin')
    ));
