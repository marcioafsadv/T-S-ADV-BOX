-- ====================================================================
-- CORREÇÃO DEFINITIVA DE RECURSÃO DE RLS (ROW LEVEL SECURITY)
-- Cole este script no SQL Editor do seu Supabase e clique em RUN
-- ====================================================================

-- 1. CORREÇÃO DA TABELA DE USUÁRIOS (USERS)
-- Evita recursão infinita usando as claims do JWT em vez de ler a própria tabela users
DROP POLICY IF EXISTS "Advogados podem ler todos os usuários" ON public.users;
CREATE POLICY "Advogados podem ler todos os usuários" 
ON public.users FOR SELECT 
USING (
  id = auth.uid() OR 
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('lawyer', 'admin')
);

-- 2. CORREÇÃO DA TABELA DE CLIENTES (CLIENTS)
DROP POLICY IF EXISTS "Permitir leitura de clientes para advogados e para o próprio cliente" ON public.clients;
CREATE POLICY "Permitir leitura de clientes para advogados e para o próprio cliente" 
ON public.clients 
FOR SELECT 
TO authenticated 
USING (
  user_id = auth.uid() OR 
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('lawyer', 'admin')
);

DROP POLICY IF EXISTS "Permitir inserção de clientes para advogados" ON public.clients;
CREATE POLICY "Permitir inserção de clientes para advogados" 
ON public.clients 
FOR INSERT 
TO authenticated 
WITH CHECK (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('lawyer', 'admin')
);

DROP POLICY IF EXISTS "Permitir atualização de clientes para advogados" ON public.clients;
CREATE POLICY "Permitir atualização de clientes para advogados" 
ON public.clients 
FOR UPDATE 
TO authenticated 
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('lawyer', 'admin')
);

-- 3. CORREÇÃO DA TABELA DE PROCESSOS (LAWSUITS)
DROP POLICY IF EXISTS "Advogados podem gerenciar processos" ON public.lawsuits;
CREATE POLICY "Advogados podem gerenciar processos" 
ON public.lawsuits FOR ALL 
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('lawyer', 'admin')
);

-- 4. CORREÇÃO DA TABELA DE PRAZOS (DEADLINES)
DROP POLICY IF EXISTS "Advogados gerenciam prazos" ON public.deadlines;
CREATE POLICY "Advogados gerenciam prazos" 
ON public.deadlines FOR ALL 
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('lawyer', 'admin')
);
