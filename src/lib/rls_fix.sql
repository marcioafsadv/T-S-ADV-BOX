-- 1. CORREÇÃO DE POLÍTICA DA TABELA PUBLIC.USERS
-- Remove a política recursiva anterior
DROP POLICY IF EXISTS "Advogados podem ler todos os usuários" ON public.users;

-- Cria a nova política que verifica a role do usuário diretamente no JWT (metadata do token)
CREATE POLICY "Advogados podem ler todos os usuários" 
    ON public.users FOR SELECT 
    USING (
        (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) IN ('lawyer', 'admin'))
    );


-- 2. CORREÇÃO DE POLÍTICA DA TABELA PUBLIC.LAWSUITS (PROCESSOS)
-- Remove a política antiga que consultava public.users
DROP POLICY IF EXISTS "Advogados podem gerenciar processos" ON public.lawsuits;

-- Cria a nova política baseada no JWT
CREATE POLICY "Advogados podem gerenciar processos" 
    ON public.lawsuits FOR ALL 
    USING (
        (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) IN ('lawyer', 'admin'))
    );


-- 3. CORREÇÃO DE POLÍTICA DA TABELA PUBLIC.DEADLINES (PRAZOS)
-- Remove a política antiga
DROP POLICY IF EXISTS "Advogados gerenciam prazos" ON public.deadlines;

-- Cria a nova política baseada no JWT
CREATE POLICY "Advogados gerenciam prazos" 
    ON public.deadlines FOR ALL 
    USING (
        (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) IN ('lawyer', 'admin'))
    );


-- 4. CORREÇÃO DE POLÍTICA DA TABELA PUBLIC.DOCUMENTS (DOCUMENTOS)
-- Remove a política antiga
DROP POLICY IF EXISTS "Advogados gerenciam todos os documentos" ON public.documents;

-- Cria a nova política baseada no JWT
CREATE POLICY "Advogados gerenciam todos os documentos" 
    ON public.documents FOR ALL 
    USING (
        (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) IN ('lawyer', 'admin'))
    );
