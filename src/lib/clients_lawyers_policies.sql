-- ====================================================================
-- POLÍTICAS DE SEGURANÇA PARA A TABELA PUBLIC.CLIENTS
-- ====================================================================

-- Permitir que advogados e administradores tenham acesso total a todos os registros de clientes
CREATE POLICY "Advogados e admins podem gerenciar todos os clientes"
    ON public.clients FOR ALL
    USING (
        (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) IN ('lawyer', 'admin'))
    );

-- Permitir que cada cliente possa ler apenas o seu próprio registro
CREATE POLICY "Clientes podem ver seus próprios dados cadastrais"
    ON public.clients FOR SELECT
    USING (
        auth.uid() = user_id
    );


-- ====================================================================
-- POLÍTICAS DE SEGURANÇA PARA A TABELA PUBLIC.LAWYERS
-- ====================================================================

-- Permitir que qualquer usuário autenticado no sistema (clientes ou advogados) veja a lista de advogados
CREATE POLICY "Qualquer autenticado pode ler advogados"
    ON public.lawyers FOR SELECT
    TO authenticated
    USING (true);

-- Permitir que o próprio advogado atualize seu perfil
CREATE POLICY "Advogados podem gerenciar seus próprios dados"
    ON public.lawyers FOR UPDATE
    USING (
        auth.uid() = user_id
    );
