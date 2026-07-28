-- ====================================================================
-- CORREÇÃO DE POLÍTICAS DE RLS (ROW LEVEL SECURITY) PARA CLIENTES E ADVOGADOS
-- Cole este script no SQL Editor do seu Supabase e clique em RUN
-- ====================================================================

-- 1. POLÍTICAS PARA A TABELA PUBLIC.CLIENTES
DROP POLICY IF EXISTS "Permitir leitura de clientes para advogados e para o próprio cliente" ON public.clients;
CREATE POLICY "Permitir leitura de clientes para advogados e para o próprio cliente" 
ON public.clients 
FOR SELECT 
TO authenticated 
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role IN ('lawyer', 'admin')
  )
);

DROP POLICY IF EXISTS "Permitir inserção de clientes para advogados" ON public.clients;
CREATE POLICY "Permitir inserção de clientes para advogados" 
ON public.clients 
FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role IN ('lawyer', 'admin')
  )
);

DROP POLICY IF EXISTS "Permitir atualização de clientes para advogados" ON public.clients;
CREATE POLICY "Permitir atualização de clientes para advogados" 
ON public.clients 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role IN ('lawyer', 'admin')
  )
);

-- 2. POLÍTICAS PARA A TABELA PUBLIC.LAWYERS
DROP POLICY IF EXISTS "Permitir leitura de advogados para todos os autenticados" ON public.lawyers;
CREATE POLICY "Permitir leitura de advogados para todos os autenticados" 
ON public.lawyers 
FOR SELECT 
TO authenticated 
USING (true);
