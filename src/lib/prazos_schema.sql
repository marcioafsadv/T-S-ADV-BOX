-- ====================================================================
-- SCRIPT DE CRIAÇÃO DAS TABELAS DE PRAZOS FATAIS E DOCUMENTOS
-- ====================================================================

-- 1. Definição dos Enums
CREATE TYPE prioridade_prazo AS ENUM ('ALTA', 'MEDIA', 'BAIXA');
CREATE TYPE status_prazo AS ENUM ('PENDENTE', 'CONCLUIDO', 'CANCELADO');
CREATE TYPE status_validacao_doc AS ENUM ('PENDENTE', 'VALIDADO', 'REJEITADO');

-- 2. Tabela de Prazos Fatais
CREATE TABLE public.prazos_fatais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    processo_numero TEXT NOT NULL,
    titulo TEXT NOT NULL,
    data_fatal TIMESTAMPTZ NOT NULL,
    prioridade prioridade_prazo NOT NULL,
    status status_prazo NOT NULL DEFAULT 'PENDENTE',
    responsavel_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    protocolo_comprovante_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela de Documentos Recebidos
CREATE TABLE public.documentos_recebidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_nome TEXT NOT NULL,
    documento_tipo TEXT NOT NULL,
    arquivo_url TEXT NOT NULL,
    tamanho_kb NUMERIC,
    status_validacao status_validacao_doc NOT NULL DEFAULT 'PENDENTE',
    processo_vinculado_id UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Habilitar RLS (Row Level Security)
ALTER TABLE public.prazos_fatais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_recebidos ENABLE ROW LEVEL SECURITY;

-- 5. Criar Políticas RLS Simplificadas (Acesso total para usuários autenticados para teste)
CREATE POLICY "Permitir leitura geral de prazos para autenticados" 
    ON public.prazos_fatais FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Permitir inserção de prazos para autenticados" 
    ON public.prazos_fatais FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

CREATE POLICY "Permitir update de prazos para autenticados" 
    ON public.prazos_fatais FOR UPDATE 
    TO authenticated 
    USING (true);

CREATE POLICY "Permitir leitura de documentos para autenticados" 
    ON public.documentos_recebidos FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Permitir update de documentos para autenticados" 
    ON public.documentos_recebidos FOR UPDATE 
    TO authenticated 
    USING (true);

CREATE POLICY "Permitir inserção de documentos para autenticados" 
    ON public.documentos_recebidos FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

-- 6. Habilitar Supabase Realtime
-- Adiciona as tabelas na publicação padrão do Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.prazos_fatais;
ALTER PUBLICATION supabase_realtime ADD TABLE public.documentos_recebidos;
