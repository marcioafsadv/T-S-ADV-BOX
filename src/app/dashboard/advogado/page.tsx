'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Scale, 
  Calendar, 
  User, 
  FileText, 
  ChevronRight, 
  LogOut, 
  CheckCircle2, 
  Inbox, 
  Plus, 
  AlertCircle, 
  Clock, 
  Check, 
  X, 
  Upload,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import Logo from '@/components/Logo';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

interface PrazoFatal {
  id: string;
  processo_numero: string;
  titulo: string;
  data_fatal: string;
  prioridade: 'ALTA' | 'MEDIA' | 'BAIXA';
  status: 'PENDENTE' | 'CONCLUIDO' | 'CANCELADO';
  responsavel_id: string | null;
  protocolo_comprovante_url: string | null;
  created_at?: string;
}

interface DocumentoRecebido {
  id: string;
  cliente_nome: string;
  documento_tipo: string;
  arquivo_url: string;
  tamanho_kb: number;
  status_validacao: 'PENDENTE' | 'VALIDADO' | 'REJEITADO';
  processo_vinculado_id: string | null;
  created_at?: string;
}

export default function LawyerDashboard() {
  const router = useRouter();
  
  // Estados de Dados
  const [deadlines, setDeadlines] = useState<PrazoFatal[]>([]);
  const [documents, setDocuments] = useState<DocumentoRecebido[]>([]);
  const [lawyers, setLawyers] = useState<any[]>([]);
  
  // Estado do Usuário Logado
  const [lawyerName, setLawyerName] = useState('Dr. Advogado');
  const [lawyerEmail, setLawyerEmail] = useState('advogado@torressilva.com.br');
  
  // Estados de Interface e Modais
  const [filter, setFilter] = useState<'all' | 'ALTA' | 'MEDIA' | 'BAIXA'>('all');
  const [loading, setLoading] = useState(true);
  
  // Modal de Cadastro de Novo Prazo
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProcesso, setNewProcesso] = useState('');
  const [newTitulo, setNewTitulo] = useState('');
  const [newDataFatal, setNewDataFatal] = useState('');
  const [newPrioridade, setNewPrioridade] = useState<'ALTA' | 'MEDIA' | 'BAIXA'>('ALTA');
  const [newResponsavel, setNewResponsavel] = useState('');

  // Modal de Conclusão de Prazo
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedDeadline, setSelectedDeadline] = useState<PrazoFatal | null>(null);
  const [protocoloNum, setProtocoloNum] = useState('');
  const [comprovanteFile, setComprovanteFile] = useState<File | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  // Modal de Validação de Documento
  const [showValidateModal, setShowValidateModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentoRecebido | null>(null);
  const [linkedProcessId, setLinkedProcessId] = useState('');
  const [lawsuitsList, setLawsuitsList] = useState<any[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  // 1. Carregamento de Dados Iniciais e Subs de Realtime
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      
      // Se Supabase não estiver configurado, carregar dados Mocks
      if (!isSupabaseConfigured) {
        setDeadlines([
          {
            id: 'mock-1',
            processo_numero: '0012345-67.2024.8.19.0001',
            titulo: 'Réplica à Contestação apresentada pelo Réu',
            data_fatal: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
            prioridade: 'ALTA',
            status: 'PENDENTE',
            responsavel_id: null,
            protocolo_comprovante_url: null
          },
          {
            id: 'mock-2',
            processo_numero: '0038765-43.2023.8.26.0100',
            titulo: 'Manifestar-se sobre laudo de avaliação pericial',
            data_fatal: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 dias
            prioridade: 'MEDIA',
            status: 'PENDENTE',
            responsavel_id: null,
            protocolo_comprovante_url: null
          },
          {
            id: 'mock-3',
            processo_numero: '0012345-67.2024.8.19.0001',
            titulo: 'Recolhimento de custas para expedição de mandado',
            data_fatal: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(), // 8 dias
            prioridade: 'BAIXA',
            status: 'PENDENTE',
            responsavel_id: null,
            protocolo_comprovante_url: null
          }
        ]);
        setDocuments([
          {
            id: 'mock-doc-1',
            cliente_nome: 'Roberto Albuquerque',
            documento_tipo: 'Procuracao_Assinada_Roberto.pdf',
            arquivo_url: '#',
            tamanho_kb: 425,
            status_validacao: 'PENDENTE',
            processo_vinculado_id: null
          },
          {
            id: 'mock-doc-2',
            cliente_nome: 'Roberto Albuquerque',
            documento_tipo: 'Comprovante_Residencia.jpg',
            arquivo_url: '#',
            tamanho_kb: 1228,
            status_validacao: 'PENDENTE',
            processo_vinculado_id: null
          }
        ]);
        setLawyers([{ id: 'mock-l1', full_name: 'Dr. Carlos Silva' }]);
        setLawsuitsList([{ id: 'mock-lawsuit-1', process_number: '0012345-67.2024.8.19.0001' }]);
        setLoading(false);
        return;
      }

      try {
        // Carrega dados de usuário autenticado
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: dbUser } = await supabase
            .from('users')
            .select('full_name, email')
            .eq('id', user.id)
            .single();

          if (dbUser) {
            setLawyerName(dbUser.full_name || 'Dr. Advogado');
            setLawyerEmail(dbUser.email || user.email || '');
          } else {
            setLawyerName(user.user_metadata?.full_name || 'Dr. Advogado');
            setLawyerEmail(user.email || '');
          }
        }

        // Buscar Advogados do escritório
        const { data: dbLawyers } = await supabase
          .from('users')
          .select('id, full_name')
          .eq('role', 'lawyer');
        if (dbLawyers) setLawyers(dbLawyers);

        // Buscar Processos para vinculação
        const { data: dbLawsuits } = await supabase
          .from('lawsuits')
          .select('id, process_number');
        if (dbLawsuits) setLawsuitsList(dbLawsuits);

        // Buscar Prazos Fatais
        const { data: dbPrazos } = await supabase
          .from('prazos_fatais')
          .select('*')
          .order('data_fatal', { ascending: true });
        if (dbPrazos) setDeadlines(dbPrazos);

        // Buscar Documentos Recebidos
        const { data: dbDocs } = await supabase
          .from('documentos_recebidos')
          .select('*')
          .order('created_at', { ascending: false });
        if (dbDocs) setDocuments(dbDocs);

      } catch (err) {
        console.error('Erro ao carregar dados do Supabase:', err);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();

    // Habilitar escutas em tempo real (Supabase Realtime)
    if (isSupabaseConfigured) {
      const prazosChannel = supabase
        .channel('prazos_realtime_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'prazos_fatais' },
          (payload: any) => {
            if (payload.eventType === 'INSERT') {
              setDeadlines(prev => [payload.new as PrazoFatal, ...prev].sort((a, b) => new Date(a.data_fatal).getTime() - new Date(b.data_fatal).getTime()));
            } else if (payload.eventType === 'UPDATE') {
              setDeadlines(prev => prev.map(p => p.id === payload.new.id ? (payload.new as PrazoFatal) : p));
            } else if (payload.eventType === 'DELETE') {
              setDeadlines(prev => prev.filter(p => p.id !== payload.old.id));
            }
          }
        )
        .subscribe();

      const docsChannel = supabase
        .channel('docs_realtime_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'documentos_recebidos' },
          (payload: any) => {
            if (payload.eventType === 'INSERT') {
              setDocuments(prev => [payload.new as DocumentoRecebido, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
              setDocuments(prev => prev.map(d => d.id === payload.new.id ? (payload.new as DocumentoRecebido) : d));
            } else if (payload.eventType === 'DELETE') {
              setDocuments(prev => prev.filter(d => d.id !== payload.old.id));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(prazosChannel);
        supabase.removeChannel(docsChannel);
      };
    }
  }, []);

  // 2. Ações de Prazos Fatais
  const handleCreateDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProcesso || !newTitulo || !newDataFatal) return;

    const dataNew = {
      processo_numero: newProcesso,
      titulo: newTitulo,
      data_fatal: new Date(newDataFatal).toISOString(),
      prioridade: newPrioridade,
      status: 'PENDENTE' as const,
      responsavel_id: newResponsavel || null,
      protocolo_comprovante_url: null
    };

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('prazos_fatais')
          .insert(dataNew);
        if (error) throw error;
      } catch (err: any) {
        alert('Erro ao cadastrar prazo: ' + err.message);
      }
    } else {
      // Simulação Offline
      const mockNew: PrazoFatal = {
        id: `prazo-mock-${Date.now()}`,
        ...dataNew
      };
      setDeadlines(prev => [mockNew, ...prev].sort((a, b) => new Date(a.data_fatal).getTime() - new Date(b.data_fatal).getTime()));
    }

    // Reset formulário
    setNewProcesso('');
    setNewTitulo('');
    setNewDataFatal('');
    setNewPrioridade('ALTA');
    setNewResponsavel('');
    setShowAddModal(false);
  };

  const handleCompleteDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeadline) return;

    setIsCompleting(true);

    let comprovanteUrl = null;

    if (isSupabaseConfigured) {
      try {
        // Se houver arquivo selecionado, fazer upload para o storage público
        if (comprovanteFile) {
          const fileExt = comprovanteFile.name.split('.').pop();
          const fileName = `${selectedDeadline.id}_${Date.now()}.${fileExt}`;
          const filePath = `comprovantes/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('process-documents')
            .upload(filePath, comprovanteFile);

          if (uploadError) throw uploadError;

          const { data } = supabase.storage
            .from('process-documents')
            .getPublicUrl(filePath);
          comprovanteUrl = data.publicUrl;
        }

        // Atualizar status no Supabase
        const { error } = await supabase
          .from('prazos_fatais')
          .update({
            status: 'CONCLUIDO',
            protocolo_comprovante_url: comprovanteUrl || protocoloNum || 'Finalizado'
          })
          .eq('id', selectedDeadline.id);

        if (error) throw error;
      } catch (err: any) {
        alert('Erro ao concluir prazo: ' + err.message);
      } finally {
        setIsCompleting(false);
        setShowCompleteModal(false);
        setSelectedDeadline(null);
        setProtocoloNum('');
        setComprovanteFile(null);
      }
    } else {
      // Mock Offline
      setDeadlines(prev => 
        prev.map(p => p.id === selectedDeadline.id 
          ? { ...p, status: 'CONCLUIDO', protocolo_comprovante_url: protocoloNum || 'Finalizado simulado' } 
          : p
        )
      );
      setIsCompleting(false);
      setShowCompleteModal(false);
      setSelectedDeadline(null);
      setProtocoloNum('');
      setComprovanteFile(null);
    }
  };

  // 3. Ações de Documentos Recebidos
  const handleValidateDoc = async (action: 'VALIDADO' | 'REJEITADO') => {
    if (!selectedDoc) return;

    setIsValidating(true);

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('documentos_recebidos')
          .update({
            status_validacao: action,
            processo_vinculado_id: action === 'VALIDADO' ? (linkedProcessId || null) : null
          })
          .eq('id', selectedDoc.id);

        if (error) throw error;
      } catch (err: any) {
        alert('Erro ao validar documento: ' + err.message);
      } finally {
        setIsValidating(false);
        setShowValidateModal(false);
        setSelectedDoc(null);
        setLinkedProcessId('');
      }
    } else {
      // Mock Offline
      setDocuments(prev => 
        prev.map(d => d.id === selectedDoc.id 
          ? { ...d, status_validacao: action, processo_vinculado_id: action === 'VALIDADO' ? linkedProcessId : null } 
          : d
        )
      );
      setIsValidating(false);
      setShowValidateModal(false);
      setSelectedDoc(null);
      setLinkedProcessId('');
    }
  };

  // 4. Cálculos da Interface e Contagem Regressiva
  const calculateDaysLeft = (targetDate: string) => {
    const diffTime = new Date(targetDate).getTime() - Date.now();
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    
    if (diffHours <= 0) return 'Expirado';
    if (diffHours <= 24) return `Restam ${diffHours}h`;
    
    const diffDays = Math.ceil(diffHours / 24);
    return `Restam ${diffDays} dias`;
  };

  // Filtragem
  const filteredDeadlines = deadlines.filter(d => {
    if (filter === 'all') return true;
    return d.prioridade === filter;
  });

  // KPIs em Tempo Real
  const activeDeadlinesCount = deadlines.filter(d => d.status === 'PENDENTE').length;
  
  const highPriorityCriticalCount = deadlines.filter(
    d => d.status === 'PENDENTE' && d.prioridade === 'ALTA'
  ).length;

  const currentMonthCompletedCount = deadlines.filter(d => {
    if (d.status !== 'CONCLUIDO') return false;
    // Opcional: checagem de mês corrente simplificada
    return true; 
  }).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070c14] text-slate-800 dark:text-slate-100 font-sans flex">
      
      {/* Left Sidebar (Desktop Only) */}
      <aside className="hidden lg:flex w-64 bg-[#111111] text-slate-300 flex-col border-r border-[#b8975a]/25">
        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
          <Logo className="h-10 w-10" showText={false} />
          <div className="text-left">
            <span className="text-sm font-serif font-bold tracking-[0.15em] text-[#b8975a] block uppercase">Torres & Silva</span>
            <span className="text-[8px] uppercase tracking-wider text-slate-400 font-semibold block mt-0.5">Painel do Advogado</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1.5">
          <span className="text-[10px] uppercase font-bold text-slate-550 tracking-wider px-3 block mb-2">Principal</span>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm bg-slate-800/50 text-[#b8975a] font-semibold border-l-2 border-[#b8975a]">
            <Calendar className="h-4 w-4" />
            <span>Prazos & Audiências</span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-slate-900/60 hover:text-white transition-all text-slate-400">
            <Scale className="h-4 w-4" />
            <span>Processos Ativos</span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-slate-900/60 hover:text-white transition-all text-slate-400">
            <User className="h-4 w-4" />
            <span>Clientes cadastrados</span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-slate-900/60 hover:text-white transition-all text-slate-400">
            <FileText className="h-4 w-4" />
            <span>Documentação Geral</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="h-9 w-9 rounded-full bg-[#b8975a] text-[#111111] flex items-center justify-center font-bold uppercase shrink-0">
              {lawyerName.split(' ').map(n => n[0]).join('').substring(0, 2)}
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-white block truncate">{lawyerName}</span>
              <span className="text-[10px] text-slate-400 block truncate">{lawyerEmail}</span>
            </div>
          </div>
          <button
            onClick={() => router.push('/')}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs hover:bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800 rounded-lg transition-all cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sair do Painel</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="bg-white dark:bg-[#1a1a1a] border-b border-slate-200 dark:border-slate-800/80 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3 lg:hidden">
            <Logo className="h-6 w-6" showText={false} />
            <span className="text-base font-serif font-bold text-slate-900 dark:text-white">TORRES & SILVA</span>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-slate-550 dark:text-slate-400 text-sm">
            <span>Escritório Central</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-slate-900 dark:text-white font-medium">Controle Operacional de Prazos</span>
          </div>

          <button
            onClick={() => router.push('/')}
            className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-850 rounded-lg transition-all cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </header>

        {/* Dashboard Content */}
        <main className="flex-grow p-6 space-y-6 overflow-y-auto">
          
          {/* Welcome and Summary Cards */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h1 className="text-2xl font-serif font-bold text-slate-900 dark:text-white">Gestão Operacional de Prazos</h1>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold border w-fit ${
                  isSupabaseConfigured
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-500'
                }`}>
                  {isSupabaseConfigured ? 'Supabase Ativo' : 'Modo Demo (Mocks)'}
                </span>
              </div>
              <p className="text-sm text-slate-550 dark:text-slate-400">Monitore os prazos fatais, audiências e responda à documentação dos clientes.</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center justify-center gap-2 bg-[#b8975a] hover:bg-[#e2c690] text-[#111111] font-semibold text-sm px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Novo Prazo Fatal</span>
            </button>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Prazos Ativos</span>
                <span className="block text-3xl font-bold text-slate-900 dark:text-white mt-1">
                  {loading ? '...' : activeDeadlinesCount}
                </span>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500">
                <Clock className="h-6 w-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Alerta Crítico (Alta)</span>
                <span className="block text-3xl font-bold text-red-500 mt-1">
                  {loading ? '...' : highPriorityCriticalCount}
                </span>
              </div>
              <div className="p-3 bg-red-500/10 rounded-xl text-red-500">
                <AlertCircle className="h-6 w-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Prazos Concluídos</span>
                <span className="block text-3xl font-bold text-emerald-500 mt-1">
                  {loading ? '...' : currentMonthCompletedCount}
                </span>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* Prazos List (2/3 width) */}
            <div className="xl:col-span-2 bg-white dark:bg-[#1a1a1a] rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-lg font-serif font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-[#b8975a]" />
                  <span>Agenda de Prazos Fatais</span>
                </h2>
                
                {/* Tabs Filter */}
                <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold">
                  {(['all', 'ALTA', 'MEDIA', 'BAIXA'] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setFilter(opt)}
                      className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                        filter === opt
                          ? 'bg-[#b8975a] text-[#111111]'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      {opt === 'all' ? 'Todos' : opt.charAt(0) + opt.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Deadlines List */}
              <div className="space-y-4">
                {loading ? (
                  <p className="text-center text-sm text-slate-500 py-6">Carregando prazos fatais...</p>
                ) : filteredDeadlines.length === 0 ? (
                  <p className="text-center text-sm text-slate-500 py-6">Nenhum prazo encontrado para este filtro.</p>
                ) : (
                  filteredDeadlines.map((deadline) => (
                    <div 
                      key={deadline.id}
                      className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#b8975a]/30 transition-all"
                    >
                      <div className="space-y-1.5 bg-transparent">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                            deadline.prioridade === 'ALTA'
                              ? 'bg-red-500/10 border-red-500/20 text-red-500'
                              : deadline.prioridade === 'MEDIA'
                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                                : 'bg-blue-500/10 border-blue-500/20 text-blue-500'
                          }`}>
                            PRIORIDADE {deadline.prioridade}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            Proc: {deadline.processo_numero}
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold text-slate-850 dark:text-slate-200">{deadline.titulo}</h3>
                        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-[#b8975a]" />
                            Data Fatal: {new Date(deadline.data_fatal).toLocaleDateString('pt-BR')}
                          </span>
                          {deadline.status === 'PENDENTE' ? (
                            <span className="flex items-center gap-1 text-amber-500 font-medium">
                              <Clock className="h-3.5 w-3.5" />
                              {calculateDaysLeft(deadline.data_fatal)}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-emerald-500 font-medium">
                              <Check className="h-3.5 w-3.5" />
                              Concluído
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="shrink-0 flex items-center gap-2">
                        {deadline.status === 'PENDENTE' ? (
                          <button
                            onClick={() => {
                              setSelectedDeadline(deadline);
                              setShowCompleteModal(true);
                            }}
                            className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Concluir</span>
                          </button>
                        ) : (
                          <span className="text-emerald-500 flex items-center gap-1 text-xs font-semibold px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Resolvido</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Documentos Recebidos (1/3 width) */}
            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h2 className="text-lg font-serif font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Inbox className="h-5 w-5 text-[#b8975a]" />
                <span>Documentos Recebidos</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Arquivos anexados por clientes pendentes de validação processual.
              </p>

              <div className="space-y-3">
                {loading ? (
                  <p className="text-center text-xs text-slate-500 py-4">Carregando documentos...</p>
                ) : documents.length === 0 ? (
                  <p className="text-center text-xs text-slate-500 py-4">Nenhum documento recebido.</p>
                ) : (
                  documents.map((doc) => (
                    <div 
                      key={doc.id}
                      className="p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800 rounded-lg space-y-2 hover:border-[#b8975a]/30 transition-all"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-[#b8975a] shrink-0" />
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate block">
                            {doc.documento_tipo}
                          </span>
                        </div>
                        {doc.arquivo_url && doc.arquivo_url !== '#' && (
                          <a 
                            href={doc.arquivo_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-white"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                        <span>Autor: {doc.cliente_nome}</span>
                        <span>Tam: {doc.tamanho_kb} KB</span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800/85">
                        <span className={`text-[9px] font-bold ${
                          doc.status_validacao === 'PENDENTE'
                            ? 'text-amber-500'
                            : doc.status_validacao === 'VALIDADO'
                              ? 'text-emerald-500'
                              : 'text-red-500'
                        }`}>
                          {doc.status_validacao}
                        </span>
                        
                        {doc.status_validacao === 'PENDENTE' && (
                          <button 
                            onClick={() => {
                              setSelectedDoc(doc);
                              setShowValidateModal(true);
                            }}
                            className="text-[10px] font-bold text-[#b8975a] hover:underline cursor-pointer"
                          >
                            Validar & Vincular
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Modal: Novo Prazo Fatal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative">
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-xl font-serif font-bold text-slate-900 dark:text-white mb-4">Novo Prazo Fatal</h3>
            
            <form onSubmit={handleCreateDeadline} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">NÚMERO DO PROCESSO</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: 0012345-67.2024.8.19.0001"
                  value={newProcesso}
                  onChange={(e) => setNewProcesso(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-sm outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">DESCRIÇÃO DA INTIMAÇÃO</label>
                <textarea 
                  required
                  rows={3}
                  placeholder="Ex: Réplica à Contestação apresentada..."
                  value={newTitulo}
                  onChange={(e) => setNewTitulo(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-sm outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">DATA FATAL</label>
                  <input 
                    type="datetime-local" 
                    required
                    value={newDataFatal}
                    onChange={(e) => setNewDataFatal(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-sm outline-none text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">PRIORIDADE</label>
                  <div className="relative">
                    <select
                      value={newPrioridade}
                      onChange={(e) => setNewPrioridade(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-sm outline-none text-slate-900 dark:text-white appearance-none"
                    >
                      <option value="ALTA">Alta</option>
                      <option value="MEDIA">Média</option>
                      <option value="BAIXA">Baixa</option>
                    </select>
                    <ChevronDown className="h-4 w-4 absolute right-3 top-3 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">ADVOGADO RESPONSÁVEL</label>
                <div className="relative">
                  <select
                    value={newResponsavel}
                    onChange={(e) => setNewResponsavel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-sm outline-none text-slate-900 dark:text-white appearance-none"
                  >
                    <option value="">Selecione um advogado</option>
                    {lawyers.map((l) => (
                      <option key={l.id} value={l.id}>{l.full_name}</option>
                    ))}
                  </select>
                  <ChevronDown className="h-4 w-4 absolute right-3 top-3 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#b8975a] hover:bg-[#e2c690] text-[#111111] font-bold rounded-lg text-sm shadow-lg transition-all"
              >
                Cadastrar Prazo Fatal
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Conclusão de Prazo */}
      {showCompleteModal && selectedDeadline && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative">
            <button 
              onClick={() => {
                setShowCompleteModal(false);
                setSelectedDeadline(null);
                setProtocoloNum('');
                setComprovanteFile(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-xl font-serif font-bold text-slate-900 dark:text-white mb-2">Concluir Prazo</h3>
            <p className="text-xs text-slate-500 mb-4 truncate">Processo: {selectedDeadline.processo_numero}</p>

            <form onSubmit={handleCompleteDeadline} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">NÚMERO DE PROTOCOLO</label>
                <input 
                  type="text" 
                  placeholder="Ex: PROTOCOLO-123456"
                  value={protocoloNum}
                  onChange={(e) => setProtocoloNum(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-sm outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div className="border-2 border-dashed border-slate-350 dark:border-slate-850 rounded-lg p-6 text-center">
                <input 
                  type="file" 
                  accept="application/pdf"
                  id="pdf_file"
                  className="hidden"
                  onChange={(e) => setComprovanteFile(e.target.files ? e.target.files[0] : null)}
                />
                <label htmlFor="pdf_file" className="cursor-pointer space-y-2 block">
                  <Upload className="h-8 w-8 text-[#b8975a] mx-auto" />
                  <span className="block text-xs text-slate-500">
                    {comprovanteFile ? comprovanteFile.name : 'Upload do Comprovante de Protocolo (PDF)'}
                  </span>
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCompleteModal(false);
                    setSelectedDeadline(null);
                    setProtocoloNum('');
                    setComprovanteFile(null);
                  }}
                  className="flex-1 py-2 bg-slate-200 dark:bg-slate-850 hover:bg-slate-350 text-slate-700 dark:text-white font-semibold rounded-lg text-sm transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCompleting}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-sm transition-all disabled:opacity-50"
                >
                  {isCompleting ? 'Finalizando...' : 'Concluir Prazo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Validar & Vincular Documento */}
      {showValidateModal && selectedDoc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative">
            <button 
              onClick={() => {
                setShowValidateModal(false);
                setSelectedDoc(null);
                setLinkedProcessId('');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-xl font-serif font-bold text-slate-900 dark:text-white mb-2">Validar & Vincular</h3>
            <p className="text-xs text-slate-500 mb-4">Cliente: {selectedDoc.cliente_nome}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">VINCULAR AO PROCESSO</label>
                <div className="relative">
                  <select
                    value={linkedProcessId}
                    onChange={(e) => setLinkedProcessId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-sm outline-none text-slate-900 dark:text-white appearance-none"
                  >
                    <option value="">Selecione um processo do escritório</option>
                    {lawsuitsList.map((ls) => (
                      <option key={ls.id} value={ls.id}>{ls.process_number}</option>
                    ))}
                  </select>
                  <ChevronDown className="h-4 w-4 absolute right-3 top-3 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleValidateDoc('REJEITADO')}
                  disabled={isValidating}
                  className="flex-1 py-2 bg-red-650 hover:bg-red-700 text-white font-semibold rounded-lg text-sm transition-all disabled:opacity-50"
                >
                  Rejeitar
                </button>
                <button
                  onClick={() => handleValidateDoc('VALIDADO')}
                  disabled={isValidating}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-sm transition-all disabled:opacity-50"
                >
                  Validar & Vincular
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
